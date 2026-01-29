import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { IconButton, MenuItem, SelectChangeEvent, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { formatTokenBalance } from 'utils/formatters';

import { useTheme } from '@mui/material/styles';
import { CustomInput } from 'components/CustomInput';
import { BalancesData } from 'hooks/useBalanceData';
import { useConfigChainId } from 'hooks/useConfigChainId';
import { useStakeAmount } from '../../staketab/hooks/useStakeAmount';
import { useWriteTransaction } from 'hooks/useWriteTransaction';
import { enaLpStakingConfig } from '@/appconfig/abi/EnaLpStaking';
import { StyledSelect } from 'components/StyledSelect';
import { useLockTokenOptions } from '../hooks/useLockTokenOptions';
import { useStakeInfoByToken } from '../hooks/useStakeInfoByToken';
import { LP_TOKEN_NAMES } from '@/appconfig';
import { useBalanceRefresh } from 'contexts/BalanceRefreshContext';
import { dispatchSuccess, dispatchError } from 'utils/snackbar';

interface Props {
  balances: BalancesData;
}

const UnlockTab = (_props: Props) => {
  const theme = useTheme();
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

  const { stakedAmount, refetchAll, stakeLimit } = useStakeInfoByToken(selectedTokenAddress ?? undefined);

  const stakingAddress = chainConfig.contracts.ENA_LP_STAKING as `0x${string}`;

  const { formattedAmount, activePercentage, parsedAmount, handleAmountChange, handlePercentClick, resetAmount } = useStakeAmount('');

  const unlockTx = useWriteTransaction();

  const stakedDisplay = useMemo(() => formatTokenBalance(stakedAmount), [stakedAmount]);

  const isAmountExceedsStaked = useMemo(() => {
    if (!parsedAmount) return false;
    return parsedAmount > stakedAmount;
  }, [parsedAmount, stakedAmount]);

  const isAmountExceedsLimit = useMemo(() => {
    if (!parsedAmount) return false;
    if (stakeLimit === 0n) return false;
    return parsedAmount > stakeLimit;
  }, [parsedAmount, stakeLimit]);

  const buttonText = useMemo(() => {
    if (!formattedAmount) return 'Enter amount';
    if (stakeLimit === 0n) return 'Unlocking disabled';
    if (isAmountExceedsLimit) return 'Amount exceeds limit';
    if (isAmountExceedsStaked) return 'Insufficient staked balance';
    if (unlockTx.txState === 'submitting' || unlockTx.txState === 'submitted') return 'Unlocking...';
    if (unlockTx.txState === 'error') return 'Unlock failed - retry';
    return 'Unlock';
  }, [formattedAmount, isAmountExceedsLimit, isAmountExceedsStaked, stakeLimit, unlockTx.txState]);

  const isButtonDisabled = useMemo(() => {
    if (!formattedAmount || !parsedAmount || parsedAmount === 0n) return true;
    if (!userAddress) return true;
    if (!selectedTokenAddress) return true;
    if (isTokensLoading) return true;
    if (stakeLimit === 0n) return true;
    if (isAmountExceedsLimit) return true;
    if (isAmountExceedsStaked) return true;
    if (unlockTx.txState === 'submitting' || unlockTx.txState === 'submitted') return true;
    return false;
  }, [
    formattedAmount,
    isAmountExceedsLimit,
    isAmountExceedsStaked,
    isTokensLoading,
    parsedAmount,
    selectedTokenAddress,
    stakeLimit,
    unlockTx.txState,
    userAddress
  ]);

  const statusMessage = useMemo(() => {
    if (unlockTx.txState === 'submitted') return 'Unlock submitted, waiting for confirmation...';
    if (unlockTx.txState === 'error') return 'Unlock failed, please retry.';
    return null;
  }, [unlockTx.txState]);

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

  const handleUnlock = async () => {
    if (!parsedAmount || !userAddress || !selectedTokenAddress) return;

    await unlockTx.sendTransaction({
      abi: enaLpStakingConfig.abi,
      address: stakingAddress,
      functionName: 'unstake',
      args: [selectedTokenAddress, parsedAmount]
    });
  };

  const prevUnlockTxState = useRef(unlockTx.txState);
  React.useEffect(() => {
    if (prevUnlockTxState.current !== unlockTx.txState) {
      if (unlockTx.txState === 'confirmed') {
        dispatchSuccess('Unlock confirmed');
        resetAmount();
        refetchAll();
        refetchBalances();
      } else if (unlockTx.txState === 'error') {
        dispatchError('Unlock failed');
      }
      prevUnlockTxState.current = unlockTx.txState;
    }
  }, [refetchAll, resetAmount, unlockTx.txState, refetchBalances]);

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
              Unlock {selectedToken?.symbol ?? 'Token'}
            </Typography>
            <Typography variant="body2">Cooldown shares:</Typography>
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
            id="unlockToken"
            name="unlockToken"
            value={selectedTokenAddress ?? ''}
            onChange={(event: SelectChangeEvent<unknown>) => setSelectedTokenAddress(event.target.value as `0x${string}`)}
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
            onClick={() => handlePercentClick(25, stakedAmount)}
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
            onClick={() => handlePercentClick(50, stakedAmount)}
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
            onClick={() => handlePercentClick(75, stakedAmount)}
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
            onClick={() => handlePercentClick(100, stakedAmount)}
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
            Staked: {stakedDisplay} {selectedToken?.symbol ?? 'Token'}
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
          <Button variant="contained" fullWidth onClick={handleUnlock} disabled={isButtonDisabled}>
            {buttonText}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default UnlockTab;
