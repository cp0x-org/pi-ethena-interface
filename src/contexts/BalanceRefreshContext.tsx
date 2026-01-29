import React, { createContext, useContext } from 'react';

interface BalanceRefreshContextType {
  refetchBalances: () => void;
}

const BalanceRefreshContext = createContext<BalanceRefreshContextType>({
  refetchBalances: () => {}
});

export const BalanceRefreshProvider: React.FC<{
  refetchBalances: () => void;
  children: React.ReactNode;
}> = ({ refetchBalances, children }) => {
  return <BalanceRefreshContext.Provider value={{ refetchBalances }}>{children}</BalanceRefreshContext.Provider>;
};

export const useBalanceRefresh = () => useContext(BalanceRefreshContext);
