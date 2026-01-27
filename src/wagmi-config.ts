import {
  arbitrum,
  avalanche,
  base,
  berachain,
  blast,
  bsc,
  fraxtal,
  linea,
  mainnet,
  mantle,
  metis,
  mode,
  optimism,
  scroll,
  zksync,
  Chain
} from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { RuntimeConfig } from './runtime-config';

const normalizeRpcUrl = (rpcUrl?: string) => (rpcUrl ? rpcUrl.trim() : '');

const withRpcUrl = (chain: Chain, rpcUrl?: string): Chain | null => {
  const normalizedRpcUrl = normalizeRpcUrl(rpcUrl);
  if (!normalizedRpcUrl) return null;
  return {
    ...chain,
    rpcUrls: {
      default: { http: [normalizedRpcUrl] },
      public: { http: [normalizedRpcUrl] }
    }
  };
};

const parseChainId = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const buildCustomChain = (name: string, id: number | null, rpcUrl?: string): Chain | null => {
  const normalizedRpcUrl = normalizeRpcUrl(rpcUrl);
  if (!id || !normalizedRpcUrl) return null;
  return {
    id,
    name,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [normalizedRpcUrl] },
      public: { http: [normalizedRpcUrl] }
    },
    testnet: false
  };
};

export const createWagmiConfig = (runtimeConfig: RuntimeConfig) => {
  const rpcs = runtimeConfig.rpcs ?? {};
  const chainIds = runtimeConfig.chainIds ?? {};

  const mainnetCustom = withRpcUrl(mainnet, rpcs.ethereum);
  const arbitrumCustom = withRpcUrl(arbitrum, rpcs.arbitrum);
  const avalancheCustom = withRpcUrl(avalanche, rpcs.avalanche);
  const baseCustom = withRpcUrl(base, rpcs.base);
  const berachainCustom = withRpcUrl(berachain, rpcs.berachain);
  const blastCustom = withRpcUrl(blast, rpcs.blast);
  const bscCustom = withRpcUrl(bsc, rpcs.bsc);
  const fraxtalCustom = withRpcUrl(fraxtal, rpcs.frax);
  const lineaCustom = withRpcUrl(linea, rpcs.linea);
  const mantleCustom = withRpcUrl(mantle, rpcs.mantle);
  const metisCustom = withRpcUrl(metis, rpcs.metis);
  const modeCustom = withRpcUrl(mode, rpcs.mode);
  const optimismCustom = withRpcUrl(optimism, rpcs.optimism);
  const scrollCustom = withRpcUrl(scroll, rpcs.scroll);
  const zksyncCustom = withRpcUrl(zksync, rpcs.zksync);

  const hyperEvmCustom = buildCustomChain(
    'HyperEVM',
    parseChainId(chainIds.hyperevm ? String(chainIds.hyperevm) : undefined),
    rpcs.hyperevm
  );
  const plasmaCustom = buildCustomChain(
    'Plasma',
    parseChainId(chainIds.plasma ? String(chainIds.plasma) : undefined),
    rpcs.plasma
  );

  const configuredChains = [
    mainnetCustom,
    arbitrumCustom,
    avalancheCustom,
    baseCustom,
    berachainCustom,
    blastCustom,
    bscCustom,
    fraxtalCustom,
    hyperEvmCustom,
    lineaCustom,
    mantleCustom,
    metisCustom,
    modeCustom,
    optimismCustom,
    plasmaCustom,
    scrollCustom,
    zksyncCustom
  ].filter((chain): chain is Chain => Boolean(chain));
  const chains = (configuredChains.length ? configuredChains : [mainnet]) as [Chain, ...Chain[]];

  return getDefaultConfig({
    appName: 'Ethena Interface',
    projectId: runtimeConfig.walletConnectProjectId ?? runtimeConfig.projectId ?? '',
    chains,
    ssr: false
  });
};
