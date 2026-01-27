import React, { ReactNode, useEffect, useMemo, useRef } from 'react';
import { ApolloProvider } from '@apollo/client';
import { useConfigChainId } from 'hooks/useConfigChainId';
import { appoloClients } from 'api/apollo-client';
import { mainnet, base, polygon, unichain } from 'wagmi/chains';

const getClientForChainId = (chainId: number) => {
  switch (chainId) {
    case 1222:
      return appoloClients.ethGraphApi;
    case mainnet.id:
      return appoloClients.ethGraphApi;
    case base.id:
      return appoloClients.baseGraphApi;
    case polygon.id:
      return appoloClients.polygonGraphApi;
    case unichain.id:
      return appoloClients.unichainGraphApi;
    // default:
    //   return appoloClients.ethGraphApi;
  }
};

export const DynamicApolloProvider = ({ children }: { children: ReactNode }) => {
  const { chainId } = useConfigChainId();
  const previousChainId = useRef(chainId);

  const client = useMemo(() => getClientForChainId(chainId), [chainId]);
  useEffect(() => {
    if (!client) return;
    if (previousChainId.current === chainId) return;
    previousChainId.current = chainId;
    void client.resetStore().catch((error) => {
      console.warn('Failed to reset Apollo store after chain change:', error);
    });
  }, [chainId, client]);

  if (!client) {
    console.error('No client found for chainId: ', chainId);
    return null;
  }

  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
};
