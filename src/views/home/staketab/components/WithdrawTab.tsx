import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { MenuItem, Typography } from '@mui/material';
import React, { useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';

import { useTheme } from '@mui/material/styles';
import { StyledSelect } from 'components/StyledSelect';
import { BalancesData } from 'hooks/useBalanceData';
import { useCooldownInfo } from '../hooks/useCooldownInfo';
import { useUnstakeTokenSelection } from '../hooks/useUnstakeTokenSelection';
import { useWithdrawTransactions } from '../hooks/useWithdrawTransactions';
import { useBalanceRefresh } from 'contexts/BalanceRefreshContext';

interface Props {
  balances: BalancesData;
}

const WithdrawTab = ({ balances }: Props) => {
  const theme = useTheme();
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

  const buttonText = useMemo(() => {
    if (withdrawTx.txState === 'submitting') return 'Preparing transaction...';
    if (withdrawTx.txState === 'submitted') return 'Withdrawing...';
    if (withdrawTx.txState === 'error') return 'Withdraw failed - retry';
    if (isCooldownActive) return 'Cooldown in progress';
    if (!underlyingAmount || underlyingAmount === 0n) return 'No funds to withdraw';
    return 'Withdraw';
  }, [isCooldownActive, underlyingAmount, withdrawTx.txState]);

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
              Withdraw
            </Typography>
            <Typography variant="body2">Cooldowned amount:</Typography>
            <Typography variant="caption" color="text.secondary">
              {renderStatus()}
            </Typography>
          </Box>
          <Box sx={{ paddingRight: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }} />
        </Box>

        <StyledSelect
          id="withdrawToken"
          name="withdrawToken"
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
          <Typography variant="h4" fontWeight="normal">
            Withdrawable
          </Typography>
          <Typography variant="h4" fontWeight="normal" textAlign="right">
            {formattedUnderlyingAmount} {tokenMeta.underlyingSymbol}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          onClick={handleWithdraw}
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
          {isCooldownActive && timeRemainingSeconds > 0 ? `Cooldown ends in ${formatDuration(timeRemainingSeconds)}` : buttonText}
        </Button>
      </Box>
    </Box>
  );
};

export default WithdrawTab;
