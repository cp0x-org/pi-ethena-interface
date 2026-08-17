import { Link as RouterLink } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { ReactComponent as Cp0xLogo } from '@/assets/images/cp0x-logo.svg';
// material-ui
import Link from '@mui/material/Link';

// project imports
import { DASHBOARD_PATH } from 'config';

// ==============================|| MAIN LOGO ||============================== //

export default function LogoSection() {
  const intl = useIntl();

  return (
    <Link
      component={RouterLink}
      to={DASHBOARD_PATH}
      aria-label={intl.formatMessage({ id: 'app.nav.logoHome', defaultMessage: 'Ethena Permissionless Interface by cp0x, home' })}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        // gap: 1.5,
        textDecoration: 'none'
      }}
    >
      {/* decorative: the link itself carries the accessible name */}
      <Cp0xLogo aria-hidden="true" focusable="false" style={{ width: 50, height: 30 }} />
      <img src="/ethena-logo.png" alt="" style={{ width: 70, marginLeft: -5 }} />
    </Link>
  );
}
