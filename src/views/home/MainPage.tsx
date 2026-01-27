import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import { Typography, CircularProgress, Paper, Stack, useTheme, Card, Tabs, Tab } from '@mui/material';
import Grid from '@mui/material/Grid';
import TabPanel from './components/TabPanel';
import React, { useState } from 'react';
import { useBalanceData } from 'hooks/useBalanceData';
import StakeActionForms from 'views/home/staketab/StakeActionForms';
import LockActionForms from 'views/home/locktab/LockActionForms';
import SummarySection from 'views/home/info/Summary';

export default function MainPage() {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const { balances, isLoading } = useBalanceData();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  console.log('balances');
  console.log(balances);

  return (
    <Box sx={{ padding: '16px 0px' }}>
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
                aria-label="tabs"
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
                <Tab label="Staking" id="market-tab-0" aria-controls="market-tabpanel-0" sx={{ height: '100%', flex: 1 }} />
                <Tab label="Locking" id="market-tab-1" aria-controls="market-tabpanel-2" sx={{ height: '100%', flex: 1 }} />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0} sx={{ bgcolor: theme.palette.background.paper }}>
              <StakeActionForms balances={balances} />{' '}
            </TabPanel>
            <TabPanel value={tabValue} index={1} sx={{ bgcolor: theme.palette.background.paper }}>
              <LockActionForms balances={balances} />{' '}
            </TabPanel>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
