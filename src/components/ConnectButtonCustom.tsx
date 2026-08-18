import { ConnectButton } from '@rainbow-me/rainbowkit';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { useIntl } from 'react-intl';
import '@rainbow-me/rainbowkit/styles.css';
// Styled wrapper for the ConnectButton
const StyledConnectButtonWrapper = styled(Box)(({ theme }) => ({
  '& button': {
    fontFamily: theme.typography.fontFamily,
    fontWeight: 500,
    borderRadius: `${theme.shape.borderRadius}px`,
    transition: 'all 0.2s ease-in-out'
  }
}));

interface ConnectButtonCustomProps {
  showBalance?: boolean;
  chainStatus?: 'full' | 'icon' | 'name' | 'none';
  accountStatus?: 'full' | 'avatar' | 'address' | 'none';
  label?: string;
}

const ConnectButtonCustom = ({ showBalance = false, chainStatus = 'icon', accountStatus = 'full', label }: ConnectButtonCustomProps) => {
  const intl = useIntl();
  const connectLabel = label ?? intl.formatMessage({ id: 'app.wallet.connect', defaultMessage: 'Connect Wallet' });
  const groupLabel = intl.formatMessage({ id: 'app.wallet.group', defaultMessage: 'Wallet connection' });

  return (
    <StyledConnectButtonWrapper role="group" aria-label={groupLabel}>
      <ConnectButton chainStatus={chainStatus} showBalance={showBalance} label={connectLabel} />
    </StyledConnectButtonWrapper>
  );
};

export default ConnectButtonCustom;
