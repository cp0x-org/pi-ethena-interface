import { useCallback, useMemo, useState } from 'react';
import { formatUnits, parseEther } from 'viem';

import { TOKEN_DECIMALS } from '@/appconfig';
import { formatAssetOutput, normalizePointAmount } from 'utils/formatters';
import { useDebounce } from 'hooks/useDebounce';

/**
 * Formats a bigint amount (in wei) to a string with comma separators.
 * Uses full precision (up to 18 decimals) - does not truncate.
 */
const formatFullPrecision = (amount: bigint, decimals: number = TOKEN_DECIMALS): string => {
  const formatted = formatUnits(amount, decimals);
  const [integerPart, decimalPart] = formatted.split('.');

  // Format integer part with commas
  const formattedInteger = BigInt(integerPart).toLocaleString('en-US');

  if (!decimalPart || decimalPart === '0') {
    return formattedInteger;
  }

  // Remove trailing zeros from decimal part but keep precision
  const trimmedDecimal = decimalPart.replace(/0+$/, '');
  if (!trimmedDecimal) {
    return formattedInteger;
  }

  return `${formattedInteger}.${trimmedDecimal}`;
};

interface UseStakeAmountResult {
  amountInput: string;
  formattedAmount: string;
  activePercentage: number | null;
  debouncedAmountInput: string;
  parsedAmount: bigint | null;
  handleAmountChange: (value: string) => void;
  handlePercentClick: (percent: number, balance: bigint) => void;
  resetAmount: () => void;
}

export const useStakeAmount = (initialAmount = ''): UseStakeAmountResult => {
  const [amountInput, setAmountInput] = useState(initialAmount);
  const [formattedAmount, setFormattedAmount] = useState(initialAmount);
  const [activePercentage, setActivePercentage] = useState<number | null>(null);

  const debouncedAmountInput = useDebounce(amountInput, 500);

  const parsedAmount = useMemo(() => {
    if (!debouncedAmountInput) return null;

    console.log('parsedAmount MEMO');
    try {
      console.log('parsedAmount MEMO22');
      console.log("debouncedAmountInput");
      console.log(debouncedAmountInput);
      const normalized = normalizePointAmount(debouncedAmountInput.toString());
      console.log("normalized");
      console.log(normalized);
      console.log(normalizePointAmount(debouncedAmountInput.toString()));
      return parseEther(normalized);
    } catch (error) {
      console.error('Error parsing amount:', error);
      return null;
    }
  }, [debouncedAmountInput]);

  const handleAmountChange = useCallback((value: string) => {
    const formattedValue = formatAssetOutput(value);
    setAmountInput(formattedValue);
    setFormattedAmount(formattedValue);
    setActivePercentage(null);
  }, []);

  const handlePercentClick = useCallback((percent: number, balance: bigint) => {
    // Use bigint math to maintain full precision
    const value = (balance * BigInt(percent)) / 100n;
    const formattedValue = formatFullPrecision(value);
    setAmountInput(formattedValue);
    setFormattedAmount(formattedValue);
    setActivePercentage(percent);
  }, []);

  const resetAmount = useCallback(() => {
    setAmountInput('');
    setFormattedAmount('');
    setActivePercentage(null);
  }, []);

  return {
    amountInput,
    formattedAmount,
    activePercentage,
    debouncedAmountInput,
    parsedAmount,
    handleAmountChange,
    handlePercentClick,
    resetAmount
  };
};
