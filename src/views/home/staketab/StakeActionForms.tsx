import Box from '@mui/material/Box';
import { Typography, Paper, Tabs, Tab } from '@mui/material';
import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useIntl } from 'react-intl';
import { TabPanel, StakeTab, UnstakeTab, WithdrawTab } from './components';
import { useTheme } from '@mui/material/styles';
import { BalancesData } from 'hooks/useBalanceData';

interface Props {
  balances: BalancesData;
}

export default function StakeActionForms(props: Props) {
  const theme = useTheme();
  const intl = useIntl();
  const [tabValue, setTabValue] = useState(0);
  const { address: userAddress } = useAccount();
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!userAddress) {
    return (
      <Box sx={{ padding: 2 }}>
        <Typography variant="h5" component="p" color="error" role="status">
          {intl.formatMessage({ id: 'app.wallet.connectToContinue', defaultMessage: 'Connect wallet to continue.' })}
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ mb: 3, backgroundColor: 'background.default' }}>
      <Box sx={{ padding: '12px 12px 0 12px' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label={intl.formatMessage({ id: 'app.stake.actions', defaultMessage: 'Staking actions' })}
          variant="fullWidth"
          sx={{
            minHeight: '40px',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: '8px',
            '& .MuiTabs-flexContainer': {
              height: '100%'
            },
            '& .MuiTabs-indicator': {
              height: '100%',
              borderRadius: '6px',
              backgroundColor: theme.palette.background.paper,
              zIndex: 0
            },
            '& .MuiTab-root': {
              minHeight: '40px',
              fontSize: '0.875rem',
              textTransform: 'none',
              fontWeight: 500,
              color: theme.palette.text.secondary,
              zIndex: 1,
              transition: 'color 0.2s',
              '&.Mui-selected': {
                color: theme.palette.text.primary
              }
            }
          }}
        >
          <Tab
            label={intl.formatMessage({ id: 'app.stake.tab.stake', defaultMessage: 'Stake' })}
            id="stake-action-tab-0"
            aria-controls="stake-action-tabpanel-0"
          />
          <Tab
            label={intl.formatMessage({ id: 'app.stake.tab.unstake', defaultMessage: 'Unstake' })}
            id="stake-action-tab-1"
            aria-controls="stake-action-tabpanel-1"
          />
          <Tab
            label={intl.formatMessage({ id: 'app.stake.tab.withdraw', defaultMessage: 'Withdraw' })}
            id="stake-action-tab-2"
            aria-controls="stake-action-tabpanel-2"
          />
        </Tabs>
      </Box>

      <TabPanel idPrefix="stake-action" value={tabValue} index={0} sx={{ bgcolor: theme.palette.background.paper }}>
        <StakeTab balances={props.balances} />
      </TabPanel>

      <TabPanel idPrefix="stake-action" value={tabValue} index={1} sx={{ bgcolor: theme.palette.background.paper }}>
        <UnstakeTab balances={props.balances} />
      </TabPanel>

      <TabPanel idPrefix="stake-action" value={tabValue} index={2} sx={{ bgcolor: theme.palette.background.paper }}>
        <WithdrawTab balances={props.balances} />
      </TabPanel>
    </Paper>
  );
}
