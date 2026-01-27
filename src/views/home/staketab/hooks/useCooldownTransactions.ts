import { useCallback, useEffect, useMemo } from 'react';

import { useWriteTransaction } from 'hooks/useWriteTransaction';
import { UnstakeTokenMeta } from './useUnstakeTokenSelection';

interface UseCooldownTransactionsParams {
  tokenMeta: UnstakeTokenMeta;
  parsedAmount: bigint | null;
  userAddress?: `0x${string}`;
  onCooldownConfirmed?: () => void;
}

export const useCooldownTransactions = ({
  tokenMeta,
  parsedAmount,
  userAddress,
  onCooldownConfirmed
}: UseCooldownTransactionsParams) => {
  const cooldownTx = useWriteTransaction();

  const handleCooldown = useCallback(async () => {
    if (!userAddress || !parsedAmount || parsedAmount === 0n) return;

    await cooldownTx.sendTransaction({
      address: tokenMeta.stakingAddress as `0x${string}`,
      abi: tokenMeta.abi,
      functionName: 'cooldownShares',
      args: [parsedAmount]
    });
  }, [cooldownTx, parsedAmount, tokenMeta.abi, tokenMeta.stakingAddress, userAddress]);

  useEffect(() => {
    if (cooldownTx.txState === 'confirmed') {
      onCooldownConfirmed?.();
    }
  }, [cooldownTx.txState, onCooldownConfirmed]);

  const isTransactionInProgress = useMemo(
    () => cooldownTx.txState === 'submitting' || cooldownTx.txState === 'submitted',
    [cooldownTx.txState]
  );

  const statusMessage = useMemo(() => {
    if (cooldownTx.txState === 'submitted') return 'Cooldown transaction submitted...';
    if (cooldownTx.txState === 'error') return 'Cooldown transaction failed. Please retry.';
    return null;
  }, [cooldownTx.txState]);

  return { handleCooldown, cooldownTx, isTransactionInProgress, statusMessage };
};
