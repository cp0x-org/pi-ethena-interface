import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { Options } from '@layerzerolabs/lz-v2-utilities';
import { encodeAbiParameters, padHex, type Abi, type Address, type Hex } from 'viem';

import { usdeOftConfig } from '@/appconfig/abi/UsdeOft';
import { sUSDeVaultComposerConfig } from '@/appconfig/abi/sUSDeVaultComposer';
import { susdeConfig } from '@/appconfig/abi/Susde';
import { useWriteTransaction } from 'hooks/useWriteTransaction';
import { UnstakeTokenMeta, UnstakeTokenSymbol } from './useUnstakeTokenSelection';
import { StakedUSDeOFTAdapter, SUSDE, SUSDE_VAULT_COMPOSER, USDeOFTAdapter } from '@/appconfig';
import { StakeNetwork, getStakeNetworkByKey } from '../stakeNetworks';
import { StakedUsdeOftConfig } from '@/appconfig/abi/StakedUsdeOft';

const EMPTY_HEX = '0x' as Hex;
const BPS_DENOMINATOR = 10_000n;
const LAYERZERO_CONFIG = {
    dstEidEthereum: 30101,
    minInternalBps: 9900n,
    hopExtraOptions: '0x0003' as Hex,
    hopOftCmd: '0x0030' as Hex,
    composeGas: 375000n
} as const;

const LZ_COMPOSE_PARAMS = [
    {
        type: 'tuple',
        components: [
            { type: 'uint32', name: 'dstEid' },
            { type: 'bytes32', name: 'to' },
            { type: 'uint256', name: 'amountLD' },
            { type: 'uint256', name: 'minAmountLD' },
            { type: 'bytes', name: 'extraOptions' },
            { type: 'bytes', name: 'composeMsg' },
            { type: 'bytes', name: 'oftCmd' }
        ]
    },
    { type: 'uint256', name: 'minMsgValue' }
] as const;

const addressToBytes32 = (address: Address): Hex => padHex(address, { size: 32 });
const applyBps = (amount: bigint, bps: bigint) => (amount * bps) / BPS_DENOMINATOR;

const buildLayerZeroOptions = (composeValue: bigint, composeGas: bigint = LAYERZERO_CONFIG.composeGas): Hex => {
    const options = Options.newOptions();
    options.addExecutorComposeOption(0, composeGas, composeValue);
    return options.toHex() as Hex;
};

interface UseUnstakeTransactionsParams {
    tokenMeta: UnstakeTokenMeta;
    parsedAmount: bigint | null;
    unstakeNetwork: StakeNetwork;
    userAddress?: Address;
    onUnstakeConfirmed?: () => void;
}

interface UseUnstakeTransactionsResult {
    handleUnstake: () => Promise<void>;
    unstakeTx: ReturnType<typeof useWriteTransaction>;
    isTransactionInProgress: boolean;
    statusMessage: string | null;
    resetTransactions: () => void;
    internalAmount: bigint | null;
    isInternalAmountLoading: boolean;
}

type PendingUnstake = {
    amount: bigint;
    token: UnstakeTokenSymbol;
    network: StakeNetwork;
};

