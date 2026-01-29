import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { Options } from '@layerzerolabs/lz-v2-utilities';
import { encodeAbiParameters, padHex, type Abi, type Address, type Hex } from 'viem';

import { usdeOftConfig } from '@/appconfig/abi/UsdeOft';
import { sUSDeVaultComposerConfig } from '@/appconfig/abi/sUSDeVaultComposer';
import { susdeConfig } from '@/appconfig/abi/Susde';
import { useWriteTransaction } from 'hooks/useWriteTransaction';
import { StakeTokenMeta, StakeTokenSymbol } from './useStakeTokenSelection';
import { StakedUSDeOFTAdapter, SUSDE, SUSDE_VAULT_COMPOSER, USDeOFTAdapter } from '@/appconfig';
import { StakeNetwork, getStakeNetworkByKey } from '../stakeNetworks';
import { dispatchSuccess, dispatchError } from 'utils/snackbar';

const SUSDE_VAULT_COMPOSER_ADDRESS = SUSDE_VAULT_COMPOSER as Address;

const EMPTY_HEX = '0x' as Hex;
const BPS_DENOMINATOR = 10_000n;
const LAYERZERO_CONFIG = {
  dstEidEthereum: 30101,
  minInternalBps: 9990n,
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

interface UseStakeTransactionsParams {
  tokenMeta: StakeTokenMeta;
  parsedAmount: bigint | null;
  isAllowanceSufficient: boolean;
  stakeNetwork: StakeNetwork;
  userAddress?: Address;
  onApprovalConfirmed?: () => void;
  onStakeConfirmed?: () => void;
}

interface UseStakeTransactionsResult {
  handleStake: () => Promise<void>;
  approveTx: ReturnType<typeof useWriteTransaction>;
  stakeTx: ReturnType<typeof useWriteTransaction>;
  isTransactionInProgress: boolean;
  statusMessage: string | null;
  resetTransactions: () => void;
  internalAmount: bigint | null;
  isInternalAmountLoading: boolean;
}

type PendingStake = {
  amount: bigint;
  token: StakeTokenSymbol;
  network: StakeNetwork;
};

export const useStakeTransactions = ({
  tokenMeta,
  parsedAmount,
  isAllowanceSufficient,
  stakeNetwork,
  userAddress,
  onApprovalConfirmed,
  onStakeConfirmed
}: UseStakeTransactionsParams): UseStakeTransactionsResult => {
  const approveTx = useWriteTransaction();
  const stakeTx = useWriteTransaction();
  const ethereumClient = usePublicClient({ chainId: 1 });
  const layerZeroNetwork = getStakeNetworkByKey()[stakeNetwork];
  const layerZeroClient = usePublicClient({ chainId: layerZeroNetwork?.chainId });

  const [pendingStake, setPendingStake] = useState<PendingStake | null>(null);
  const [internalAmount, setInternalAmount] = useState<bigint | null>(null);
  const [isInternalAmountLoading, setIsInternalAmountLoading] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  const { token, approveAbi, tokenAddress, stakingAddress, stakeAbi } = tokenMeta;

  const isUsde = token === 'USDE';
  const isLayerZeroUsde = isUsde && stakeNetwork !== 'ethereum';
  const isLayerZeroReady = Boolean(layerZeroNetwork?.lzEid && layerZeroNetwork?.usdeOftAddress);
  const shouldQuoteInternalAmount = isUsde && parsedAmount !== null && parsedAmount > 0n;

  const resetTransactions = useCallback(() => {
    approveTx.resetTx();
    stakeTx.resetTx();
    setPendingStake(null);
    setConfigMessage(null);
  }, [approveTx.resetTx, stakeTx.resetTx]);

  const fetchInternalAmount = useCallback(
    async (amount: bigint) => {
      if (!ethereumClient) return null;
      return (await ethereumClient.readContract({
        address: SUSDE,
        abi: susdeConfig.abi,
        functionName: 'convertToShares',
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
      if (!layerZeroNetwork.lzEid || !layerZeroNetwork.usdeOftAddress) return;

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

      const msgFeeEth = (await ethereumClient.readContract({
        address: SUSDE_VAULT_COMPOSER,
        abi: sUSDeVaultComposerConfig.abi,
        functionName: 'quoteSend',
        args: [SUSDE, StakedUSDeOFTAdapter as Address, amount, hopSendParam] as const
      })) as { nativeFee: bigint; lzTokenFee: bigint };

      const minMsgValue = msgFeeEth.nativeFee;
      const composeMsg = encodeAbiParameters(LZ_COMPOSE_PARAMS, [hopSendParam, minMsgValue]);
      const extraOptions = buildLayerZeroOptions(minMsgValue);

      const sendParam = {
        dstEid: LAYERZERO_CONFIG.dstEidEthereum,
        to: addressToBytes32(SUSDE_VAULT_COMPOSER_ADDRESS),
        amountLD: amount,
        minAmountLD: amount,
        extraOptions,
        composeMsg,
        oftCmd: EMPTY_HEX
      } as const;

      const msgFee = (await layerZeroClient.readContract({
        address: USDeOFTAdapter,
        abi: usdeOftConfig.abi,
        functionName: 'quoteSend',
        args: [sendParam, false] as const
      })) as { nativeFee: bigint; lzTokenFee: bigint };

      const sendArgs = [
        sendParam,
        { nativeFee: msgFee.nativeFee, lzTokenFee: msgFee.lzTokenFee },
        userAddress
      ] as const;

      await stakeTx.sendTransaction({
        address: USDeOFTAdapter,
        abi: usdeOftConfig.abi as Abi,
        functionName: 'send',
        args: sendArgs,
        value: msgFee.nativeFee
      } as unknown as Parameters<typeof stakeTx.sendTransaction>[0]);
    },
    [ethereumClient, fetchInternalAmount, layerZeroClient, layerZeroNetwork, stakeTx, userAddress]
  );

  const submitStake = useCallback(
    async (amount: bigint) => {
      if (!userAddress) return;
      if (isLayerZeroUsde) {
        await sendViaLayerZero(amount);
        return;
      }

      await stakeTx.sendTransaction({
        address: stakingAddress as Address,
        abi: stakeAbi,
        functionName: 'deposit',
        args: [amount, userAddress]
      });
    },
    [isLayerZeroUsde, sendViaLayerZero, stakeAbi, stakeTx, stakingAddress, userAddress]
  );

  const handleStake = useCallback(async () => {
    if (!userAddress || !parsedAmount || parsedAmount === 0n) return;
    if (isLayerZeroUsde && !isLayerZeroReady) {
      setConfigMessage('LayerZero config missing for selected network.');
      return;
    }

    setPendingStake({ amount: parsedAmount, token, network: stakeNetwork });

    if (!isAllowanceSufficient) {
      await approveTx.sendTransaction({
        abi: approveAbi,
        address: tokenAddress as Address,
        functionName: 'approve',
        args: [stakingAddress as Address, parsedAmount]
      });
      return;
    }

    await submitStake(parsedAmount);
  }, [
    approveAbi,
    approveTx,
    isAllowanceSufficient,
    isLayerZeroReady,
    isLayerZeroUsde,
    parsedAmount,
    stakeNetwork,
    stakingAddress,
    submitStake,
    token,
    tokenAddress,
    userAddress
  ]);

  const prevApproveTxState = useRef(approveTx.txState);
  useEffect(() => {
    if (prevApproveTxState.current !== approveTx.txState) {
      if (approveTx.txState === 'confirmed') {
        dispatchSuccess('Approval confirmed');
        onApprovalConfirmed?.();
      } else if (approveTx.txState === 'error') {
        dispatchError('Approval failed');
      }
      prevApproveTxState.current = approveTx.txState;
    }
  }, [approveTx.txState, onApprovalConfirmed]);

  useEffect(() => {
    if (
      approveTx.txState === 'confirmed' &&
      pendingStake &&
      pendingStake.token === token &&
      pendingStake.network === stakeNetwork &&
      isAllowanceSufficient &&
      stakeTx.txState === 'idle'
    ) {
      submitStake(pendingStake.amount);
    }
  }, [approveTx.txState, isAllowanceSufficient, pendingStake, stakeNetwork, submitStake, stakeTx.txState, token]);

  const prevStakeTxState = useRef(stakeTx.txState);
  useEffect(() => {
    if (prevStakeTxState.current !== stakeTx.txState) {
      if (stakeTx.txState === 'confirmed') {
        dispatchSuccess('Stake confirmed');
        setPendingStake(null);
        onStakeConfirmed?.();
        resetTransactions();
      } else if (stakeTx.txState === 'error') {
        dispatchError('Stake failed');
      }
      prevStakeTxState.current = stakeTx.txState;
    }
  }, [onStakeConfirmed, resetTransactions, stakeTx.txState]);

  const isTransactionInProgress = useMemo(() => {
    return (
      approveTx.txState === 'submitting' ||
      approveTx.txState === 'submitted' ||
      stakeTx.txState === 'submitting' ||
      stakeTx.txState === 'submitted'
    );
  }, [approveTx.txState, stakeTx.txState]);

  const statusMessage = useMemo(() => {
    if (configMessage) return configMessage;
    if (approveTx.txState === 'submitted') return 'Approval submitted, waiting for confirmation...';
    if (approveTx.txState === 'error') return 'Approval failed, please retry.';
    if (stakeTx.txState === 'submitted') return 'Stake submitted, waiting for confirmation...';
    if (stakeTx.txState === 'error') return 'Stake failed, please retry.';
    return null;
  }, [approveTx.txState, configMessage, stakeTx.txState]);

  return {
    handleStake,
    approveTx,
    stakeTx,
    isTransactionInProgress,
    statusMessage,
    resetTransactions,
    internalAmount,
    isInternalAmountLoading
  };
};
