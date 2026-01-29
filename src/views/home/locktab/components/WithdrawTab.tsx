import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { IconButton, MenuItem, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

interface Props {
  balances?: BalancesData;
}

const WithdrawTab = (_props: Props) => {
  const theme = useTheme();
  const { address: userAddress } = useAccount();
  const { config: chainConfig } = useConfigChainId();
  const { tokens, isLoading: isTokensLoading } = useLockTokenOptions({ includeZeroStakeLimit: true });
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

  const buttonText = useMemo(() => {
    if (!formattedAmount) return 'Enter amount';
    if (!isCooldownComplete) return `Cooldown ends in ${formatDuration(timeRemainingSeconds)}`;
    if (isAmountExceedsLimit) return 'Amount exceeds limit';
    if (parsedAmount && parsedAmount > coolingDownAmount) return 'Insufficient cooled balance';
    if (withdrawTx.txState === 'submitting' || withdrawTx.txState === 'submitted') return 'Withdrawing...';
    if (withdrawTx.txState === 'error') return 'Withdraw failed - retry';
    return 'Withdraw';
  }, [
    coolingDownAmount,
    formattedAmount,
    formatDuration,
    isAmountExceedsLimit,
    isCooldownComplete,
    parsedAmount,
    stakeLimit,
    timeRemainingSeconds,
    withdrawTx.txState
  ]);

  const isButtonDisabled = useMemo(() => {
    if (!formattedAmount || !parsedAmount || parsedAmount === 0n) return true;
    if (!userAddress) return true;
    if (!selectedTokenAddress) return true;
    if (isTokensLoading) return true;
    if (!canWithdraw) return true;
    if (withdrawTx.txState === 'submitting') return true;
    return false;
  }, [canWithdraw, formattedAmount, isTokensLoading, parsedAmount, selectedTokenAddress, userAddress, withdrawTx.txState]);

  const statusMessage = useMemo(() => {
    if (!isCooldownComplete) return `Cooldown ends in ${formatDuration(timeRemainingSeconds)}.`;
    if (withdrawTx.txState === 'submitted') return 'Withdraw submitted, waiting for confirmation...';
    if (withdrawTx.txState === 'error') return 'Withdraw failed, please retry.';
    return null;
  }, [formatDuration, isCooldownComplete, timeRemainingSeconds, withdrawTx.txState]);

  const renderStatus = () => {
    if (!statusMessage) return null;
    return (
      <Typography variant="body2" color="text.secondary">
        {statusMessage}
      </Typography>
    );
  };

  const renderTokenValue = () => {
    if (isTokensLoading) return 'Loading...';
    if (!selectedTokenAddress) return 'Select token';
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

  React.useEffect(() => {
    if (withdrawTx.txState === 'confirmed') {
      resetAmount();
      refetchAll();
    }
  }, [refetchAll, resetAmount, withdrawTx.txState]);

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
              Withdraw {selectedToken?.symbol ?? 'Token'}
            </Typography>
            <Typography variant="body2">Cooled down amount:</Typography>
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
            id="withdrawToken"
            name="withdrawToken"
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
          <Tooltip title={getTokenTooltip()} arrow>
            <IconButton onClick={handleCopyAddress} disabled={!selectedTokenAddress} size="small">
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
            onClick={() => handlePercentClick(25, coolingDownDisplay)}
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
            onClick={() => handlePercentClick(50, coolingDownDisplay)}
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
            onClick={() => handlePercentClick(75, coolingDownDisplay)}
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
            onClick={() => handlePercentClick(100, coolingDownDisplay)}
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
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            backgroundColor: theme.palette.background.paper,
            margin: '10px 0'
          }}
        >
          <Typography variant="h4" fontWeight="normal">
            Cooling down: {coolingDownDisplay} {selectedToken?.symbol ?? 'Token'}
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
          <Button variant="contained" fullWidth onClick={handleWithdraw} disabled={isButtonDisabled}>
            {buttonText}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default WithdrawTab;
