import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';

// material-ui
import { Box, Button, Stack, Theme, useMediaQuery, useTheme } from '@mui/material';

// Menu button styling as an object for reuse
const menuButtonStyle = (theme: Theme) => ({
  color: theme.palette.text.primary,
  fontWeight: 500,
  fontSize: '15px',
  textTransform: 'none',
  padding: '6px 16px',
  borderRadius: '8px',
  '&:hover': {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.main
  }
});

const MenuItems = () => {
  const theme = useTheme();
  const intl = useIntl();
  const matchDownMd = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const referralsLabel = intl.formatMessage({ id: 'app.nav.referrals', defaultMessage: 'cp0x Referrals' });

  // `/` redirects to `/stake`, so both paths render the page this link points at.
  const isHomeCurrent = location.pathname === '/' || location.pathname.startsWith('/stake');

  if (matchDownMd) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
      <Stack direction="row" spacing={1}>
        {/* Internal link using RouterLink */}
        <Button component={RouterLink} to="/" aria-current={isHomeCurrent ? 'page' : undefined} sx={menuButtonStyle(theme)}>
          {intl.formatMessage({ id: 'app.nav.home', defaultMessage: 'Home' })}
        </Button>

        {/* External links using anchor tags */}
        <Button href="https://pi.cp0x.com" rel="noopener noreferrer" sx={menuButtonStyle(theme)}>
          {intl.formatMessage({ id: 'app.nav.permissionlessInterfaces', defaultMessage: 'Permissionless Interfaces' })}
        </Button>

        <Button
          href="https://cp0x.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={intl.formatMessage(
            { id: 'app.nav.newTab', defaultMessage: '{label} (opens in a new tab)' },
            { label: referralsLabel }
          )}
          sx={menuButtonStyle(theme)}
        >
          {referralsLabel}
        </Button>
      </Stack>
    </Box>
  );
};

export default MenuItems;
