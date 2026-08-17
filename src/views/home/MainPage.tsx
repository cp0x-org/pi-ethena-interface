import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';

import Box from '@mui/material/Box';
import { Typography, CircularProgress, Paper, Stack, useTheme, Card, Tabs, Tab } from '@mui/material';
import Grid from '@mui/material/Grid';
import TabPanel from './components/TabPanel';
import React, { useEffect, useState } from 'react';
import { useChainId } from 'wagmi';
import { useBalanceData } from 'hooks/useBalanceData';
import StakeActionForms from 'views/home/staketab/StakeActionForms';
import LockActionForms from 'views/home/locktab/LockActionForms';
import SummarySection from 'views/home/info/Summary';
import { BalanceRefreshProvider } from 'contexts/BalanceRefreshContext';
import { visuallyHidden } from 'utils/a11y';

export default function MainPage() {
  const theme = useTheme();
  const intl = useIntl();
  const [tabValue, setTabValue] = useState(0);
  const chainId = useChainId();
  const isEthereum = chainId === 1;
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const { balances, isLoading, refetchBalances } = useBalanceData();
  useEffect(() => {
    if (!isEthereum && tabValue !== 0) {
      setTabValue(0);
    }
  }, [isEthereum, tabValue]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }} role="status">
        <CircularProgress
          aria-label={intl.formatMessage({ id: 'app.common.loadingBalances', defaultMessage: 'Loading wallet balances' })}
        />
      </Box>
    );
  }
  console.log('balances');
  console.log(balances);

  return (
    <BalanceRefreshProvider refetchBalances={refetchBalances}>
      <Box sx={{ padding: '16px 0px' }}>
        <Typography component="h1" sx={visuallyHidden}>
          {intl.formatMessage({ id: 'app.page.title', defaultMessage: 'Ethena Permissionless Interface' })}
        </Typography>
        <Paper sx={{ padding: 0, marginBottom: 3 }}>
          <Grid container spacing={12.5}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Grid size={{ xs: 12 }}>
                <SummarySection balances={balances} />
              </Grid>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  aria-label={intl.formatMessage({ id: 'app.page.products', defaultMessage: 'Ethena products' })}
                  sx={{
                    height: '58px',
                    minHeight: '58px',
                    borderColor: 'black',
                    width: '100%',
                    '& .MuiTabs-flexContainer': {
                      border: 0,
                      height: '100%',
                      width: '100%'
                    }
                  }}
                >
                  <Tab
                    label={intl.formatMessage({ id: 'app.page.tab.staking', defaultMessage: 'Staking' })}
                    id="product-tab-0"
                    aria-controls="product-tabpanel-0"
                    sx={{ height: '100%', flex: 1 }}
                  />
                  {isEthereum && (
                    <Tab
                      label={intl.formatMessage({ id: 'app.page.tab.locking', defaultMessage: 'Locking' })}
                      id="product-tab-1"
                      aria-controls="product-tabpanel-1"
                      sx={{ height: '100%', flex: 1 }}
                    />
                  )}
                </Tabs>
              </Box>

              <TabPanel idPrefix="product" value={tabValue} index={0} sx={{ bgcolor: theme.palette.background.paper }}>
                <StakeActionForms balances={balances} />{' '}
              </TabPanel>
              {isEthereum && (
                <TabPanel idPrefix="product" value={tabValue} index={1} sx={{ bgcolor: theme.palette.background.paper }}>
                  <LockActionForms balances={balances} />{' '}
                </TabPanel>
              )}
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </BalanceRefreshProvider>
  );
}
