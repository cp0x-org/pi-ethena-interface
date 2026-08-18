import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useReadContract } from 'wagmi';

import { UnstakeTokenMeta } from './useUnstakeTokenSelection';
import { formatTokenBalance } from 'utils/formatters';

interface UseCooldownInfoParams {
  tokenMeta: UnstakeTokenMeta;
  userAddress?: `0x${string}`;
}

export const useCooldownInfo = ({ tokenMeta, userAddress }: UseCooldownInfoParams) => {
  const intl = useIntl();
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  const { data, refetch, isFetching } = useReadContract({
    abi: tokenMeta.abi,
    address: tokenMeta.stakingAddress as `0x${string}`,
    functionName: 'cooldowns',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress }
  });

  const cooldownData = data
    ? {
        cooldownEnd: data[0],
        underlyingAmount: data[1]
      }
    : undefined;

  const cooldownEnd = cooldownData?.cooldownEnd ?? 0n;
  const underlyingAmount = cooldownData?.underlyingAmount ?? 0n;

  useEffect(() => {
    if (!cooldownEnd) return;
    const interval = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const timeRemainingSeconds = useMemo(() => {
    if (!cooldownEnd) return 0;
    const remaining = Number(cooldownEnd - BigInt(nowSeconds));
    return remaining > 0 ? remaining : 0;
  }, [cooldownEnd, nowSeconds]);

  const formattedUnderlyingAmount = useMemo(() => formatTokenBalance(underlyingAmount), [underlyingAmount]);
  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [hours > 0 ? `${hours}h` : null, minutes > 0 ? `${minutes}m` : null, `${seconds}s`].filter(Boolean);

    return parts.join(' ');
  };
  const cooldownMessage = useMemo(() => {
    if (!userAddress)
      return intl.formatMessage({ id: 'app.cooldown.connectWallet', defaultMessage: 'Connect wallet to check cooldown status.' });
    if (!cooldownEnd || underlyingAmount === 0n)
      return intl.formatMessage({ id: 'app.cooldown.notStarted', defaultMessage: 'No cooldown started yet.' });

    if (timeRemainingSeconds > 0) {
      return intl.formatMessage(
        { id: 'app.cooldown.endsInFor', defaultMessage: 'Cooldown ends in {duration} for {amount} {symbol}.' },
        { duration: formatDuration(timeRemainingSeconds), amount: formattedUnderlyingAmount, symbol: tokenMeta.underlyingSymbol }
      );
    }

    return intl.formatMessage(
      { id: 'app.cooldown.complete', defaultMessage: 'Cooldown complete. {amount} {symbol} ready to withdraw.' },
      { amount: formattedUnderlyingAmount, symbol: tokenMeta.underlyingSymbol }
    );
  }, [cooldownEnd, formattedUnderlyingAmount, intl, timeRemainingSeconds, tokenMeta.underlyingSymbol, underlyingAmount, userAddress]);

  return {
    cooldownEnd,
    underlyingAmount,
    timeRemainingSeconds,
    formattedUnderlyingAmount,
    isCooldownActive: timeRemainingSeconds > 0,
    cooldownMessage,
    refetchCooldown: refetch,
    isCooldownLoading: isFetching
  };
};
