import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useIntl } from 'react-intl';

// material-ui
import { Box, IconButton, Drawer, List, ListItemButton, ListItemText, Typography, useTheme } from '@mui/material';
import { IconMenu2, IconX } from '@tabler/icons-react';

// types
interface MobileMenuItemProps {
  title: string;
  path?: string;
  isExternal?: boolean;
}

const MobileMenu = () => {
  const theme = useTheme();
  const intl = useIntl();
  const [open, setOpen] = useState(false);

  const handleToggleDrawer = () => {
    setOpen(!open);
  };

  const menuItems: MobileMenuItemProps[] = [
    {
      title: intl.formatMessage({ id: 'app.nav.home', defaultMessage: 'Home' }),
      path: '/',
      isExternal: false
    },
    {
      title: intl.formatMessage({ id: 'app.nav.permissionlessInterfaces', defaultMessage: 'Permissionless Interfaces' }),
      path: 'https://pi.cp0x.com',
      isExternal: false
    },
    {
      title: intl.formatMessage({ id: 'app.nav.referrals', defaultMessage: 'cp0x Referrals' }),
      path: 'https://cp0x.com',
      isExternal: true
    }
  ];

  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <IconButton
        color="inherit"
        onClick={handleToggleDrawer}
        edge="start"
        size="large"
        aria-label={
          open
            ? intl.formatMessage({ id: 'app.nav.closeMenu', defaultMessage: 'Close navigation menu' })
            : intl.formatMessage({ id: 'app.nav.openMenu', defaultMessage: 'Open navigation menu' })
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? 'mobile-navigation-drawer' : undefined}
      >
        <IconMenu2 aria-hidden="true" />
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={handleToggleDrawer}
        PaperProps={{
          id: 'mobile-navigation-drawer',
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': 'mobile-navigation-title',
          sx: {
            width: '280px',
            background: theme.palette.background.default
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography id="mobile-navigation-title" variant="h6" component="h2">
            {intl.formatMessage({ id: 'app.nav.menu', defaultMessage: 'Menu' })}
          </Typography>
          <IconButton
            color="inherit"
            onClick={handleToggleDrawer}
            edge="end"
            size="small"
            aria-label={intl.formatMessage({ id: 'app.nav.closeMenu', defaultMessage: 'Close navigation menu' })}
          >
            <IconX aria-hidden="true" />
          </IconButton>
        </Box>

        <List
          component="nav"
          aria-label={intl.formatMessage({ id: 'app.nav.mobile', defaultMessage: 'Mobile' })}
          sx={{ px: 2, pt: 1 }}
        >
          {menuItems.map((item) => (
            <React.Fragment key={item.title}>
              {item.isExternal ? (
                <ListItemButton
                  component="a"
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={intl.formatMessage(
                    { id: 'app.nav.newTab', defaultMessage: '{label} (opens in a new tab)' },
                    { label: item.title }
                  )}
                  onClick={handleToggleDrawer}
                >
                  <ListItemText primary={item.title} />
                </ListItemButton>
              ) : (
                <ListItemButton component={RouterLink} to={item.path || '#'} onClick={handleToggleDrawer}>
                  <ListItemText primary={item.title} />
                </ListItemButton>
              )}
            </React.Fragment>
          ))}
        </List>
      </Drawer>
    </Box>
  );
};

export default MobileMenu;
