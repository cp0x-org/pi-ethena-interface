import React, { createContext, useCallback, useContext, useRef } from 'react';

interface BalanceRefreshContextType {
  refetchBalances: () => void;
  registerStakeRefetch: (refetch: () => void) => void;
}

const BalanceRefreshContext = createContext<BalanceRefreshContextType>({
  refetchBalances: () => {},
  registerStakeRefetch: () => {}
});

export const BalanceRefreshProvider: React.FC<{
  refetchBalances: () => void;
  children: React.ReactNode;
}> = ({ refetchBalances: refetchBalancesBase, children }) => {
  const stakeRefetchRef = useRef<(() => void) | null>(null);

  const registerStakeRefetch = useCallback((refetch: () => void) => {
    stakeRefetchRef.current = refetch;
  }, []);

  const refetchBalances = useCallback(() => {
    refetchBalancesBase();
    stakeRefetchRef.current?.();
  }, [refetchBalancesBase]);

  return (
    <BalanceRefreshContext.Provider value={{ refetchBalances, registerStakeRefetch }}>
      {children}
    </BalanceRefreshContext.Provider>
  );
};

export const useBalanceRefresh = () => useContext(BalanceRefreshContext);