export const useUnstakeTransactions = ({
    tokenMeta,
    parsedAmount,
    unstakeNetwork,
    userAddress,
    onUnstakeConfirmed
}: UseUnstakeTransactionsParams): UseUnstakeTransactionsResult => {
    const unstakeTx = useWriteTransaction();
    const ethereumClient = usePublicClient({ chainId: 1 });
    const layerZeroNetwork = getStakeNetworkByKey()[unstakeNetwork];
    const layerZeroClient = usePublicClient({ chainId: layerZeroNetwork?.chainId });

    const [pendingUnstake, setPendingUnstake] = useState<PendingUnstake | null>(null);
    const [internalAmount, setInternalAmount] = useState<bigint | null>(null);
    const [isInternalAmountLoading, setIsInternalAmountLoading] = useState(false);
    const [configMessage, setConfigMessage] = useState<string | null>(null);

    const { token, abi, stakingAddress } = tokenMeta;

    const isSusde = token === 'SUSDE';
    const isLayerZeroSusde = isSusde && unstakeNetwork !== 'ethereum';
    const isLayerZeroReady = Boolean(layerZeroNetwork?.lzEid);
    const shouldQuoteInternalAmount = isSusde && parsedAmount !== null && parsedAmount > 0n;

    const resetTransactions = useCallback(() => {
        unstakeTx.resetTx();
        setPendingUnstake(null);
        setConfigMessage(null);
    }, [unstakeTx.resetTx]);

    const fetchInternalAmount = useCallback(
        async (amount: bigint) => {
            if (!ethereumClient) return null;
            // For unstake sUSDe -> USDe, we might want to show how much USDe they get
            return (await ethereumClient.readContract({
                address: SUSDE,
                abi: susdeConfig.abi,
                functionName: 'convertToAssets',
                args: [amount] as const
            })) as bigint;
        },
        [ethereumClient]
    );

    useEffect(() => {
        if (!shouldQuoteInternalAmount || !parsedAmount) {
            setInternalAmount(null);
            setIsInternalAmountLoading(false);
            return;
        }

        let isActive = true;
        setInternalAmount(null);
        setIsInternalAmountLoading(true);

        fetchInternalAmount(parsedAmount)
            .then((value) => {
                if (isActive) setInternalAmount(value);
            })
            .catch(() => {
                if (isActive) setInternalAmount(null);
            })
            .finally(() => {
                if (isActive) setIsInternalAmountLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [fetchInternalAmount, parsedAmount, shouldQuoteInternalAmount]);

    const sendViaLayerZero = useCallback(
        async (amount: bigint) => {
            if (!ethereumClient || !layerZeroClient || !userAddress || !layerZeroNetwork) return;
            if (!layerZeroNetwork.lzEid) return;

            const resolvedInternalAmount = await fetchInternalAmount(amount);
            if (resolvedInternalAmount === null) return;

            const minInternalAmountLD = applyBps(resolvedInternalAmount, LAYERZERO_CONFIG.minInternalBps);
            const hopSendParam = {
                dstEid: layerZeroNetwork.lzEid,
                to: addressToBytes32(userAddress),
                amountLD: resolvedInternalAmount,
                minAmountLD: minInternalAmountLD,
                extraOptions: LAYERZERO_CONFIG.hopExtraOptions,
                composeMsg: EMPTY_HEX,
                oftCmd: LAYERZERO_CONFIG.hopOftCmd
            } as const;

            // Use OFT adapters for the hop quote on the composer.
            const msgFeeEth = (await ethereumClient.readContract({
                address: SUSDE_VAULT_COMPOSER,
                abi: sUSDeVaultComposerConfig.abi,
                functionName: 'quoteSend',
                args: [StakedUSDeOFTAdapter as Address, USDeOFTAdapter as Address, amount, hopSendParam] as const
            })) as { nativeFee: bigint; lzTokenFee: bigint };

            const minMsgValue = msgFeeEth.nativeFee;
            const composeMsg = encodeAbiParameters(LZ_COMPOSE_PARAMS, [hopSendParam, minMsgValue]);
            const extraOptions = buildLayerZeroOptions(minMsgValue);

            const sendParam = {
                dstEid: LAYERZERO_CONFIG.dstEidEthereum,
                to: addressToBytes32(SUSDE_VAULT_COMPOSER),
                amountLD: amount,
                minAmountLD: amount,
                extraOptions,
                composeMsg,
                oftCmd: EMPTY_HEX
            } as const;

            const msgFee = (await layerZeroClient.readContract({
                address: StakedUSDeOFTAdapter,
                abi: StakedUsdeOftConfig.abi,
                functionName: 'quoteSend',
                args: [sendParam, false] as const
            })) as { nativeFee: bigint; lzTokenFee: bigint };

            const sendArgs = [
                sendParam,
                { nativeFee: msgFee.nativeFee, lzTokenFee: msgFee.lzTokenFee },
                userAddress
            ] as const;

            await unstakeTx.sendTransaction({
                address: StakedUSDeOFTAdapter,
                abi: StakedUsdeOftConfig.abi as Abi,
                functionName: 'send',
                args: sendArgs,
                value: msgFee.nativeFee
            } as unknown as Parameters<typeof unstakeTx.sendTransaction>[0]);
        },
        [ethereumClient, fetchInternalAmount, layerZeroClient, layerZeroNetwork, unstakeTx, userAddress]
    );

    const submitUnstake = useCallback(
        async (amount: bigint) => {
            if (!userAddress) return;
            if (isLayerZeroSusde) {
                await sendViaLayerZero(amount);
                return;
            }

            await unstakeTx.sendTransaction({
                address: stakingAddress as Address,
                abi: abi,
                functionName: 'cooldownShares',
                args: [amount]
            });
        },
        [isLayerZeroSusde, sendViaLayerZero, abi, unstakeTx, stakingAddress, userAddress]
    );

    const handleUnstake = useCallback(async () => {
        if (!userAddress || !parsedAmount || parsedAmount === 0n) return;
        if (isLayerZeroSusde && !isLayerZeroReady) {
            setConfigMessage('LayerZero config missing for selected network.');
            return;
        }

        setPendingUnstake({ amount: parsedAmount, token, network: unstakeNetwork });
        await submitUnstake(parsedAmount);
    }, [isLayerZeroReady, isLayerZeroSusde, parsedAmount, unstakeNetwork, submitUnstake, token, userAddress]);

    useEffect(() => {
        if (unstakeTx.txState === 'confirmed') {
            setPendingUnstake(null);
            onUnstakeConfirmed?.();
            resetTransactions();
        }
    }, [onUnstakeConfirmed, resetTransactions, unstakeTx.txState]);

    const isTransactionInProgress = useMemo(() => {
        return unstakeTx.txState === 'submitting' || unstakeTx.txState === 'submitted';
    }, [unstakeTx.txState]);

    const statusMessage = useMemo(() => {
        if (configMessage) return configMessage;
        if (unstakeTx.txState === 'submitted') return 'Unstake submitted, waiting for confirmation...';
        if (unstakeTx.txState === 'error') return 'Unstake failed, please retry.';
        return null;
    }, [configMessage, unstakeTx.txState]);

    return {
        handleUnstake,
        unstakeTx,
        isTransactionInProgress,
        statusMessage,
        resetTransactions,
        internalAmount,
        isInternalAmountLoading
    };
};
