import { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';

import { useConfigChainId } from 'hooks/useConfigChainId';
import { enaLpStakingConfig } from '@/appconfig/abi/EnaLpStaking';

type StakeParametersRaw = readonly [
  number, // epoch
  bigint, // stakeLimit
  bigint, // totalStaked
  bigint, // totalCoolingDown
  number // cooldown (uint48)
];

export const useStakeInfoByToken = (tokenAddress?: `0x${string}`) => {
  const { address: userAddress } = useAccount();
  const { config: chainConfig } = useConfigChainId();
  const stakingAddress = chainConfig.contracts.ENA_LP_STAKING as `0x${string}`;

  const {
    data: stakeInfo,
    refetch: refetchStakeInfo,
    isLoading: isStakeInfoLoading
  } = useReadContract({
    abi: enaLpStakingConfig.abi,
    address: stakingAddress,
    functionName: 'stakes',
    args: userAddress && tokenAddress ? [userAddress, tokenAddress] : undefined,
    query: {
      enabled: !!userAddress && !!tokenAddress
    }
  });

  const {
    data: stakeParameters,
    refetch: refetchStakeParameters,
    isLoading: isStakeParamsLoading
  } = useReadContract({
    abi: enaLpStakingConfig.abi,
    address: stakingAddress,
    functionName: 'stakeParametersByToken',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress
    }
  });

  const cooldown = useMemo<bigint>(() => {
    if (!stakeParameters) return 0n;
    const [, , , , cooldownDurationRaw] = stakeParameters as StakeParametersRaw;
    return BigInt(cooldownDurationRaw);
  }, [stakeParameters]);

  const stakeLimit = useMemo<bigint>(() => {
    if (!stakeParameters) return 0n;
    const [, stakeLimitRaw] = stakeParameters as StakeParametersRaw;
    return stakeLimitRaw;
  }, [stakeParameters]);

  const formattedStakeInfo = useMemo(() => {
    if (!stakeInfo) return { stakedAmount: 0n, coolingDownAmount: 0n, cooldownStartTimestamp: 0n };
    const [stakedAmount, coolingDownAmount, cooldownStartTimestamp] = stakeInfo as readonly [bigint, bigint, bigint];
    return { stakedAmount, coolingDownAmount, cooldownStartTimestamp };
  }, [stakeInfo]);

  const refetchAll = async () => {
    await Promise.all([refetchStakeInfo(), refetchStakeParameters()]);
  };

  return {
    ...formattedStakeInfo,
    cooldown,
    stakeLimit,
    refetchAll,
    isLoading: isStakeInfoLoading || isStakeParamsLoading
  };
};
