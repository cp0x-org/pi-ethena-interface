import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useWriteTransaction } from 'hooks/useWriteTransaction';
import { UnstakeTokenMeta } from './useUnstakeTokenSelection';
import { dispatchSuccess, dispatchError } from 'utils/snackbar';

interface UseWithdrawTransactionsParams {
  tokenMeta: UnstakeTokenMeta;
  userAddress?: `0x${string}`;
  onWithdrawConfirmed?: () => void;
}

export const useWithdrawTransactions = ({ tokenMeta, userAddress, onWithdrawConfirmed }: UseWithdrawTransactionsParams) => {
  const withdrawTx = useWriteTransaction();

  const handleWithdraw = useCallback(async () => {
    if (!userAddress) return;

    await withdrawTx.sendTransaction({
      address: tokenMeta.stakingAddress as `0x${string}`,
      abi: tokenMeta.abi,
      functionName: 'unstake',
      args: [userAddress]
    });
  }, [tokenMeta.abi, tokenMeta.stakingAddress, userAddress, withdrawTx]);

  const prevWithdrawTxState = useRef(withdrawTx.txState);
  useEffect(() => {
    if (prevWithdrawTxState.current !== withdrawTx.txState) {
      if (withdrawTx.txState === 'confirmed') {
        dispatchSuccess('Withdraw confirmed');
        onWithdrawConfirmed?.();
      } else if (withdrawTx.txState === 'error') {
        dispatchError('Withdraw failed');
      }
      prevWithdrawTxState.current = withdrawTx.txState;
    }
  }, [onWithdrawConfirmed, withdrawTx.txState]);

  const statusMessage = useMemo(() => {
    if (withdrawTx.txState === 'submitted') return 'Withdraw transaction submitted...';
    if (withdrawTx.txState === 'error') return 'Withdraw transaction failed. Please retry.';
    if (withdrawTx.txState === 'confirmed') return 'Withdraw successful.';
    return null;
  }, [withdrawTx.txState]);

  return { handleWithdraw, withdrawTx, statusMessage };
};
