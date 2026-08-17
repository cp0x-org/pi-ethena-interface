import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { useIntl } from 'react-intl';

import useConfig from 'hooks/useConfig';
import { I18n } from 'types/config';
import { visuallyHidden } from 'utils/a11y';

// ==============================|| LANGUAGE SWITCHER ||============================== //

/**
 * Locale picker for the header. The selection is stored through `ConfigContext`,
 * which persists it in `localStorage`, so it survives a reload. Switching locales
 * only swaps the `react-intl` message catalogue — it never touches wallet, network
 * or transaction state, and works while disconnected.
 */
export default function LanguageSwitcher() {
  const intl = useIntl();
  const { i18n, onChangeLocale } = useConfig();

  // Only English and Chinese are offered in the UI; any other stored value falls back to English.
  const value: I18n = i18n === 'zh' ? 'zh' : 'en';

  const englishLabel = intl.formatMessage({ id: 'app.language.english', defaultMessage: 'English' });
  const chineseLabel = intl.formatMessage({ id: 'app.language.chinese', defaultMessage: '中文' });
  const englishShortLabel = intl.formatMessage({ id: 'app.language.englishShort', defaultMessage: 'EN' });

  const handleChange = (event: SelectChangeEvent<unknown>) => {
    onChangeLocale(event.target.value as I18n);
  };

  return (
    <>
      <Box component="span" id="language-switcher-label" sx={visuallyHidden}>
        {intl.formatMessage({ id: 'app.language.label', defaultMessage: 'Select language' })}
      </Box>
      <Select
        id="languageSwitcher"
        name="language"
        labelId="language-switcher-label"
        value={value}
        onChange={handleChange}
        // The header shows the compact code, the dropdown keeps the full language names.
        renderValue={() => (value === 'zh' ? chineseLabel : englishShortLabel)}
        variant="outlined"
        size="small"
        // Borderless so the control blends into the existing header instead of
        // introducing a new visual style next to the connect button.
        sx={{
          color: 'text.primary',
          fontSize: '0.875rem',
          '& .MuiSelect-select': {
            background: 'none',
            padding: '6px 24px 6px 8px'
          },
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
          '& .MuiSelect-icon': { color: 'inherit' }
        }}
      >
        <MenuItem value="en">{englishLabel}</MenuItem>
        <MenuItem value="zh">{chineseLabel}</MenuItem>
      </Select>
    </>
  );
}
