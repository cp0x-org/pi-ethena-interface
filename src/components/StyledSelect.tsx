import { Select, SelectProps, MenuItem, styled } from '@mui/material';

export const StyledSelect = styled((props: SelectProps) => <Select {...props} />)(() => ({
  '& .MuiSelect-select': {
    background: 'none',
    padding: '10px 12px'
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none'
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    border: 'none'
  },
  '& .MuiSelect-icon': {
    color: 'inherit'
  }
}));
