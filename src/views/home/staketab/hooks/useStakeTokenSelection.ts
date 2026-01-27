import { useCallback, useMemo, useState } from 'react';
import { formatTokenBalance } from 'utils/formatters';

import { useConfigChainId } from 'hooks/useConfigChainId';
import { BalancesData } from 'hooks/useBalanceData';
import { enaConfig } from '@/appconfig/abi/Ena';
import { senaConfig } from '@/appconfig/abi/Sena';
import { usdeConfig } from '@/appconfig/abi/Usde';
import { susdeConfig } from '@/appconfig/abi/Susde';

export type StakeTokenSymbol = 'ENA' | 'USDE';

export interface StakeTokenMeta {
  token: StakeTokenSymbol;
  balance: bigint;
  tokenAddress: string;
  stakingAddress: string;
  approveAbi: typeof enaConfig.abi | typeof usdeConfig.abi;
  stakeAbi: typeof senaConfig.abi | typeof susdeConfig.abi;
}

interface UseStakeTokenSelectionResult {
  tokenMeta: StakeTokenMeta;
  selectedBalanceDisplay: string;
  stakeTokenAddress: string;
  handleTokenAddressChange: (address: string) => void;
  tokenOptions: Record<StakeTokenSymbol, string>;
}

export const useStakeTokenSelection = (balances: BalancesData): UseStakeTokenSelectionResult => {
  const { config: chainConfig } = useConfigChainId();
  const [tokenSymbol, setTokenSymbol] = useState<StakeTokenSymbol>('ENA');

  const tokenMeta = useMemo<StakeTokenMeta>(() => {
    const isEna = tokenSymbol === 'ENA';

    return {
      token: tokenSymbol,
      balance: isEna ? balances.ena : balances.usde,
      tokenAddress: isEna ? chainConfig.contracts.ENA : chainConfig.contracts.USDE,
      stakingAddress: isEna ? chainConfig.contracts.SENA : chainConfig.contracts.SUSDE,
      approveAbi: isEna ? enaConfig.abi : usdeConfig.abi,
      stakeAbi: isEna ? senaConfig.abi : susdeConfig.abi
    };
  }, [balances.ena, balances.usde, chainConfig.contracts.ENA, chainConfig.contracts.SENA, chainConfig.contracts.SUSDE, chainConfig.contracts.USDE, tokenSymbol]);

  const selectedBalanceDisplay = useMemo(() => formatTokenBalance(tokenMeta.balance), [tokenMeta.balance]);

  const handleTokenAddressChange = useCallback(
    (address: string) => {
      const normalizedAddress = address.toLowerCase();
      const isEna = normalizedAddress === chainConfig.contracts.ENA.toLowerCase();
      setTokenSymbol(isEna ? 'ENA' : 'USDE');
    },
    [chainConfig.contracts.ENA, chainConfig.contracts.USDE]
  );

  return {
    tokenMeta,
    selectedBalanceDisplay,
    stakeTokenAddress: tokenMeta.tokenAddress,
    handleTokenAddressChange,
    tokenOptions: {
      ENA: chainConfig.contracts.ENA,
      USDE: chainConfig.contracts.USDE
    }
  };
};
