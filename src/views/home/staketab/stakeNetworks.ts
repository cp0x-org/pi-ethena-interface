import { arbitrum, avalanche, base, berachain, blast, bsc, fraxtal, linea, mantle, metis, mode, optimism, scroll, zksync } from 'wagmi/chains';
import type { Address } from 'viem';
import { getRuntimeConfig } from '@/runtime-config';

const normalizeEnv = (value?: string) => (value ? value.trim() : '');
const parseNumberEnv = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const parseAddressEnv = (value?: string) => {
  const normalized = normalizeEnv(value);
  return /^0x[a-fA-F0-9]{40}$/.test(normalized) ? (normalized as Address) : null;
};

export type StakeNetworkKey =
  | 'ethereum'
  | 'arbitrum'
  | 'avalanche'
  | 'base'
  | 'berachain'
  | 'blast'
  | 'bsc'
  | 'frax'
  | 'hyperevm'
  | 'linea'
  | 'mantle'
  | 'metis'
  | 'mode'
  | 'optimism'
  | 'plasma'
  | 'scroll'
  | 'zksync';

export type StakeNetwork = StakeNetworkKey;

export type StakeNetworkConfig = {
  key: StakeNetworkKey;
  label: string;
  chainId: number;
  iconSrc: string;
  rpcUrl: string;
  lzEid: number | null;
  usdeOftAddress: Address | null;
};

