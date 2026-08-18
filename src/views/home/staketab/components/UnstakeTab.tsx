import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { MenuItem, SelectChangeEvent, Typography } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useAccount, useChainId, useReadContract, useSwitchChain } from 'wagmi';

import { useTheme } from '@mui/material/styles';
import { CustomInput } from 'components/CustomInput';
import { StyledSelect } from 'components/StyledSelect';
import { BalancesData } from 'hooks/useBalanceData';
import { formatTokenBalance } from 'utils/formatters';
import { usdeOftConfig } from '@/appconfig/abi/UsdeOft';
import { useStakeAmount } from '../hooks/useStakeAmount';
import { useUnstakeTokenSelection } from '../hooks/useUnstakeTokenSelection';
import { useUnstakeTransactions } from '../hooks/useUnstakeTransactions';
import { getActiveStakeNetworks, getStakeNetworkByKey, type StakeNetwork } from '../stakeNetworks';
import { StakedUSDeOFTAdapter } from '@/appconfig';
import { useBalanceRefresh } from 'contexts/BalanceRefreshContext';
import { describedBy, visuallyHidden } from 'utils/a11y';

interface Props {
  balances: BalancesData;
}

const ETHEREUM_CHAIN_ID = 1;

const UnstakeTab = ({ balances }: Props) => {
  const theme = useTheme();
  const intl = useIntl();
  const { address: userAddress } = useAccount();
  const activeChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { refetchBalances } = useBalanceRefresh();
  const activeStakeNetworks = useMemo(() => getActiveStakeNetworks(), []);
  const [unstakeNetwork, setUnstakeNetwork] = useState<StakeNetwork>(() => activeStakeNetworks[0]?.key ?? 'avalanche');

  const { tokenMeta, selectedBalanceDisplay, unstakeTokenAddress, handleTokenAddressChange, tokenOptions } =
    useUnstakeTokenSelection(balances);

  const stakeNetworkByKey = useMemo(() => getStakeNetworkByKey(), []);
  const defaultStakeNetwork = activeStakeNetworks[0];
  const activeUnstakeNetwork = stakeNetworkByKey[unstakeNetwork];
  const isLayerZeroSusde = tokenMeta.token === 'SUSDE' && unstakeNetwork !== 'ethereum';

  // Use StakedUSDeOFTAdapter for balance on L2 as requested
  const layerZeroBalanceAddress = (StakedUSDeOFTAdapter ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;
  const hasLayerZeroBalance = Boolean(isLayerZeroSusde && userAddress && activeUnstakeNetwork?.chainId);
  const { data: layerZeroBalance } = useReadContract({
    abi: usdeOftConfig.abi,
    address: layerZeroBalanceAddress,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    chainId: activeUnstakeNetwork?.chainId,
    query: { enabled: hasLayerZeroBalance }
  });

  const effectiveBalance = useMemo(() => {
    if (isLayerZeroSusde) return (layerZeroBalance as bigint | undefined) ?? 0n;
    return tokenMeta.balance;
  }, [isLayerZeroSusde, layerZeroBalance, tokenMeta.balance]);

  const balanceDisplay = useMemo(() => formatTokenBalance(effectiveBalance), [effectiveBalance]);

  const { formattedAmount, activePercentage, parsedAmount, handleAmountChange, handlePercentClick, resetAmount, amountInput } =
    useStakeAmount('');

  const handleUnstakeConfirmed = useCallback(() => {
    resetAmount();
    // Only refetch balances for Ethereum unstaking, not LayerZero
    if (unstakeNetwork === 'ethereum') {
      refetchBalances();
    }
  }, [resetAmount, unstakeNetwork, refetchBalances]);

  const { handleUnstake, unstakeTx, isTransactionInProgress, statusMessage, resetTransactions, internalAmount, isInternalAmountLoading } =
    useUnstakeTransactions({
      tokenMeta,
      parsedAmount,
      unstakeNetwork,
      userAddress,
      onUnstakeConfirmed: handleUnstakeConfirmed
    });

  const isAmountExceedsBalance = useMemo(() => {
    if (!parsedAmount) return false;
    return parsedAmount > effectiveBalance;
  }, [effectiveBalance, parsedAmount]);

  const internalAmountDisplay = useMemo(() => {
    if (tokenMeta.token !== 'SUSDE') return null;
    if (!parsedAmount || parsedAmount === 0n) return '--';
    if (isInternalAmountLoading) return '...';
    if (internalAmount === null) return '--';
    return formatTokenBalance(internalAmount);
  }, [internalAmount, isInternalAmountLoading, parsedAmount, tokenMeta.token]);

  // Ticker as it is spelled in the UI, used for labels only.
  const tokenLabel = tokenMeta.token === 'SUSDE' ? 'sUSDe' : 'sENA';

  // The button state is derived separately from its label so that translated copy
  // never has to be compared against English literals.
  const buttonState = useMemo(() => {
    if (!formattedAmount) return 'enterAmount' as const;
    if (isAmountExceedsBalance) return 'insufficientBalance' as const;
    if (unstakeTx.txState === 'submitting' || unstakeTx.txState === 'submitted') return 'unstaking' as const;
    if (unstakeTx.txState === 'error') return 'retry' as const;
    return 'submit' as const;
  }, [unstakeTx.txState, formattedAmount, isAmountExceedsBalance]);

  const buttonText = useMemo(() => {
    switch (buttonState) {
      case 'enterAmount':
        return intl.formatMessage({ id: 'app.common.enterAmount', defaultMessage: 'Enter amount' });
      case 'insufficientBalance':
        return intl.formatMessage({ id: 'app.common.insufficientBalance', defaultMessage: 'Insufficient balance' });
      case 'unstaking':
        return intl.formatMessage({ id: 'app.unstake.unstaking', defaultMessage: 'Unstaking...' });
      case 'retry':
        return intl.formatMessage({ id: 'app.unstake.retry', defaultMessage: 'Unstake failed - retry' });
      default:
        return intl.formatMessage({ id: 'app.unstake.submit', defaultMessage: 'Unstake' });
    }
  }, [buttonState, intl]);

  const isButtonDisabled = useMemo(() => {
    if (!formattedAmount || !parsedAmount || parsedAmount === 0n) return true;
    if (!userAddress) return true;
    if (isAmountExceedsBalance) return true;
    if (isTransactionInProgress) return true;
    return false;
  }, [formattedAmount, isAmountExceedsBalance, isTransactionInProgress, parsedAmount, userAddress]);

  const isStatusError = unstakeTx.txState === 'error';

  const amountDescribedBy = describedBy('unstake-balance-value', tokenMeta.token === 'SUSDE' ? 'unstake-receive' : null, 'unstake-status');

  const submitAccessibleName =
    buttonState === 'submit'
      ? intl.formatMessage({ id: 'app.unstake.submitToken', defaultMessage: 'Unstake {symbol}' }, { symbol: tokenLabel })
      : undefined;

  // Always-rendered live region so transaction updates reach assistive tech.
  const renderStatus = () => (
    <Typography
      key={isStatusError ? 'alert' : 'status'}
      id="unstake-status"
      role={isStatusError ? 'alert' : 'status'}
      variant="body2"
      color="text.secondary"
    >
      {statusMessage ?? ''}
    </Typography>
  );

  const switchToChain = useCallback(
    async (targetChainId: number) => {
      if (!switchChainAsync) return;
      if (activeChainId === targetChainId) return;
      try {
        await switchChainAsync({ chainId: targetChainId });
      } catch (error) {
        console.warn('Network switch rejected', error);
      }
    },
    [activeChainId, switchChainAsync]
  );

  useEffect(() => {
    if (tokenMeta.token !== 'SUSDE') return;
    if (!defaultStakeNetwork) return;
    if (activeUnstakeNetwork) return;
    setUnstakeNetwork(defaultStakeNetwork.key);
    switchToChain(defaultStakeNetwork.chainId);
  }, [activeUnstakeNetwork, defaultStakeNetwork, switchToChain, tokenMeta.token]);

  const handleChangeUnstakeToken = useCallback(
    (event: SelectChangeEvent<any>) => {
      const nextAddress = event.target.value as string;
      handleTokenAddressChange(nextAddress);
      resetTransactions();
      const isSena = nextAddress.toLowerCase() === tokenOptions.SENA.toLowerCase();
      if (isSena) {
        setUnstakeNetwork('ethereum');
        switchToChain(ETHEREUM_CHAIN_ID);
        return;
      }
      if (defaultStakeNetwork) {
        setUnstakeNetwork(defaultStakeNetwork.key);
        switchToChain(defaultStakeNetwork.chainId);
      }
    },
    [defaultStakeNetwork, handleTokenAddressChange, resetTransactions, switchToChain, tokenOptions.SENA]
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
              {intl.formatMessage({ id: 'app.unstake.heading', defaultMessage: 'Unstake' })}
            </Typography>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'app.unstake.cooldownShares', defaultMessage: 'Cooldown shares:' })}
            </Typography>
          </Box>
          <Box sx={{ paddingRight: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }} />
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
                { id: 'app.unstake.amountInput', defaultMessage: 'Amount of {symbol} to unstake' },
                { symbol: tokenLabel }
              ),
              'aria-describedby': amountDescribedBy,
              'aria-invalid': isAmountExceedsBalance || undefined
            }}
            sx={{ flex: 1 }}
          />
          <Box component="span" id="unstake-token-label" sx={visuallyHidden}>
            {intl.formatMessage({ id: 'app.unstake.tokenLabel', defaultMessage: 'Token to unstake' })}
          </Box>
          <StyledSelect
            id="unstakeToken"
            name="unstakeToken"
            labelId="unstake-token-label"
            value={unstakeTokenAddress}
            onChange={handleChangeUnstakeToken}
            variant="outlined"
          >
            <MenuItem value={tokenOptions.SENA}>sENA</MenuItem>
            <MenuItem value={tokenOptions.SUSDE}>sUSDe</MenuItem>
          </StyledSelect>
        </Box>
        {tokenMeta.token === 'SUSDE' && (
          <Box
            id="unstake-receive"
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ id: 'app.unstake.youReceive', defaultMessage: 'You receive (USDe)' })}
            </Typography>
            <Typography variant="body2" color="text.main">
              {internalAmountDisplay} USDe
            </Typography>
          </Box>
        )}

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
            onClick={() => handlePercentClick(25, effectiveBalance)}
            aria-pressed={activePercentage === 25}
            aria-label={intl.formatMessage(
              { id: 'app.common.percentOfBalance', defaultMessage: '{percent}% of available {symbol} balance' },
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
            onClick={() => handlePercentClick(50, effectiveBalance)}
            aria-pressed={activePercentage === 50}
            aria-label={intl.formatMessage(
              { id: 'app.common.percentOfBalance', defaultMessage: '{percent}% of available {symbol} balance' },
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
            onClick={() => handlePercentClick(75, effectiveBalance)}
            aria-pressed={activePercentage === 75}
            aria-label={intl.formatMessage(
              { id: 'app.common.percentOfBalance', defaultMessage: '{percent}% of available {symbol} balance' },
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
            onClick={() => handlePercentClick(100, effectiveBalance)}
            aria-pressed={activePercentage === 100}
            aria-label={intl.formatMessage(
              { id: 'app.common.maxOfBalance', defaultMessage: 'Max available {symbol} balance' },
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
            justifyContent: 'space-between',
            width: '100%',
            backgroundColor: theme.palette.background.paper,
            margin: '10px 0'
          }}
        >
          <Typography id="unstake-balance-value" variant="h4" component="p" fontWeight="normal">
            {intl.formatMessage(
              { id: 'app.common.balance', defaultMessage: 'Balance: {amount} {symbol}' },
              { amount: balanceDisplay, symbol: tokenMeta.token }
            )}
          </Typography>
          {renderStatus()}
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleUnstake}
          disabled={isButtonDisabled}
          aria-label={submitAccessibleName}
          aria-describedby="unstake-balance-value unstake-status"
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

export default UnstakeTab;
