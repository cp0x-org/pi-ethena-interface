import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { IconButton, MenuItem, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useAccount } from 'wagmi';
import { formatTokenBalance } from 'utils/formatters';

import { useTheme } from '@mui/material/styles';
import { CustomInput } from 'components/CustomInput';
import { useConfigChainId } from 'hooks/useConfigChainId';
import { useStakeAmount } from '../../staketab/hooks/useStakeAmount';
import { useWriteTransaction } from 'hooks/useWriteTransaction';
import { enaLpStakingConfig } from '@/appconfig/abi/EnaLpStaking';
import { BalancesData } from 'hooks/useBalanceData';
import { StyledSelect } from 'components/StyledSelect';
import { useLockTokenOptions } from '../hooks/useLockTokenOptions';
import { useStakeInfoByToken } from '../hooks/useStakeInfoByToken';
import { LP_TOKEN_NAMES } from '@/appconfig';
import { useBalanceRefresh } from 'contexts/BalanceRefreshContext';
import { dispatchSuccess, dispatchError } from 'utils/snackbar';
import { visuallyHidden } from 'utils/a11y';

interface Props {
  balances?: BalancesData;
}

const WithdrawTab = (_props: Props) => {
  const theme = useTheme();
  const intl = useIntl();
  const { address: userAddress } = useAccount();
  const { config: chainConfig } = useConfigChainId();
  const { tokens, isLoading: isTokensLoading } = useLockTokenOptions({ includeZeroStakeLimit: true });
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<`0x${string}` | null>(null);
  const { refetchBalances } = useBalanceRefresh();

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

  const { coolingDownAmount, cooldownStartTimestamp, cooldown, refetchAll, stakeLimit } = useStakeInfoByToken(
    selectedTokenAddress ?? undefined
  );

  const stakingAddress = chainConfig.contracts.ENA_LP_STAKING as `0x${string}`;

  const { formattedAmount, activePercentage, parsedAmount, handleAmountChange, handlePercentClick, resetAmount } = useStakeAmount('');

  const withdrawTx = useWriteTransaction();

  const coolingDownDisplay = useMemo(() => formatTokenBalance(coolingDownAmount ?? 0n), [coolingDownAmount]);
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  const cooldownStartTs = useMemo<bigint>(() => {
    if (cooldownStartTimestamp == null) return 0n;
    return BigInt(cooldownStartTimestamp);
  }, [cooldownStartTimestamp]);
  const cooldownEndTimestamp = useMemo(() => cooldownStartTs + cooldown, [cooldownStartTs, cooldown]);

  useEffect(() => {
    if (!cooldownEndTimestamp) return;

    const interval = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, [cooldownEndTimestamp]);

  const timeRemainingSeconds = useMemo(() => {
    if (!cooldownEndTimestamp) return 0;
    const remaining = Number(cooldownEndTimestamp - BigInt(nowSeconds));
    return remaining > 0 ? remaining : 0;
  }, [cooldownEndTimestamp, nowSeconds]);

  const formatDuration = useCallback((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [hours > 0 ? `${hours}h` : null, minutes > 0 ? `${minutes}m` : null, `${seconds}s`].filter(Boolean);
    return parts.join(' ');
  }, []);

  const isCooldownComplete = cooldown === 0n ? true : timeRemainingSeconds === 0;

  const isAmountExceedsLimit = useMemo(() => {
    if (!parsedAmount) return false;
    if (stakeLimit === 0n) return false;
    return parsedAmount > stakeLimit;
  }, [parsedAmount, stakeLimit]);

  const canWithdraw = useMemo(() => {
    if (!parsedAmount || parsedAmount === 0n) return false;
    if (!isCooldownComplete) return false;
    if (stakeLimit === 0n) return false;
    if (isAmountExceedsLimit) return false;
    return parsedAmount <= coolingDownAmount;
  }, [coolingDownAmount, isAmountExceedsLimit, isCooldownComplete, parsedAmount, stakeLimit]);

  // The button state is derived separately from its label so that translated copy
  // never has to be compared against English literals.
  const buttonState = useMemo(() => {
    if (!formattedAmount) return 'enterAmount' as const;
    if (!isCooldownComplete) return 'cooldown' as const;
    if (isAmountExceedsLimit) return 'exceedsLimit' as const;
    if (parsedAmount && parsedAmount > coolingDownAmount) return 'insufficientCooled' as const;
    if (withdrawTx.txState === 'submitting' || withdrawTx.txState === 'submitted') return 'withdrawing' as const;
    if (withdrawTx.txState === 'error') return 'retry' as const;
    return 'submit' as const;
  }, [coolingDownAmount, formattedAmount, isAmountExceedsLimit, isCooldownComplete, parsedAmount, withdrawTx.txState]);

  const buttonText = useMemo(() => {
    switch (buttonState) {
      case 'enterAmount':
        return intl.formatMessage({ id: 'app.common.enterAmount', defaultMessage: 'Enter amount' });
      case 'cooldown':
        return intl.formatMessage(
          { id: 'app.withdraw.cooldownEndsIn', defaultMessage: 'Cooldown ends in {duration}' },
          { duration: formatDuration(timeRemainingSeconds) }
        );
      case 'exceedsLimit':
        return intl.formatMessage({ id: 'app.unlock.exceedsLimit', defaultMessage: 'Amount exceeds limit' });
      case 'insufficientCooled':
        return intl.formatMessage({ id: 'app.lockWithdraw.insufficientCooled', defaultMessage: 'Insufficient cooled balance' });
      case 'withdrawing':
        return intl.formatMessage({ id: 'app.withdraw.withdrawing', defaultMessage: 'Withdrawing...' });
      case 'retry':
        return intl.formatMessage({ id: 'app.withdraw.retry', defaultMessage: 'Withdraw failed - retry' });
      default:
        return intl.formatMessage({ id: 'app.withdraw.submit', defaultMessage: 'Withdraw' });
    }
  }, [buttonState, formatDuration, intl, timeRemainingSeconds]);

  const isButtonDisabled = useMemo(() => {
    if (!formattedAmount || !parsedAmount || parsedAmount === 0n) return true;
    if (!userAddress) return true;
    if (!selectedTokenAddress) return true;
    if (isTokensLoading) return true;
    if (!canWithdraw) return true;
    if (withdrawTx.txState === 'submitting' || withdrawTx.txState === 'submitted') return true;
    return false;
  }, [canWithdraw, formattedAmount, isTokensLoading, parsedAmount, selectedTokenAddress, userAddress, withdrawTx.txState]);

  const statusMessage = useMemo(() => {
    if (!isCooldownComplete)
      return intl.formatMessage(
        { id: 'app.lockWithdraw.cooldownEndsInPeriod', defaultMessage: 'Cooldown ends in {duration}.' },
        { duration: formatDuration(timeRemainingSeconds) }
      );
    if (withdrawTx.txState === 'submitted')
      return intl.formatMessage({ id: 'app.tx.withdrawSubmitted', defaultMessage: 'Withdraw submitted, waiting for confirmation...' });
    if (withdrawTx.txState === 'error')
      return intl.formatMessage({ id: 'app.tx.withdrawFailedRetry', defaultMessage: 'Withdraw failed, please retry.' });
    return null;
  }, [formatDuration, intl, isCooldownComplete, timeRemainingSeconds, withdrawTx.txState]);

  // Ticker as it is spelled in the UI, used for accessible names only.
  const tokenLabel = selectedToken?.symbol ?? 'Token';

  const submitAccessibleName =
    buttonState === 'submit'
      ? intl.formatMessage({ id: 'app.withdraw.submitToken', defaultMessage: 'Withdraw {symbol}' }, { symbol: tokenLabel })
      : undefined;

  // While the cooldown is counting down the message changes every second, so it must not be
  // a live region — otherwise assistive tech would announce it once per second.
  const statusRole = withdrawTx.txState === 'error' ? 'alert' : isCooldownComplete ? 'status' : undefined;

  const renderStatus = () => (
    <Typography key={statusRole ?? 'plain'} id="lock-withdraw-status" role={statusRole} variant="body2" color="text.secondary">
      {statusMessage ?? ''}
    </Typography>
  );

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

  const handleWithdraw = async () => {
    if (!parsedAmount || !userAddress || !canWithdraw || !selectedTokenAddress) return;

    await withdrawTx.sendTransaction({
      abi: enaLpStakingConfig.abi,
      address: stakingAddress,
      functionName: 'withdraw',
      args: [selectedTokenAddress, parsedAmount]
    });
  };

  const prevWithdrawTxState = useRef(withdrawTx.txState);
  React.useEffect(() => {
    if (prevWithdrawTxState.current !== withdrawTx.txState) {
      if (withdrawTx.txState === 'confirmed') {
        dispatchSuccess(intl.formatMessage({ id: 'app.tx.withdrawConfirmed', defaultMessage: 'Withdraw confirmed' }));
        resetAmount();
        refetchAll();
        refetchBalances();
      } else if (withdrawTx.txState === 'error') {
        dispatchError(intl.formatMessage({ id: 'app.tx.withdrawFailed', defaultMessage: 'Withdraw failed' }));
      }
      prevWithdrawTxState.current = withdrawTx.txState;
    }
  }, [intl, refetchAll, resetAmount, withdrawTx.txState, refetchBalances]);

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
              {intl.formatMessage({ id: 'app.lockWithdraw.heading', defaultMessage: 'Withdraw {symbol}' }, { symbol: tokenLabel })}
            </Typography>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'app.lockWithdraw.cooledDownAmount', defaultMessage: 'Cooled down amount:' })}
            </Typography>
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
                { id: 'app.lockWithdraw.amountInput', defaultMessage: 'Amount of {symbol} to withdraw' },
                { symbol: tokenLabel }
              ),
              'aria-describedby': 'lock-withdraw-cooling-value lock-withdraw-status',
              'aria-invalid': isAmountExceedsLimit || (!!parsedAmount && parsedAmount > coolingDownAmount) || undefined
            }}
            sx={{ flex: 1 }}
          />
          <Box component="span" id="lock-withdraw-token-label" sx={visuallyHidden}>
            {intl.formatMessage({ id: 'app.withdraw.tokenLabel', defaultMessage: 'Token to withdraw' })}
          </Box>
          <StyledSelect
            id="withdrawToken"
            name="withdrawToken"
            labelId="lock-withdraw-token-label"
            value={selectedTokenAddress ?? ''}
            onChange={(event) => {
              setSelectedTokenAddress(event.target.value as `0x${string}`);
            }}
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
                { symbol: tokenLabel }
              )}
              aria-describedby={selectedTokenAddress ? 'lock-withdraw-token-address' : undefined}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* the tooltip text is visual only, so the same value is exposed to the a11y tree */}
          <Box component="span" id="lock-withdraw-token-address" sx={visuallyHidden}>
            {getTokenTooltip()}
          </Box>
        </Box>

        <Box
          role="group"
          aria-label={intl.formatMessage(
            { id: 'app.common.presetAmount', defaultMessage: 'Preset {symbol} amount' },
            { symbol: tokenLabel }
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
            onClick={() => handlePercentClick(25, coolingDownAmount ?? 0n)}
            aria-pressed={activePercentage === 25}
            aria-label={intl.formatMessage(
              { id: 'app.lockWithdraw.percentOfCooled', defaultMessage: '{percent}% of cooled down {symbol}' },
              { percent: 25, symbol: tokenLabel }
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
            onClick={() => handlePercentClick(50, coolingDownAmount ?? 0n)}
            aria-pressed={activePercentage === 50}
            aria-label={intl.formatMessage(
              { id: 'app.lockWithdraw.percentOfCooled', defaultMessage: '{percent}% of cooled down {symbol}' },
              { percent: 50, symbol: tokenLabel }
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
            onClick={() => handlePercentClick(75, coolingDownAmount ?? 0n)}
            aria-pressed={activePercentage === 75}
            aria-label={intl.formatMessage(
              { id: 'app.lockWithdraw.percentOfCooled', defaultMessage: '{percent}% of cooled down {symbol}' },
              { percent: 75, symbol: tokenLabel }
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
            onClick={() => handlePercentClick(100, coolingDownAmount ?? 0n)}
            aria-pressed={activePercentage === 100}
            aria-label={intl.formatMessage(
              { id: 'app.lockWithdraw.maxCooled', defaultMessage: 'Max cooled down {symbol}' },
              { symbol: tokenLabel }
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
          <Typography id="lock-withdraw-cooling-value" variant="h4" component="p" fontWeight="normal">
            {intl.formatMessage(
              { id: 'app.lockWithdraw.coolingDown', defaultMessage: 'Cooling down: {amount} {symbol}' },
              { amount: coolingDownDisplay, symbol: tokenLabel }
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
            onClick={handleWithdraw}
            disabled={isButtonDisabled}
            aria-label={submitAccessibleName}
            aria-describedby="lock-withdraw-cooling-value lock-withdraw-status"
          >
            {buttonText}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default WithdrawTab;
