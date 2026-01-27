import { useEffect, useMemo, useState } from 'react';
import { useReadContract } from 'wagmi';

import { StakeTokenMeta } from './useStakeTokenSelection';

interface UseStakeAllowanceParams {
  tokenMeta: StakeTokenMeta;
  userAddress?: `0x${string}`;
  amountInput: string;
  debouncedAmountInput: string;
  parsedAmount: bigint | null;
  isApprovalRequired?: boolean;
}

interface UseStakeAllowanceResult {
  allowanceChecking: boolean;
  isAllowanceSufficient: boolean;
  refetchAllowance?: () => Promise<unknown>;
  allowanceValue?: bigint;
}

export const useStakeAllowance = ({
  tokenMeta,
  userAddress,
  amountInput,
  debouncedAmountInput,
  parsedAmount,
  isApprovalRequired = true
}: UseStakeAllowanceParams): UseStakeAllowanceResult => {
  const [allowanceChecking, setAllowanceChecking] = useState(false);

  const shouldCheckAllowance = isApprovalRequired;

  const { data: allowance, refetch } = useReadContract({
    abi: tokenMeta.approveAbi,
    address: tokenMeta.tokenAddress as `0x${string}`,
    functionName: 'allowance',
    args: [userAddress as `0x${string}`, tokenMeta.stakingAddress as `0x${string}`],
    query: {
      enabled: shouldCheckAllowance && !!userAddress
    }
  });

  useEffect(() => {
    if (!shouldCheckAllowance) return;
    if (amountInput && amountInput !== debouncedAmountInput) {
      setAllowanceChecking(true);
    }
  }, [amountInput, debouncedAmountInput, shouldCheckAllowance]);

  useEffect(() => {
    if (!shouldCheckAllowance) return;
    if (!debouncedAmountInput || !refetch) return;
    refetch();
    setAllowanceChecking(false);
  }, [debouncedAmountInput, refetch, shouldCheckAllowance]);

  const isAllowanceSufficient = useMemo(() => {
    if (!shouldCheckAllowance) return true;
    if (!parsedAmount || parsedAmount === 0n) return false;
    if (!allowance) return false;
    return allowance >= parsedAmount;
  }, [allowance, parsedAmount, shouldCheckAllowance]);

  return {
    allowanceChecking: shouldCheckAllowance ? allowanceChecking : false,
    isAllowanceSufficient,
    refetchAllowance: shouldCheckAllowance ? refetch : undefined,
    allowanceValue: shouldCheckAllowance ? allowance : undefined
  };
};
