import { useAccount, useChainId, useReadContract, useReadContracts } from 'wagmi';
import { useConfigChainId } from 'hooks/useConfigChainId';
import { enaConfig } from '@/appconfig/abi/Ena';
import { senaConfig } from '@/appconfig/abi/Sena';
import { usdeConfig } from '@/appconfig/abi/Usde';
import { susdeConfig } from '@/appconfig/abi/Susde';
import { ENA, StakedUSDeOFTAdapter, USDeOFTAdapter } from '@/appconfig';

export type BalancesData = {
  ena: bigint;
  sena: bigint;
  usde: bigint;
  susde: bigint;
};

export const useBalanceData = (): { balances: BalancesData; isLoading: boolean; refetchBalances: () => void } => {
  const { address: userAddress } = useAccount();
  const wagmiChainId = useChainId();
  const { config: chainConfig } = useConfigChainId();
  console.log('userAddress', userAddress);

  console.log('chainConfig.contracts', chainConfig.contracts);

  const isEthereum = wagmiChainId === 1;
  const usdeAddress = isEthereum ? chainConfig.contracts.USDE : USDeOFTAdapter;
  const susdeAddress = isEthereum ? chainConfig.contracts.SUSDE : StakedUSDeOFTAdapter;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        abi: enaConfig.abi,
        address: ENA,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined
      },
      {
        abi: senaConfig.abi,
        address: chainConfig.contracts.SENA,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined
      },
      {
        abi: usdeConfig.abi,
        address: usdeAddress,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined
      },
      {
        abi: susdeConfig.abi,
        address: susdeAddress,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined
      }
    ],
    query: { enabled: !!userAddress }
  });

  console.log('useReadContracts raw data', data);

  const balances = data
    ? {
        ena: data[0].status === 'success' ? data[0].result : 0n,
        sena: data[1].status === 'success' ? data[1].result : 0n,
        usde: data[2].status === 'success' ? data[2].result : 0n,
        susde: data[3].status === 'success' ? data[3].result : 0n
      }
    : { ena: 0n, sena: 0n, usde: 0n, susde: 0n };

  console.log('useBalanceData balances', balances);
  console.log('useBalanceData loading', isLoading);

  const refetchBalances = () => {
    refetch();
  };

  return { balances, isLoading, refetchBalances };
};
