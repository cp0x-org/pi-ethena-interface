import { useCallback, useMemo, useState } from 'react';
import { parseEther } from 'viem';

import { OUTPUT_DECIMALS, TOKEN_DECIMALS } from '@/appconfig';
import { formatAssetOutput, formatNumberDisplay, normalizePointAmount } from 'utils/formatters';
import { useDebounce } from 'hooks/useDebounce';

const safeDecimal = (value: string, decimals: number) => {
  const floatValue = parseFloat(normalizePointAmount(value));
  if (Number.isNaN(floatValue) || floatValue === 0) return '0';
  return floatValue.toFixed(decimals);
};

interface UseStakeAmountResult {
  amountInput: string;
  formattedAmount: string;
  activePercentage: number | null;
  debouncedAmountInput: string;
  parsedAmount: bigint | null;
  handleAmountChange: (value: string) => void;
  handlePercentClick: (percent: number, balance: string) => void;
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

  const handlePercentClick = useCallback((percent: number, balance: string) => {
    const value = (parseFloat(normalizePointAmount(balance || '0')) * percent) / 100;
    const formattedValue = formatNumberDisplay(value, OUTPUT_DECIMALS);
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
