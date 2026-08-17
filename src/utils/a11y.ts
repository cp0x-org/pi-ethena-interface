import type { SxProps, Theme } from '@mui/material/styles';

// ==============================|| ACCESSIBILITY HELPERS ||============================== //

/**
 * Screen-reader-only styles.
 *
 * The element stays in the accessibility tree but is removed from the visual layout.
 * It is taken out of flow (`position: absolute`), so it never becomes a flex/grid item
 * and therefore cannot affect sizing, `gap` or spacing of its siblings.
 */
export const visuallyHidden: SxProps<Theme> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0
};

/**
 * Builds a space separated `aria-describedby` value, dropping ids of elements
 * that are not currently rendered. Returns `undefined` when nothing is left,
 * so the attribute is omitted instead of pointing at missing ids.
 */
export const describedBy = (...ids: Array<string | false | null | undefined>): string | undefined =>
  ids.filter(Boolean).join(' ') || undefined;
