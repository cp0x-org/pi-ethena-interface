import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useIntl } from 'react-intl';

import { useWriteTransaction } from 'hooks/useWriteTransaction';
import { UnstakeTokenMeta } from './useUnstakeTokenSelection';
import { dispatchSuccess, dispatchError } from 'utils/snackbar';

interface UseWithdrawTransactionsParams {
  tokenMeta: UnstakeTokenMeta;
  userAddress?: `0x${string}`;
  onWithdrawConfirmed?: () => void;
}

export const useWithdrawTransactions = ({ tokenMeta, userAddress, onWithdrawConfirmed }: UseWithdrawTransactionsParams) => {
  const intl = useIntl();
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
        dispatchSuccess(intl.formatMessage({ id: 'app.tx.withdrawConfirmed', defaultMessage: 'Withdraw confirmed' }));
        onWithdrawConfirmed?.();
      } else if (withdrawTx.txState === 'error') {
        dispatchError(intl.formatMessage({ id: 'app.tx.withdrawFailed', defaultMessage: 'Withdraw failed' }));
      }
      prevWithdrawTxState.current = withdrawTx.txState;
    }
  }, [intl, onWithdrawConfirmed, withdrawTx.txState]);

  const statusMessage = useMemo(() => {
    if (withdrawTx.txState === 'submitted')
      return intl.formatMessage({ id: 'app.tx.withdrawTxSubmitted', defaultMessage: 'Withdraw transaction submitted...' });
    if (withdrawTx.txState === 'error')
      return intl.formatMessage({ id: 'app.tx.withdrawTxFailed', defaultMessage: 'Withdraw transaction failed. Please retry.' });
    if (withdrawTx.txState === 'confirmed')
      return intl.formatMessage({ id: 'app.tx.withdrawTxSuccess', defaultMessage: 'Withdraw successful.' });
    return null;
  }, [intl, withdrawTx.txState]);

  return { handleWithdraw, withdrawTx, statusMessage };
};
