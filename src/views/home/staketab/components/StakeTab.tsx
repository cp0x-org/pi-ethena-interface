import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { MenuItem, SelectChangeEvent, Typography } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, useReadContract } from 'wagmi';

import { useTheme } from '@mui/material/styles';
import { CustomInput } from 'components/CustomInput';
import { StyledSelect } from 'components/StyledSelect';
import { BalancesData } from 'hooks/useBalanceData';
import { formatTokenBalance } from 'utils/formatters';
import { usdeOftConfig } from '@/appconfig/abi/UsdeOft';
import { useStakeAllowance } from '../hooks/useStakeAllowance';
import { useStakeAmount } from '../hooks/useStakeAmount';
import { useStakeTokenSelection } from '../hooks/useStakeTokenSelection';
import { useStakeTransactions } from '../hooks/useStakeTransactions';
import { getActiveStakeNetworks, getStakeNetworkByKey, type StakeNetwork } from '../stakeNetworks';
import { useBalanceRefresh } from 'contexts/BalanceRefreshContext';

interface Props {
  balances: BalancesData;
}

const ETHEREUM_CHAIN_ID = 1;

const StakeTab = ({ balances }: Props) => {
  const theme = useTheme();
  const { address: userAddress } = useAccount();
  const activeChainId = useChainId();
  const { refetchBalances } = useBalanceRefresh();
  const activeStakeNetworks = useMemo(() => getActiveStakeNetworks(), []);
  const [stakeNetwork, setStakeNetwork] = useState<StakeNetwork>(() => activeStakeNetworks[0]?.key ?? 'avalanche');

  const { tokenMeta, stakeTokenAddress, handleTokenAddressChange, tokenOptions } = useStakeTokenSelection(balances);
  const stakeNetworkByKey = useMemo(() => getStakeNetworkByKey(), []);
  const defaultStakeNetwork = activeStakeNetworks[0];
  const activeStakeNetwork = stakeNetworkByKey[stakeNetwork];
  const isLayerZeroUsde = tokenMeta.token === 'USDE' && stakeNetwork !== 'ethereum';
  const layerZeroBalanceAddress = (activeStakeNetwork?.usdeOftAddress ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;
  const hasLayerZeroBalance = Boolean(isLayerZeroUsde && userAddress && activeStakeNetwork?.usdeOftAddress);
  const hasActiveStakeNetworks = activeStakeNetworks.length > 0;
  const stakeNetworkValue = activeStakeNetwork ? stakeNetwork : '';

  const { data: layerZeroBalance } = useReadContract({
    abi: usdeOftConfig.abi,
    address: layerZeroBalanceAddress,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    chainId: activeStakeNetwork?.chainId,
    query: { enabled: hasLayerZeroBalance }
  });

  const effectiveBalance = useMemo(() => {
    if (isLayerZeroUsde) return (layerZeroBalance as bigint | undefined) ?? 0n;
    return tokenMeta.balance;
  }, [isLayerZeroUsde, layerZeroBalance, tokenMeta.balance]);

  const balanceDisplay = useMemo(() => formatTokenBalance(effectiveBalance), [effectiveBalance]);

  const {
    amountInput,
    formattedAmount,
    activePercentage,
    debouncedAmountInput,
    parsedAmount,
    handleAmountChange,
    handlePercentClick,
    resetAmount
  } = useStakeAmount('');

  const { allowanceChecking, isAllowanceSufficient, refetchAllowance } = useStakeAllowance({
    tokenMeta,
    userAddress,
    amountInput,
    debouncedAmountInput,
    parsedAmount,
    isApprovalRequired: !(tokenMeta.token === 'USDE' && stakeNetwork !== 'ethereum')
  });

  const handleStakeConfirmed = useCallback(() => {
    resetAmount();
    // Only refetch balances for Ethereum staking, not LayerZero
    if (stakeNetwork === 'ethereum') {
      refetchBalances();
    }
  }, [resetAmount, stakeNetwork, refetchBalances]);

  const {
    handleStake,
    isTransactionInProgress,
    statusMessage,
    approveTx,
    stakeTx,
    resetTransactions,
    internalAmount,
    isInternalAmountLoading
  } = useStakeTransactions({
    tokenMeta,
    parsedAmount,
    isAllowanceSufficient,
    stakeNetwork,
    userAddress,
    onApprovalConfirmed: refetchAllowance,
    onStakeConfirmed: handleStakeConfirmed
  });

  const isAmountExceedsBalance = useMemo(() => {
    if (!parsedAmount) return false;
    return parsedAmount > effectiveBalance;
  }, [effectiveBalance, parsedAmount]);

  const internalAmountDisplay = useMemo(() => {
    if (tokenMeta.token !== 'USDE') return null;
    if (!parsedAmount || parsedAmount === 0n) return '--';
    if (isInternalAmountLoading) return '...';
    if (internalAmount === null) return '--';
    return formatTokenBalance(internalAmount);
  }, [internalAmount, isInternalAmountLoading, parsedAmount, tokenMeta.token]);

  const requiredChainId = useMemo(() => {
    if (tokenMeta.token === 'ENA') return ETHEREUM_CHAIN_ID;
    if (stakeNetwork === 'ethereum') return ETHEREUM_CHAIN_ID;
    return activeStakeNetwork?.chainId ?? null;
  }, [activeStakeNetwork?.chainId, stakeNetwork, tokenMeta.token]);

  const requiredNetworkLabel = useMemo(() => {
    if (tokenMeta.token === 'ENA' || stakeNetwork === 'ethereum') return 'Ethereum';
    return activeStakeNetwork?.label ?? null;
  }, [activeStakeNetwork?.label, stakeNetwork, tokenMeta.token]);

  const isNetworkMismatch = useMemo(() => {
    if (!requiredChainId) return false;
    return activeChainId !== requiredChainId;
  }, [activeChainId, requiredChainId]);

  const buttonText = useMemo(() => {
    if (isNetworkMismatch) return requiredNetworkLabel ? `Switch to ${requiredNetworkLabel}` : 'Switch network';
    if (allowanceChecking) return 'Checking allowance...';
    if (!formattedAmount) return 'Enter amount';
    if (isAmountExceedsBalance) return 'Insufficient balance';

    if (!isAllowanceSufficient) {
      if (approveTx.txState === 'submitting' || approveTx.txState === 'submitted') return 'Approving...';
      if (approveTx.txState === 'error') return 'Approval failed - retry';
      return `Approve ${tokenMeta.token}`;
    }

    if (stakeTx.txState === 'submitting' || stakeTx.txState === 'submitted') return 'Staking...';
    if (stakeTx.txState === 'error') return 'Stake failed - retry';

    return 'Stake';
  }, [
    allowanceChecking,
    approveTx.txState,
    formattedAmount,
    isAllowanceSufficient,
    isAmountExceedsBalance,
    isNetworkMismatch,
    requiredNetworkLabel,
    stakeTx.txState,
    tokenMeta.token
  ]);

  const isButtonDisabled = useMemo(() => {
    if (isNetworkMismatch) return true;
    if (!formattedAmount || !parsedAmount || parsedAmount === 0n) return true;
    if (!userAddress) return true;
    if (allowanceChecking) return true;
    if (isAmountExceedsBalance) return true;
    if (isTransactionInProgress) return true;
    return false;
  }, [allowanceChecking, formattedAmount, isAmountExceedsBalance, isNetworkMismatch, isTransactionInProgress, parsedAmount, userAddress]);

  const networkStatusMessage = useMemo(() => {
    if (!isNetworkMismatch) return null;
    if (requiredNetworkLabel) return `Switch wallet to ${requiredNetworkLabel} to continue.`;
    return 'Switch wallet network to continue.';
  }, [isNetworkMismatch, requiredNetworkLabel]);

  const showUnstakeWarning = useMemo(() => stakeNetwork !== 'ethereum', [stakeNetwork]);

  const renderStatus = () => {
    if (networkStatusMessage) {
      return (
        <Typography variant="body2" color="text.secondary">
          {networkStatusMessage}
        </Typography>
      );
    }
    if (!statusMessage) return null;
    return (
      <Typography variant="body2" color="text.secondary">
        {statusMessage}
      </Typography>
    );
  };

  useEffect(() => {
    if (tokenMeta.token !== 'USDE') return;
    if (!defaultStakeNetwork) return;
    if (activeStakeNetwork) return;
    setStakeNetwork(defaultStakeNetwork.key);
  }, [activeStakeNetwork, defaultStakeNetwork, tokenMeta.token]);

  const handleChangeStakeToken = useCallback(
    (event: SelectChangeEvent<any>) => {
      const nextAddress = event.target.value as string;
      handleTokenAddressChange(nextAddress);
      resetTransactions();
      const isEna = nextAddress.toLowerCase() === tokenOptions.ENA.toLowerCase();
      if (isEna) {
        setStakeNetwork('ethereum');
        return;
      }
      if (defaultStakeNetwork) {
        setStakeNetwork(defaultStakeNetwork.key);
      }
    },
    [defaultStakeNetwork, handleTokenAddressChange, resetTransactions, tokenOptions.ENA]
  );

  const handleChangeStakeNetwork = useCallback(
    (event: SelectChangeEvent<any>) => {
      const nextNetwork = event.target.value as StakeNetwork;
      setStakeNetwork(nextNetwork);
      resetTransactions();
    },
    [resetTransactions]
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 0 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          padding: '20px',
          bgcolor: theme.palette.background.default,
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            height: '80px',
            alignItems: 'center',
            marginBottom: '20px',
            marginTop: '15px'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              width: '100%'
            }}
          >
            <Typography variant="body2" color="text.main" fontWeight="bold">
              Stake
            </Typography>
            <Typography variant="body2">Stake Amount:</Typography>
          </Box>
          <Box
            sx={{
              paddingRight: '10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <CustomInput
            autoFocus
            type="text"
            value={formattedAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            inputProps={{ inputMode: 'decimal', pattern: '[0-9.,]*' }}
            sx={{ flex: 1 }}
          />
          <StyledSelect id="stakeToken" name="stakeToken" value={stakeTokenAddress} onChange={handleChangeStakeToken} variant="outlined">
            <MenuItem value={tokenOptions.ENA}>ENA</MenuItem>
            <MenuItem value={tokenOptions.USDE}>USDe</MenuItem>
          </StyledSelect>
          {tokenMeta.token === 'USDE' && (
            <StyledSelect
              id="stakeNetwork"
              name="stakeNetwork"
              value={stakeNetworkValue}
              onChange={handleChangeStakeNetwork}
              variant="outlined"
              disabled={!hasActiveStakeNetworks}
            >
              {!hasActiveStakeNetworks && (
                <MenuItem value="" disabled>
                  No networks with RPC
                </MenuItem>
              )}
              {activeStakeNetworks.map((network) => (
                <MenuItem key={network.key} value={network.key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box component="img" src={network.iconSrc} alt={`${network.label} icon`} sx={{ width: 20, height: 20 }} />
                    <span>{network.label}</span>
                  </Box>
                </MenuItem>
              ))}
            </StyledSelect>
          )}
        </Box>
        {tokenMeta.token === 'USDE' && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              You receive (sUSDe)
            </Typography>
            <Typography variant="body2" color="text.main">
              {internalAmountDisplay} sUSDe
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mb: 2
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => handlePercentClick(25, balanceDisplay)}
            sx={{
              flex: 1,
              bgcolor: activePercentage === 25 ? theme.palette.secondary.main : 'transparent',
              color: activePercentage === 25 ? theme.palette.background.paper : 'inherit'
            }}
          >
            25%
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handlePercentClick(50, balanceDisplay)}
            sx={{
              flex: 1,
              bgcolor: activePercentage === 50 ? theme.palette.secondary.main : 'transparent',
              color: activePercentage === 50 ? theme.palette.background.paper : 'inherit'
            }}
          >
            50%
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handlePercentClick(75, balanceDisplay)}
            sx={{
              flex: 1,
              bgcolor: activePercentage === 75 ? theme.palette.secondary.main : 'transparent',
              color: activePercentage === 75 ? theme.palette.background.paper : 'inherit'
            }}
          >
            75%
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handlePercentClick(100, balanceDisplay)}
            sx={{
              flex: 1,
              bgcolor: activePercentage === 100 ? theme.palette.secondary.main : 'transparent',
              color: activePercentage === 100 ? theme.palette.background.paper : 'inherit'
            }}
          >
            Max
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          width: '100%',
          padding: '25px 20px',
          border: '1px solid',
          borderTop: 'none',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
          borderColor: theme.palette.grey[800],
          mt: '-25px'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            backgroundColor: theme.palette.background.paper,
            margin: '10px 0'
          }}
        >
          <Typography variant="h4" fontWeight="normal">
            Balance: {balanceDisplay} {tokenMeta.token}
          </Typography>
          {renderStatus()}
        </Box>
        {showUnstakeWarning && (
          <Typography variant="body2" sx={{ color: theme.palette.warning.main, mb: 1 }}>
            Unstake is currently only available on Ethereum. For other networks, please use bridge or swap.
          </Typography>
        )}
        <Button
          title="Stake"
          variant="contained"
          color="primary"
          onClick={handleStake}
          disabled={isButtonDisabled}
          sx={{
            height: '58px',
            width: '100%',
            marginTop: '20px',
            fontFamily: 'Roboto, Arial, sans-serif',
            fontSize: '18px',
            fontWeight: 700
          }}
        >
          {buttonText}
        </Button>
      </Box>
    </Box>
  );
};

export default StakeTab;
