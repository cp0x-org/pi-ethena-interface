// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';

// third party
import { useIntl } from 'react-intl';

// project imports
import LogoSection from '../LogoSection';
import ConnectButtonCustom from 'components/ConnectButtonCustom';
import LanguageSwitcher from 'components/LanguageSwitcher';
import HeaderMenu from './HeaderMenu';

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

export default function Header() {
  const theme = useTheme();
  const intl = useIntl();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <>
      {/* logo & toggler button */}
      <Box sx={{ width: downMD ? 'auto' : 228, display: 'flex' }}>
        <Box component="span" sx={{ display: { xs: 'block', md: 'block' }, flexGrow: 1 }}>
          <LogoSection />
        </Box>
      </Box>

      {/*menu */}
      <Box
        component="nav"
        aria-label={intl.formatMessage({ id: 'app.nav.main', defaultMessage: 'Main' })}
        sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-start' }}
      >
        <HeaderMenu />
      </Box>
      {/* language switcher & connect wallet */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LanguageSwitcher />
        <Box sx={{ display: { lg: 'block' } }}>
          <ConnectButtonCustom chainStatus="icon" showBalance={false} />
        </Box>
      </Box>
    </>
  );
}
