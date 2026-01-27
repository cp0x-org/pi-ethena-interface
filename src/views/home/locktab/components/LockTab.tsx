import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { MenuItem, SelectChangeEvent, Typography } from '@mui/material';
import React, { useMemo, useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatTokenBalance } from 'utils/formatters';

import { useTheme } from '@mui/material/styles';
import { CustomInput } from 'components/CustomInput';
import { StyledSelect } from 'components/StyledSelect';
import { BalancesData } from 'hooks/useBalanceData';
import { useConfigChainId } from 'hooks/useConfigChainId';
import { useStakeAmount } from '../../staketab/hooks/useStakeAmount';
import { useWriteTransaction } from 'hooks/useWriteTransaction';
import { enaLpStakingConfig } from '@/appconfig/abi/EnaLpStaking';
import { erc20Config } from '@/appconfig/abi/Erc20';
import { useLockTokenOptions } from '../hooks/useLockTokenOptions';

interface LockTokenMeta {
  token: string;
  balance: bigint;
  tokenAddress: `0x${string}`;
  approveAbi: typeof erc20Config.abi;
  cooldown: bigint;
}

interface Props {
  balances: BalancesData;
}

const LockTab = (_props: Props) => {
  const theme = useTheme();
  const { address: userAddress } = useAccount();
  const { config: chainConfig } = useConfigChainId();
  const { tokens, isLoading: isTokensLoading } = useLockTokenOptions();

  const stakingAddress = chainConfig.contracts.ENA_LP_STAKING as `0x${string}`;
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    if (tokens.length === 0) return;
    if (!selectedTokenAddress) {
      setSelectedTokenAddress(tokens[0].address);
      return;
    }
    const exists = tokens.some((token) => token.address.toLowerCase() === selectedTokenAddress.toLowerCase());
    if (!exists) {
      setSelectedTokenAddress(tokens[0].address);
    }
  }, [selectedTokenAddress, tokens]);

  const selectedToken = useMemo(() => {
    if (!selectedTokenAddress) return null;
    return tokens.find((token) => token.address.toLowerCase() === selectedTokenAddress.toLowerCase()) ?? null;
  }, [selectedTokenAddress, tokens]);

  const { data: selectedBalance } = useReadContract({
    abi: erc20Config.abi,
    address: selectedTokenAddress ?? undefined,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && !!selectedTokenAddress
    }
  });

  const tokenMeta = useMemo<LockTokenMeta>(() => {
    const tokenName = selectedToken?.symbol ?? 'Token';
    return {
      token: tokenName,
      balance: selectedBalance ?? 0n,
      tokenAddress: (selectedTokenAddress ?? chainConfig.contracts.SENA) as `0x${string}`,
      approveAbi: erc20Config.abi,
      cooldown: selectedToken?.cooldown ?? 0n
    };
  }, [selectedToken?.cooldown, selectedToken?.symbol, selectedBalance, selectedTokenAddress, chainConfig.contracts.SENA]);

  const { formattedAmount, activePercentage, parsedAmount, handleAmountChange, handlePercentClick, resetAmount } = useStakeAmount('');

  const selectedBalanceDisplay = useMemo(() => formatTokenBalance(tokenMeta.balance), [tokenMeta.balance]);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: tokenMeta.approveAbi,
    address: tokenMeta.tokenAddress,
    functionName: 'allowance',
    args: userAddress ? [userAddress, stakingAddress] : undefined,
    query: {
      enabled: !!userAddress && !!selectedTokenAddress
    }
  });

  const approveTx = useWriteTransaction();
  const lockTx = useWriteTransaction();
  const [pendingAmount, setPendingAmount] = useState<bigint | null>(null);

  const isAllowanceSufficient = useMemo(() => {
    if (!allowance || !parsedAmount) return false;
    return allowance >= parsedAmount;
  }, [allowance, parsedAmount]);

  const isAmountExceedsBalance = useMemo(() => {
    if (!parsedAmount) return false;
    return parsedAmount > tokenMeta.balance;
  }, [parsedAmount, tokenMeta.balance]);

  const buttonText = useMemo(() => {
    if (!formattedAmount) return 'Enter amount';
    if (isAmountExceedsBalance) return 'Insufficient balance';
    if (!isAllowanceSufficient) {
      if (approveTx.txState === 'submitting' || approveTx.txState === 'submitted') return 'Approving...';
      if (approveTx.txState === 'error') return 'Approval failed - retry';
      return `Approve ${tokenMeta.token}`;
    }
    if (lockTx.txState === 'submitting' || lockTx.txState === 'submitted') return 'Locking...';
    if (lockTx.txState === 'error') return 'Lock failed - retry';
    return 'Lock';
  }, [approveTx.txState, formattedAmount, isAllowanceSufficient, isAmountExceedsBalance, lockTx.txState, tokenMeta.token]);

  const isButtonDisabled = useMemo(() => {
    if (!formattedAmount || !parsedAmount || parsedAmount === 0n) return true;
    if (!userAddress) return true;
    if (!selectedTokenAddress) return true;
    if (isTokensLoading) return true;
    if (isAmountExceedsBalance) return true;
    if (approveTx.txState === 'submitting' || lockTx.txState === 'submitting') return true;
    return false;
  }, [
    approveTx.txState,
    formattedAmount,
    isAmountExceedsBalance,
    isTokensLoading,
    lockTx.txState,
    parsedAmount,
    selectedTokenAddress,
    userAddress
  ]);

  const statusMessage = useMemo(() => {
    if (approveTx.txState === 'submitted') return 'Approval submitted, waiting for confirmation...';
    if (approveTx.txState === 'error') return 'Approval failed, please retry.';
    if (lockTx.txState === 'submitted') return 'Lock submitted, waiting for confirmation...';
    if (lockTx.txState === 'error') return 'Lock failed, please retry.';
    return null;
  }, [approveTx.txState, lockTx.txState]);

  const submitLock = async (amount: bigint) => {
    if (!selectedTokenAddress) return;
    await lockTx.sendTransaction({
      abi: enaLpStakingConfig.abi,
      address: stakingAddress,
      functionName: 'stake',
      args: [tokenMeta.tokenAddress, amount]
    });
  };

  const handleLock = async () => {
    if (!parsedAmount || !userAddress || !selectedTokenAddress) return;
    setPendingAmount(parsedAmount);

    if (!isAllowanceSufficient) {
      await approveTx.sendTransaction({
        abi: tokenMeta.approveAbi,
        address: tokenMeta.tokenAddress,
        functionName: 'approve',
        args: [stakingAddress, parsedAmount]
      });
      return;
    }

    await submitLock(parsedAmount);
  };

  useEffect(() => {
    if (approveTx.txState === 'confirmed' && pendingAmount && isAllowanceSufficient && lockTx.txState === 'idle') {
      submitLock(pendingAmount);
    }
  }, [approveTx.txState, isAllowanceSufficient, lockTx.txState, pendingAmount]);

  useEffect(() => {
    if (approveTx.txState === 'confirmed') {
      refetchAllowance();
    }
  }, [approveTx.txState, refetchAllowance]);

  useEffect(() => {
    if (lockTx.txState === 'confirmed') {
      setPendingAmount(null);
      resetAmount();
    }
  }, [lockTx.txState, resetAmount]);

  useEffect(() => {
    resetAmount();
    setPendingAmount(null);
  }, [resetAmount, tokenMeta.tokenAddress]);

  const renderStatus = () => {
    if (!statusMessage) return null;
    return (
      <Typography variant="body2" color="text.secondary">
        {statusMessage}
      </Typography>
    );
  };

  const formatDuration = (totalSeconds: number) => {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0s';
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [days > 0 ? `${days}d` : null, hours > 0 ? `${hours}h` : null, minutes > 0 ? `${minutes}m` : null, `${seconds}s`].filter(
      Boolean
    );
    return parts.join(' ');
  };

  const handleTokenChange = (event: SelectChangeEvent<unknown>) => {
    const selected = event.target.value as `0x${string}`;
    setSelectedTokenAddress(selected);
  };

  const renderTokenValue = () => {
    if (isTokensLoading) return 'Loading...';
    if (!selectedTokenAddress) return 'Select token';
    return selectedToken?.symbol ?? selectedTokenAddress;
  };

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
              Lock {tokenMeta.token}
            </Typography>
            <Typography variant="body2">Lock Amount:</Typography>
          </Box>
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
          <StyledSelect
            id="lockToken"
            name="lockToken"
            value={selectedTokenAddress ?? ''}
            onChange={handleTokenChange}
            variant="outlined"
            displayEmpty
            renderValue={renderTokenValue}
            disabled={tokens.length === 0 || isTokensLoading}
          >
            {isTokensLoading ? (
              <MenuItem disabled value="">
                Loading...
              </MenuItem>
            ) : tokens.length === 0 ? (
              <MenuItem disabled value="">
                No tokens available
              </MenuItem>
            ) : null}
            {tokens.map((token) => (
              <MenuItem key={token.address} value={token.address}>
                {token.symbol ?? token.address}
              </MenuItem>
            ))}
          </StyledSelect>
        </Box>

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
            onClick={() => handlePercentClick(25, selectedBalanceDisplay)}
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
            onClick={() => handlePercentClick(50, selectedBalanceDisplay)}
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
            onClick={() => handlePercentClick(75, selectedBalanceDisplay)}
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
            onClick={() => handlePercentClick(100, selectedBalanceDisplay)}
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
        <Typography variant="body2" color="text.secondary">
          Cooldown: {formatDuration(Number(tokenMeta.cooldown))} before withdrawal.
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            backgroundColor: theme.palette.background.paper,
            margin: '10px 0'
          }}
        >
          <Typography variant="h4" fontWeight="normal">
            Balance: {selectedBalanceDisplay} {tokenMeta.token}
          </Typography>
          <Box sx={{ flex: 1 }}>{renderStatus()}</Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center'
          }}
        >
          <Button variant="contained" fullWidth onClick={handleLock} disabled={isButtonDisabled}>
            {buttonText}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LockTab;
