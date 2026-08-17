import Box from '@mui/material/Box';
import React from 'react';
import { SxProps, Theme } from '@mui/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  sx?: SxProps<Theme>;
  /**
   * Namespace for the `id` / `aria-labelledby` pair shared with the matching `<Tab>`.
   * Nested tab groups must use different prefixes, otherwise the same DOM ids are
   * rendered twice and `aria-controls` / `aria-labelledby` resolve to the wrong node.
   */
  idPrefix?: string;
}

export default function TabPanel(props: TabPanelProps) {
  const { children, value, index, sx, idPrefix = 'market', ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`${idPrefix}-tabpanel-${index}`}
      aria-labelledby={`${idPrefix}-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={sx}>{children}</Box>}
    </div>
  );
}
