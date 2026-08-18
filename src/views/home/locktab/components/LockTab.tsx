import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { IconButton, MenuItem, SelectChangeEvent, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useIntl } from 'react-intl';
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
import { LP_TOKEN_NAMES } from '@/appconfig';
import { useBalanceRefresh } from 'contexts/BalanceRefreshContext';
import { dispatchSuccess, dispatchError } from 'utils/snackbar';
import { describedBy, visuallyHidden } from 'utils/a11y';

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
  const intl = useIntl();
  const { address: userAddress } = useAccount();
  const { config: chainConfig } = useConfigChainId();
  const { tokens, isLoading: isTokensLoading } = useLockTokenOptions();
  const { refetchBalances } = useBalanceRefresh();

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

  const { data: selectedBalance, refetch: refetchSelectedBalance } = useReadContract({
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

  // The button state is derived separately from its label so that translated copy
  // never has to be compared against English literals.
  const buttonState = useMemo(() => {
    if (!formattedAmount) return 'enterAmount' as const;
    if (isAmountExceedsBalance) return 'insufficientBalance' as const;
    if (!isAllowanceSufficient) {
      if (approveTx.txState === 'submitting' || approveTx.txState === 'submitted') return 'approving' as const;
      if (approveTx.txState === 'error') return 'approveRetry' as const;
      return 'approve' as const;
    }
    if (lockTx.txState === 'submitting' || lockTx.txState === 'submitted') return 'locking' as const;
    if (lockTx.txState === 'error') return 'retry' as const;
    return 'submit' as const;
  }, [approveTx.txState, formattedAmount, isAllowanceSufficient, isAmountExceedsBalance, lockTx.txState]);

  const buttonText = useMemo(() => {
    switch (buttonState) {
      case 'enterAmount':
        return intl.formatMessage({ id: 'app.common.enterAmount', defaultMessage: 'Enter amount' });
      case 'insufficientBalance':
        return intl.formatMessage({ id: 'app.common.insufficientBalance', defaultMessage: 'Insufficient balance' });
      case 'approving':
        return intl.formatMessage({ id: 'app.stake.approving', defaultMessage: 'Approving...' });
      case 'approveRetry':
        return intl.formatMessage({ id: 'app.stake.approveRetry', defaultMessage: 'Approval failed - retry' });
      case 'approve':
        return intl.formatMessage({ id: 'app.stake.approve', defaultMessage: 'Approve {symbol}' }, { symbol: tokenMeta.token });
      case 'locking':
        return intl.formatMessage({ id: 'app.lock.locking', defaultMessage: 'Locking...' });
      case 'retry':
        return intl.formatMessage({ id: 'app.lock.retry', defaultMessage: 'Lock failed - retry' });
      default:
        return intl.formatMessage({ id: 'app.lock.submit', defaultMessage: 'Lock' });
    }
  }, [buttonState, intl, tokenMeta.token]);

  const isButtonDisabled = useMemo(() => {
    if (!formattedAmount || !parsedAmount || parsedAmount === 0n) return true;
    if (!userAddress) return true;
    if (!selectedTokenAddress) return true;
    if (isTokensLoading) return true;
    if (isAmountExceedsBalance) return true;
    if (approveTx.txState === 'submitting' || approveTx.txState === 'submitted') return true;
    if (lockTx.txState === 'submitting' || lockTx.txState === 'submitted') return true;
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
    if (approveTx.txState === 'submitted')
      return intl.formatMessage({ id: 'app.tx.approvalSubmitted', defaultMessage: 'Approval submitted, waiting for confirmation...' });
    if (approveTx.txState === 'error')
      return intl.formatMessage({ id: 'app.tx.approvalFailedRetry', defaultMessage: 'Approval failed, please retry.' });
    if (lockTx.txState === 'submitted')
      return intl.formatMessage({ id: 'app.tx.lockSubmitted', defaultMessage: 'Lock submitted, waiting for confirmation...' });
    if (lockTx.txState === 'error')
      return intl.formatMessage({ id: 'app.tx.lockFailedRetry', defaultMessage: 'Lock failed, please retry.' });
    return null;
  }, [approveTx.txState, intl, lockTx.txState]);

  const submitLock = useCallback(
    async (amount: bigint) => {
      if (!selectedTokenAddress) return;
      await lockTx.sendTransaction({
        abi: enaLpStakingConfig.abi,
        address: stakingAddress,
        functionName: 'stake',
        args: [tokenMeta.tokenAddress, amount]
      });
    },
    [lockTx, selectedTokenAddress, stakingAddress, tokenMeta.tokenAddress]
  );

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
  }, [approveTx.txState, isAllowanceSufficient, lockTx.txState, pendingAmount, submitLock]);

  const prevApproveTxState = useRef(approveTx.txState);
  useEffect(() => {
    if (prevApproveTxState.current !== approveTx.txState) {
      if (approveTx.txState === 'confirmed') {
        dispatchSuccess(intl.formatMessage({ id: 'app.tx.approvalConfirmed', defaultMessage: 'Approval confirmed' }));
        refetchAllowance();
      } else if (approveTx.txState === 'error') {
        dispatchError(intl.formatMessage({ id: 'app.tx.approvalFailed', defaultMessage: 'Approval failed' }));
      }
      prevApproveTxState.current = approveTx.txState;
    }
  }, [approveTx.txState, intl, refetchAllowance]);

  const prevLockTxState = useRef(lockTx.txState);
  useEffect(() => {
    if (prevLockTxState.current !== lockTx.txState) {
      if (lockTx.txState === 'confirmed') {
        dispatchSuccess(intl.formatMessage({ id: 'app.tx.lockConfirmed', defaultMessage: 'Lock confirmed' }));
        setPendingAmount(null);
        resetAmount();
        refetchSelectedBalance();
        refetchAllowance();
        refetchBalances();
      } else if (lockTx.txState === 'error') {
        dispatchError(intl.formatMessage({ id: 'app.tx.lockFailed', defaultMessage: 'Lock failed' }));
      }
      prevLockTxState.current = lockTx.txState;
    }
  }, [intl, lockTx.txState, resetAmount, refetchAllowance, refetchBalances, refetchSelectedBalance]);

  useEffect(() => {
    resetAmount();
    setPendingAmount(null);
  }, [resetAmount, tokenMeta.tokenAddress]);

  const isStatusError = approveTx.txState === 'error' || lockTx.txState === 'error';

  const submitAccessibleName =
    buttonState === 'submit'
      ? intl.formatMessage({ id: 'app.lock.submitToken', defaultMessage: 'Lock {symbol}' }, { symbol: tokenMeta.token })
      : undefined;

  // Always-rendered live region so transaction updates reach assistive tech.
  const renderStatus = () => (
    <Typography
      key={isStatusError ? 'alert' : 'status'}
      id="lock-status"
      role={isStatusError ? 'alert' : 'status'}
      variant="body2"
      color="text.secondary"
    >
      {statusMessage ?? ''}
    </Typography>
  );

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
    if (isTokensLoading) return intl.formatMessage({ id: 'app.common.loading', defaultMessage: 'Loading...' });
    if (!selectedTokenAddress) return intl.formatMessage({ id: 'app.common.selectToken', defaultMessage: 'Select token' });
    return selectedToken?.symbol ?? selectedTokenAddress;
  };

  const getTokenTooltip = () => {
    if (!selectedTokenAddress) return '';
    const symbol = selectedToken?.symbol ?? 'Unknown';
    const tokenName = LP_TOKEN_NAMES[selectedTokenAddress.toLowerCase()] ?? 'Unknown';
    return `${symbol} (${tokenName}): ${selectedTokenAddress}`;
  };

  const handleCopyAddress = () => {
    if (selectedTokenAddress) {
      navigator.clipboard.writeText(selectedTokenAddress);
    }
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
              {intl.formatMessage({ id: 'app.lock.heading', defaultMessage: 'Lock {symbol}' }, { symbol: tokenMeta.token })}
            </Typography>
            <Typography variant="body2">{intl.formatMessage({ id: 'app.lock.amountLabel', defaultMessage: 'Lock Amount:' })}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <CustomInput
            autoFocus
            type="text"
            value={formattedAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            inputProps={{
              inputMode: 'decimal',
              pattern: '[0-9.,]*',
              'aria-label': intl.formatMessage(
                { id: 'app.lock.amountInput', defaultMessage: 'Amount of {symbol} to lock' },
                { symbol: tokenMeta.token }
              ),
              'aria-describedby': describedBy('lock-balance-value', 'lock-cooldown-info', 'lock-status'),
              'aria-invalid': isAmountExceedsBalance || undefined
            }}
            sx={{ flex: 1 }}
          />
          <Box component="span" id="lock-token-label" sx={visuallyHidden}>
            {intl.formatMessage({ id: 'app.lock.tokenLabel', defaultMessage: 'Token to lock' })}
          </Box>
          <StyledSelect
            id="lockToken"
            name="lockToken"
            labelId="lock-token-label"
            value={selectedTokenAddress ?? ''}
            onChange={handleTokenChange}
            variant="outlined"
            displayEmpty
            renderValue={renderTokenValue}
            disabled={tokens.length === 0 || isTokensLoading}
          >
            {isTokensLoading ? (
              <MenuItem disabled value="">
                {intl.formatMessage({ id: 'app.common.loading', defaultMessage: 'Loading...' })}
              </MenuItem>
            ) : tokens.length === 0 ? (
              <MenuItem disabled value="">
                {intl.formatMessage({ id: 'app.common.noTokensAvailable', defaultMessage: 'No tokens available' })}
              </MenuItem>
            ) : null}
            {tokens.map((token) => (
              <MenuItem key={token.address} value={token.address}>
                {token.symbol ?? token.address}
              </MenuItem>
            ))}
          </StyledSelect>
          <Tooltip title={getTokenTooltip()} arrow>
            <IconButton
              onClick={handleCopyAddress}
              disabled={!selectedTokenAddress}
              size="small"
              aria-label={intl.formatMessage(
                { id: 'app.common.copyAddress', defaultMessage: 'Copy {symbol} contract address' },
                { symbol: selectedToken?.symbol ?? 'token' }
              )}
              aria-describedby={selectedTokenAddress ? 'lock-token-address' : undefined}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* the tooltip text is visual only, so the same value is exposed to the a11y tree */}
          <Box component="span" id="lock-token-address" sx={visuallyHidden}>
            {getTokenTooltip()}
          </Box>
        </Box>

        <Box
          role="group"
          aria-label={intl.formatMessage(
            { id: 'app.common.presetAmount', defaultMessage: 'Preset {symbol} amount' },
            { symbol: tokenMeta.token }
          )}
          sx={{
            display: 'flex',
            gap: 1,
            mb: 2
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => handlePercentClick(25, tokenMeta.balance)}
            aria-pressed={activePercentage === 25}
            aria-label={intl.formatMessage(
              { id: 'app.common.percentOfBalance', defaultMessage: '{percent}% of available {symbol} balance' },
              { percent: 25, symbol: tokenMeta.token }
            )}
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
            onClick={() => handlePercentClick(50, tokenMeta.balance)}
            aria-pressed={activePercentage === 50}
            aria-label={intl.formatMessage(
              { id: 'app.common.percentOfBalance', defaultMessage: '{percent}% of available {symbol} balance' },
              { percent: 50, symbol: tokenMeta.token }
            )}
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
            onClick={() => handlePercentClick(75, tokenMeta.balance)}
            aria-pressed={activePercentage === 75}
            aria-label={intl.formatMessage(
              { id: 'app.common.percentOfBalance', defaultMessage: '{percent}% of available {symbol} balance' },
              { percent: 75, symbol: tokenMeta.token }
            )}
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
            onClick={() => handlePercentClick(100, tokenMeta.balance)}
            aria-pressed={activePercentage === 100}
            aria-label={intl.formatMessage(
              { id: 'app.common.maxOfBalance', defaultMessage: 'Max available {symbol} balance' },
              { symbol: tokenMeta.token }
            )}
            sx={{
              flex: 1,
              bgcolor: activePercentage === 100 ? theme.palette.secondary.main : 'transparent',
              color: activePercentage === 100 ? theme.palette.background.paper : 'inherit'
            }}
          >
            {intl.formatMessage({ id: 'app.common.max', defaultMessage: 'Max' })}
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
        <Typography id="lock-cooldown-info" variant="body2" color="text.secondary">
          {intl.formatMessage(
            { id: 'app.lock.cooldownInfo', defaultMessage: 'Cooldown: {duration} before withdrawal.' },
            { duration: formatDuration(Number(tokenMeta.cooldown)) }
          )}
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
          <Typography id="lock-balance-value" variant="h4" component="p" fontWeight="normal">
            {intl.formatMessage(
              { id: 'app.common.balance', defaultMessage: 'Balance: {amount} {symbol}' },
              { amount: selectedBalanceDisplay, symbol: tokenMeta.token }
            )}
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
          <Button
            variant="contained"
            fullWidth
            onClick={handleLock}
            disabled={isButtonDisabled}
            aria-label={submitAccessibleName}
            aria-describedby="lock-balance-value lock-cooldown-info lock-status"
          >
            {buttonText}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LockTab;
