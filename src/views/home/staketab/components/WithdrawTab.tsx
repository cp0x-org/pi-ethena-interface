import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { MenuItem, Typography } from '@mui/material';
import React, { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useAccount } from 'wagmi';

import { useTheme } from '@mui/material/styles';
import { StyledSelect } from 'components/StyledSelect';
import { BalancesData } from 'hooks/useBalanceData';
import { useCooldownInfo } from '../hooks/useCooldownInfo';
import { useUnstakeTokenSelection } from '../hooks/useUnstakeTokenSelection';
import { useWithdrawTransactions } from '../hooks/useWithdrawTransactions';
import { useBalanceRefresh } from 'contexts/BalanceRefreshContext';
import { visuallyHidden } from 'utils/a11y';

interface Props {
  balances: BalancesData;
}

const WithdrawTab = ({ balances }: Props) => {
  const theme = useTheme();
  const intl = useIntl();
  const { address: userAddress } = useAccount();
  const { refetchBalances } = useBalanceRefresh();

  const { tokenMeta, unstakeTokenAddress, handleTokenAddressChange, tokenOptions } = useUnstakeTokenSelection(balances);

  const { formattedUnderlyingAmount, timeRemainingSeconds, isCooldownActive, cooldownMessage, underlyingAmount, refetchCooldown } =
    useCooldownInfo({ tokenMeta, userAddress });

  const handleWithdrawConfirmed = useCallback(() => {
    refetchCooldown();
    refetchBalances();
  }, [refetchCooldown, refetchBalances]);

  const { handleWithdraw, withdrawTx, statusMessage } = useWithdrawTransactions({
    tokenMeta,
    userAddress,
    onWithdrawConfirmed: handleWithdrawConfirmed
  });

  // The button state is derived separately from its label so that translated copy
  // never has to be compared against English literals.
  const buttonState = useMemo(() => {
    if (withdrawTx.txState === 'submitting') return 'preparing' as const;
    if (withdrawTx.txState === 'submitted') return 'withdrawing' as const;
    if (withdrawTx.txState === 'error') return 'retry' as const;
    if (isCooldownActive) return 'cooldown' as const;
    if (!underlyingAmount || underlyingAmount === 0n) return 'noFunds' as const;
    return 'submit' as const;
  }, [isCooldownActive, underlyingAmount, withdrawTx.txState]);

  const buttonText = useMemo(() => {
    switch (buttonState) {
      case 'preparing':
        return intl.formatMessage({ id: 'app.withdraw.preparing', defaultMessage: 'Preparing transaction...' });
      case 'withdrawing':
        return intl.formatMessage({ id: 'app.withdraw.withdrawing', defaultMessage: 'Withdrawing...' });
      case 'retry':
        return intl.formatMessage({ id: 'app.withdraw.retry', defaultMessage: 'Withdraw failed - retry' });
      case 'cooldown':
        return intl.formatMessage({ id: 'app.withdraw.cooldownInProgress', defaultMessage: 'Cooldown in progress' });
      case 'noFunds':
        return intl.formatMessage({ id: 'app.withdraw.noFunds', defaultMessage: 'No funds to withdraw' });
      default:
        return intl.formatMessage({ id: 'app.withdraw.submit', defaultMessage: 'Withdraw' });
    }
  }, [buttonState, intl]);

  const isButtonDisabled = useMemo(() => {
    if (!userAddress) return true;
    if (!underlyingAmount || underlyingAmount === 0n) return true;
    if (isCooldownActive) return true;
    if (withdrawTx.txState === 'submitting' || withdrawTx.txState === 'submitted') return true;
    return false;
  }, [isCooldownActive, underlyingAmount, userAddress, withdrawTx.txState]);
  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [hours > 0 ? `${hours}h` : null, minutes > 0 ? `${minutes}m` : null, `${seconds}s`].filter(Boolean);

    return parts.join(' ');
  };
  const renderStatus = () => {
    if (statusMessage) {
      return statusMessage;
    }

    return cooldownMessage;
  };

  // Rendered label of the submit button, reused to derive its accessible name.
  const submitLabel =
    isCooldownActive && timeRemainingSeconds > 0
      ? intl.formatMessage(
          { id: 'app.withdraw.cooldownEndsIn', defaultMessage: 'Cooldown ends in {duration}' },
          { duration: formatDuration(timeRemainingSeconds) }
        )
      : buttonText;
  const submitAccessibleName =
    buttonState === 'submit'
      ? intl.formatMessage({ id: 'app.withdraw.submitToken', defaultMessage: 'Withdraw {symbol}' }, { symbol: tokenMeta.underlyingSymbol })
      : undefined;

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
              {intl.formatMessage({ id: 'app.withdraw.heading', defaultMessage: 'Withdraw' })}
            </Typography>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'app.withdraw.cooldownedAmount', defaultMessage: 'Cooldowned amount:' })}
            </Typography>
            <Typography id="stake-withdraw-status" variant="caption" color="text.secondary">
              {renderStatus()}
            </Typography>
          </Box>
          <Box sx={{ paddingRight: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }} />
        </Box>

        <Box component="span" id="stake-withdraw-token-label" sx={visuallyHidden}>
          {intl.formatMessage({ id: 'app.withdraw.tokenLabel', defaultMessage: 'Token to withdraw' })}
        </Box>
        <StyledSelect
          id="withdrawToken"
          name="withdrawToken"
          labelId="stake-withdraw-token-label"
          value={unstakeTokenAddress}
          onChange={(event) => handleTokenAddressChange(event.target.value as string)}
          variant="outlined"
          fullWidth
        >
          <MenuItem value={tokenOptions.SENA}>sENA</MenuItem>
          <MenuItem value={tokenOptions.SUSDE}>sUSDe</MenuItem>
        </StyledSelect>
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
          <Typography id="stake-withdrawable-label" variant="h4" component="p" fontWeight="normal">
            {intl.formatMessage({ id: 'app.withdraw.withdrawable', defaultMessage: 'Withdrawable' })}
          </Typography>
          <Typography id="stake-withdrawable-value" variant="h4" component="p" fontWeight="normal" textAlign="right">
            {formattedUnderlyingAmount} {tokenMeta.underlyingSymbol}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          onClick={handleWithdraw}
          disabled={isButtonDisabled}
          aria-label={submitAccessibleName}
          aria-describedby="stake-withdrawable-label stake-withdrawable-value stake-withdraw-status"
          sx={{
            height: '58px',
            width: '100%',
            marginTop: '20px',
            fontFamily: 'Roboto, Arial, sans-serif',
            fontSize: '18px',
            fontWeight: 700
          }}
        >
          {submitLabel}
        </Button>
      </Box>
    </Box>
  );
};

export default WithdrawTab;
