import { ReactNode } from 'react';
import { RainbowKitProvider, type Locale } from '@rainbow-me/rainbowkit';
import useConfig from 'hooks/useConfig';
import { getRainbowKitTheme } from 'themes/rainbowkit-theme';

interface RainbowKitThemeProviderProps {
  children: ReactNode;
}

const RainbowKitThemeProvider = ({ children }: RainbowKitThemeProviderProps) => {
  const { mode, i18n } = useConfig();

  const customTheme = getRainbowKitTheme(mode);

  // Keep the wallet modal copy in sync with the language picked in the header.
  // This only swaps RainbowKit's translation bundle; connection state is untouched.
  const rainbowKitLocale: Locale = i18n === 'zh' ? 'zh-CN' : 'en-US';

  return (
    <RainbowKitProvider
      theme={customTheme}
      modalSize="compact"
      locale={rainbowKitLocale}
    >
      {children}
    </RainbowKitProvider>
  );
};

export default RainbowKitThemeProvider;
