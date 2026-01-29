import { useMemo } from 'react';
import { useAccount, useChainId, useReadContract } from 'wagmi';

import { useConfigChainId } from 'hooks/useConfigChainId';
import { enaLpStakingConfig } from '@/appconfig/abi/EnaLpStaking';
type StakeParametersRaw = readonly [
  number, // enum / flag / uint8
  bigint, // minStake
  bigint, // maxStake
  bigint, // something
  number // cooldownDuration (uint32)
];

export const useSenaStakeInfo = () => {
  const { address: userAddress } = useAccount();
  const { config: chainConfig } = useConfigChainId();
  const chainId = useChainId();
  const stakingAddress = chainConfig.contracts.ENA_LP_STAKING as `0x${string}`;
  const senaAddress = chainConfig.contracts.SENA as `0x${string}`;

  const {
    data: stakeInfo,
    refetch: refetchStakeInfo,
    isLoading: isStakeInfoLoading
  } = useReadContract({
    abi: enaLpStakingConfig.abi,
    address: stakingAddress,
    functionName: 'stakes',
    args: userAddress && senaAddress ? [userAddress, senaAddress] : undefined,
    query: {
      enabled: !!userAddress
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
    args: senaAddress ? [senaAddress] : undefined,
    query: {
      enabled: !!userAddress
    }
  });

  const cooldown = useMemo<bigint>(() => {
    if (!stakeParameters) return 0n;

    const [, , , , cooldownDurationRaw] = stakeParameters as StakeParametersRaw;

    return BigInt(cooldownDurationRaw);
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
    refetchAll,
    isLoading: isStakeInfoLoading || isStakeParamsLoading
  };
};
