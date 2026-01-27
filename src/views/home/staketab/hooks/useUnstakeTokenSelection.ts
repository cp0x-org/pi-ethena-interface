import { useCallback, useMemo, useState } from 'react';
import { formatTokenBalance } from 'utils/formatters';

import { useConfigChainId } from 'hooks/useConfigChainId';
import { BalancesData } from 'hooks/useBalanceData';
import { senaConfig } from '@/appconfig/abi/Sena';
import { susdeConfig } from '@/appconfig/abi/Susde';

export type UnstakeTokenSymbol = 'SENA' | 'SUSDE';

export interface UnstakeTokenMeta {
  token: UnstakeTokenSymbol;
  balance: bigint;
  stakingAddress: string;
  abi: typeof senaConfig.abi | typeof susdeConfig.abi;
  underlyingSymbol: 'ENA' | 'USDE';
}

interface UseUnstakeTokenSelectionResult {
  tokenMeta: UnstakeTokenMeta;
  selectedBalanceDisplay: string;
  unstakeTokenAddress: string;
  handleTokenAddressChange: (address: string) => void;
  tokenOptions: Record<UnstakeTokenSymbol, string>;
}

export const useUnstakeTokenSelection = (balances: BalancesData): UseUnstakeTokenSelectionResult => {
  const { config: chainConfig } = useConfigChainId();
  const [tokenSymbol, setTokenSymbol] = useState<UnstakeTokenSymbol>('SENA');

  const tokenMeta = useMemo<UnstakeTokenMeta>(() => {
    const isSena = tokenSymbol === 'SENA';

    return {
      token: tokenSymbol,
      balance: isSena ? balances.sena : balances.susde,
      stakingAddress: isSena ? chainConfig.contracts.SENA : chainConfig.contracts.SUSDE,
      abi: isSena ? senaConfig.abi : susdeConfig.abi,
      underlyingSymbol: isSena ? 'ENA' : 'USDE'
    };
  }, [balances.sena, balances.susde, chainConfig.contracts.SENA, chainConfig.contracts.SUSDE, tokenSymbol]);

  const selectedBalanceDisplay = useMemo(() => formatTokenBalance(tokenMeta.balance), [tokenMeta.balance]);

  const handleTokenAddressChange = useCallback(
    (address: string) => {
      const normalizedAddress = address.toLowerCase();
      const isSena = normalizedAddress === chainConfig.contracts.SENA.toLowerCase();
      setTokenSymbol(isSena ? 'SENA' : 'SUSDE');
    },
    [chainConfig.contracts.SENA, chainConfig.contracts.SUSDE]
  );

  return {
    tokenMeta,
    selectedBalanceDisplay,
    unstakeTokenAddress: tokenMeta.stakingAddress,
    handleTokenAddressChange,
    tokenOptions: {
      SENA: chainConfig.contracts.SENA,
      SUSDE: chainConfig.contracts.SUSDE
    }
  };
};