const buildStakeNetworkConfigs = (): StakeNetworkConfig[] => {
  const runtimeConfig = getRuntimeConfig();
  const rpcs = runtimeConfig.rpcs ?? {};
  const chainIds = runtimeConfig.chainIds ?? {};
  const layerZeroEids = runtimeConfig.layerZero?.eids ?? {};
  const layerZeroOfts = runtimeConfig.layerZero?.usdeOftAddresses ?? {};

  const hyperEvmChainId = parseNumberEnv(chainIds.hyperevm ? String(chainIds.hyperevm) : undefined) ?? 0;
  const plasmaChainId = parseNumberEnv(chainIds.plasma ? String(chainIds.plasma) : undefined) ?? 0;

  return [
    {
      key: 'ethereum',
      label: 'Ethereum',
      chainId: 1,
      iconSrc: '/networks/ethereum.svg',
      rpcUrl: normalizeEnv(rpcs.ethereum),
      lzEid: parseNumberEnv(layerZeroEids.ethereum ? String(layerZeroEids.ethereum) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.ethereum)
    },
    {
      key: 'arbitrum',
      label: 'Arbitrum',
      chainId: arbitrum.id,
      iconSrc: '/networks/arbitrum.svg',
      rpcUrl: normalizeEnv(rpcs.arbitrum),
      lzEid: parseNumberEnv(layerZeroEids.arbitrum ? String(layerZeroEids.arbitrum) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.arbitrum)
    },
    {
      key: 'avalanche',
      label: 'Avalanche',
      chainId: avalanche.id,
      iconSrc: '/networks/avalanche.webp',
      rpcUrl: normalizeEnv(rpcs.avalanche),
      lzEid: parseNumberEnv(layerZeroEids.avalanche ? String(layerZeroEids.avalanche) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.avalanche)
    },
    {
      key: 'base',
      label: 'Base',
      chainId: base.id,
      iconSrc: '/networks/Base.svg',
      rpcUrl: normalizeEnv(rpcs.base),
      lzEid: parseNumberEnv(layerZeroEids.base ? String(layerZeroEids.base) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.base)
    },
    {
      key: 'berachain',
      label: 'Berachain',
      chainId: berachain.id,
      iconSrc: '/networks/berachain.webp',
      rpcUrl: normalizeEnv(rpcs.berachain),
      lzEid: parseNumberEnv(layerZeroEids.berachain ? String(layerZeroEids.berachain) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.berachain)
    },
    {
      key: 'blast',
      label: 'Blast',
      chainId: blast.id,
      iconSrc: '/networks/blast.ico',
      rpcUrl: normalizeEnv(rpcs.blast),
      lzEid: parseNumberEnv(layerZeroEids.blast ? String(layerZeroEids.blast) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.blast)
    },
    {
      key: 'bsc',
      label: 'BSC',
      chainId: bsc.id,
      iconSrc: '/networks/bsc.svg',
      rpcUrl: normalizeEnv(rpcs.bsc),
      lzEid: parseNumberEnv(layerZeroEids.bsc ? String(layerZeroEids.bsc) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.bsc)
    },
    {
      key: 'frax',
      label: 'Frax',
      chainId: fraxtal.id,
      iconSrc: '/networks/frax.svg',
      rpcUrl: normalizeEnv(rpcs.frax),
      lzEid: parseNumberEnv(layerZeroEids.frax ? String(layerZeroEids.frax) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.frax)
    },
    {
      key: 'hyperevm',
      label: 'HyperEVM',
      chainId: hyperEvmChainId,
      iconSrc: '/networks/hyperevm.webp',
      rpcUrl: normalizeEnv(rpcs.hyperevm),
      lzEid: parseNumberEnv(layerZeroEids.hyperevm ? String(layerZeroEids.hyperevm) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.hyperevm)
    },
    {
      key: 'linea',
      label: 'Linea',
      chainId: linea.id,
      iconSrc: '/networks/linea.svg',
      rpcUrl: normalizeEnv(rpcs.linea),
      lzEid: parseNumberEnv(layerZeroEids.linea ? String(layerZeroEids.linea) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.linea)
    },
    {
      key: 'mantle',
      label: 'Mantle',
      chainId: mantle.id,
      iconSrc: '/networks/mantle.ico',
      rpcUrl: normalizeEnv(rpcs.mantle),
      lzEid: parseNumberEnv(layerZeroEids.mantle ? String(layerZeroEids.mantle) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.mantle)
    },
    {
      key: 'metis',
      label: 'Metis',
      chainId: metis.id,
      iconSrc: '/networks/Metis.svg',
      rpcUrl: normalizeEnv(rpcs.metis),
      lzEid: parseNumberEnv(layerZeroEids.metis ? String(layerZeroEids.metis) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.metis)
    },
    {
      key: 'mode',
      label: 'Mode',
      chainId: mode.id,
      iconSrc: '/networks/mode.webp',
      rpcUrl: normalizeEnv(rpcs.mode),
      lzEid: parseNumberEnv(layerZeroEids.mode ? String(layerZeroEids.mode) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.mode)
    },
    {
      key: 'optimism',
      label: 'Optimism',
      chainId: optimism.id,
      iconSrc: '/networks/optimism.svg',
      rpcUrl: normalizeEnv(rpcs.optimism),
      lzEid: parseNumberEnv(layerZeroEids.optimism ? String(layerZeroEids.optimism) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.optimism)
    },
    {
      key: 'plasma',
      label: 'Plasma',
      chainId: plasmaChainId,
      iconSrc: '/networks/plasma.webp',
      rpcUrl: normalizeEnv(rpcs.plasma),
      lzEid: parseNumberEnv(layerZeroEids.plasma ? String(layerZeroEids.plasma) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.plasma)
    },
    {
      key: 'scroll',
      label: 'Scroll',
      chainId: scroll.id,
      iconSrc: '/networks/scroll.svg',
      rpcUrl: normalizeEnv(rpcs.scroll),
      lzEid: parseNumberEnv(layerZeroEids.scroll ? String(layerZeroEids.scroll) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.scroll)
    },
    {
      key: 'zksync',
      label: 'ZKsync',
      chainId: zksync.id,
      iconSrc: '/networks/Zksync.svg',
      rpcUrl: normalizeEnv(rpcs.zksync),
      lzEid: parseNumberEnv(layerZeroEids.zksync ? String(layerZeroEids.zksync) : undefined),
      usdeOftAddress: parseAddressEnv(layerZeroOfts.zksync)
    }
  ];
};

export const getActiveStakeNetworks = (): StakeNetworkConfig[] => {
  const stakeNetworkConfigs = buildStakeNetworkConfigs();
  return stakeNetworkConfigs.filter((network) => network.rpcUrl && network.chainId > 0);
};

export const getStakeNetworkByKey = (): Record<StakeNetworkKey, StakeNetworkConfig> => {
  const activeStakeNetworks = getActiveStakeNetworks();
  return activeStakeNetworks.reduce(
    (accumulator, network) => {
      accumulator[network.key] = network;
      return accumulator;
    },
    {} as Record<StakeNetworkKey, StakeNetworkConfig>
  );
};
