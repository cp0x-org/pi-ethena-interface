import Box from '@mui/material/Box';
import { Typography, Paper, Stack, useTheme, Card } from '@mui/material';
import Grid from '@mui/material/Grid';
import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { formatTokenBalance } from 'utils/formatters';
import { BalancesData } from 'hooks/useBalanceData';
import { useSenaStakeInfo } from 'views/home/locktab/hooks/useSenaStakeInfo';
import { useBalanceRefresh } from 'contexts/BalanceRefreshContext';
import { visuallyHidden } from 'utils/a11y';

interface Props {
  balances: BalancesData;
}
export default function SummarySection(props: Props) {
  const theme = useTheme();
  const intl = useIntl();
  const { registerStakeRefetch } = useBalanceRefresh();
  const balances = props.balances;
  const { stakedAmount, refetchAll } = useSenaStakeInfo();

  useEffect(() => {
    registerStakeRefetch(refetchAll);
  }, [registerStakeRefetch, refetchAll]);

  return (
    <Paper component="section" aria-labelledby="wallet-balances-heading">
      <Typography component="h2" id="wallet-balances-heading" sx={visuallyHidden}>
        {intl.formatMessage({ id: 'app.balances.heading', defaultMessage: 'Your Ethena token balances' })}
      </Typography>
      <Grid container spacing={2} sx={{ padding: '0px' }}>
        <Grid size={{ xs: 12, sm: 6 }} sx={{ padding: '0px' }}>
          <Card
            role="group"
            aria-labelledby="balance-usde-title"
            sx={{
              ...theme.applyStyles('dark', {
                bgcolor: 'background.default',
                border: 'none',
                borderRadius: '12px',
                padding: '20px'
              })
            }}
          >
            <Stack spacing={'30px'} sx={{ padding: '0px' }}>
              <Typography id="balance-usde-title" variant="h5" component="h3" sx={{ fontWeight: 400, height: '27px', marginBottom: '8px' }}>
                USDe
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Typography variant="h3" component="p" sx={{ color: theme.palette.grey[500] }}>
                  {formatTokenBalance(balances.usde)}
                </Typography>
                {/*{isChanged && futurePosition && (*/}
                {/*  <>*/}
                {/*    <ArrowRightAlt style={{ color: theme.palette.grey[500] }} />*/}
                {/*    <Typography variant="h3">*/}
                {/*      {futurePosition?.borrowAssets*/}
                {/*        ? futurePosition?.borrowAssets <= 0*/}
                {/*          ? '0'*/}
                {/*          : parseFloat(formatUnits(futurePosition?.borrowAssets, marketData.loanAsset?.decimals || 18)).toFixed(*/}
                {/*              4*/}
                {/*            )*/}
                {/*        : '0'}*/}
                {/*    </Typography>*/}
                {/*  </>*/}
                {/*)}*/}
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }} sx={{ padding: '0px' }}>
          <Card
            role="group"
            aria-labelledby="balance-susde-title"
            sx={{
              ...theme.applyStyles('dark', {
                bgcolor: 'background.default',
                border: 'none',
                borderRadius: '12px',
                padding: '20px'
              })
            }}
          >
            <Stack spacing={'30px'} sx={{ padding: '0px' }}>
              <Typography
                id="balance-susde-title"
                variant="h5"
                component="h3"
                sx={{ fontWeight: 400, height: '27px', marginBottom: '8px' }}
              >
                sUSDe
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Typography variant="h3" component="p" sx={{ color: theme.palette.grey[500] }}>
                  {formatTokenBalance(balances.susde)}
                </Typography>
                {/*{isChanged && futurePosition && (*/}
                {/*  <>*/}
                {/*    <ArrowRightAlt style={{ color: theme.palette.grey[500] }} />*/}
                {/*    <Typography variant="h3">*/}
                {/*      {futurePosition?.collateral*/}
                {/*        ? futurePosition?.collateral <= 0*/}
                {/*          ? '0'*/}
                {/*          : parseFloat(*/}
                {/*              formatUnits(futurePosition?.collateral, marketData.collateralAsset?.decimals || 18)*/}
                {/*            ).toFixed(4)*/}
                {/*        : '0'}*/}
                {/*    </Typography>*/}
                {/*  </>*/}
                {/*)}*/}
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Card
            role="group"
            aria-labelledby="balance-ena-title"
            sx={{
              ...theme.applyStyles('dark', {
                bgcolor: 'background.default',
                border: 'none',
                borderRadius: '12px',
                padding: '20px'
              })
            }}
          >
            <Stack spacing={'30px'} sx={{ padding: '0px' }}>
              <Typography id="balance-ena-title" variant="h5" component="h3" sx={{ fontWeight: 400, height: '27px', marginBottom: '8px' }}>
                ENA
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Typography variant="h3" component="p" sx={{ color: theme.palette.grey[500] }}>
                  {formatTokenBalance(balances.ena)}
                </Typography>
                {/*{isChanged && futurePosition && (*/}
                {/*  <>*/}
                {/*    <ArrowRightAlt style={{ color: theme.palette.grey[500] }} />*/}
                {/*    <Typography variant="h3">*/}
                {/*      {futurePosition?.ltv*/}
                {/*        ? futurePosition?.ltv <= 0*/}
                {/*          ? '0'*/}
                {/*          : (parseFloat(formatUnits(futurePosition?.ltv, 18)) * 100).toFixed(2)*/}
                {/*        : '0'}*/}
                {/*    </Typography>*/}
                {/*  </>*/}
                {/*)}*/}
              </Box>
            </Stack>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card
            role="group"
            aria-labelledby="balance-sena-title"
            sx={{
              ...theme.applyStyles('dark', {
                bgcolor: 'background.default',
                border: 'none',
                borderRadius: '12px',
                padding: '20px'
              })
            }}
          >
            <Stack spacing={'0px'} sx={{ padding: '0px' }}>
              <Typography id="balance-sena-title" variant="h5" component="h3" sx={{ fontWeight: 400, height: '27px', marginBottom: '8px' }}>
                sENA
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
                  <Box
                    role="group"
                    aria-labelledby="balance-sena-locked-label"
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' }}
                  >
                    <Typography id="balance-sena-locked-label" variant="body2" sx={{ color: theme.palette.grey[500] }}>
                      {intl.formatMessage({ id: 'app.balances.locked', defaultMessage: 'Locked' })}
                    </Typography>
                    <Typography variant="h3" component="p" sx={{ color: theme.palette.grey[500] }}>
                      {formatTokenBalance(stakedAmount)}
                    </Typography>
                  </Box>
                  <Box
                    role="group"
                    aria-labelledby="balance-sena-unlocked-label"
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' }}
                  >
                    <Typography id="balance-sena-unlocked-label" variant="body2" sx={{ color: theme.palette.grey[500] }}>
                      {intl.formatMessage({ id: 'app.balances.unlocked', defaultMessage: 'Unlocked' })}
                    </Typography>
                    <Typography variant="h3" component="p" sx={{ color: theme.palette.grey[500] }}>
                      {formatTokenBalance(balances.sena)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
}
