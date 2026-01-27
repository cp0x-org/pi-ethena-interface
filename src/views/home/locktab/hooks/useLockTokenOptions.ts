import { useEffect, useMemo, useState } from 'react';
import { useReadContracts } from 'wagmi';
import { ENA_LP_STAKING_LOGS_FROM_BLOCK, ENA_LP_STAKING_LOGS_TOPIC0, ETHERSCAN_API_KEY, ETHERSCAN_API_URL } from '@/appconfig';
import { erc20Config } from '@/appconfig/abi/Erc20';
import { useConfigChainId } from 'hooks/useConfigChainId';

type EtherscanLog = {
  topics: string[];
  data: string;
  blockNumber: string;
  logIndex: string;
};

type TokenLogEntry = {
  address: `0x${string}`;
  stakeLimit: bigint;
  cooldown: bigint;
  blockNumber: bigint;
  logIndex: bigint;
};

type TokenOption = {
  address: `0x${string}`;
  stakeLimit: bigint;
  cooldown: bigint;
  symbol?: string;
};

const parseAddress = (topic: string): `0x${string}` => {
  const normalized = topic.toLowerCase();
  return `0x${normalized.slice(-40)}` as `0x${string}`;
};

const parseEventData = (data: string) => {
  const normalized = data.startsWith('0x') ? data.slice(2) : data;
  if (normalized.length < 128) return null;
  const stakeLimit = BigInt(`0x${normalized.slice(0, 64)}`);
  const cooldown = BigInt(`0x${normalized.slice(64, 128)}`);
  return { stakeLimit, cooldown };
};

type UseLockTokenOptionsConfig = {
  includeZeroStakeLimit?: boolean;
};

export const useLockTokenOptions = ({ includeZeroStakeLimit = false }: UseLockTokenOptionsConfig = {}) => {
  const { config: chainConfig } = useConfigChainId();
  const stakingAddress = chainConfig.contracts.ENA_LP_STAKING as `0x${string}`;
  const [tokens, setTokens] = useState<TokenLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (!stakingAddress || !ETHERSCAN_API_KEY) {
      setTokens([]);
      return;
    }

    const controller = new AbortController();
    const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try {
        const params = new URLSearchParams({
          chainId: '1',
          module: 'logs',
          action: 'getLogs',
          address: stakingAddress,
          topic0: ENA_LP_STAKING_LOGS_TOPIC0,
          fromBlock: String(ENA_LP_STAKING_LOGS_FROM_BLOCK),
          toBlock: 'latest',
          apikey: ETHERSCAN_API_KEY
        });

        const response = await fetch(`${ETHERSCAN_API_URL}?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json();
        const logs = Array.isArray(payload?.result) ? (payload.result as EtherscanLog[]) : [];

        const latestByToken = new Map<`0x${string}`, TokenLogEntry>();

        logs.forEach((log) => {
          const { topics, data, blockNumber, logIndex } = log;
          if (!topics?.length || topics.length < 2) return;
          const parsed = parseEventData(data);
          if (!parsed) return;

          const tokenAddress = parseAddress(topics[1]);
          const nextEntry: TokenLogEntry = {
            address: tokenAddress,
            stakeLimit: parsed.stakeLimit,
            cooldown: parsed.cooldown,
            blockNumber: BigInt(blockNumber),
            logIndex: BigInt(logIndex)
          };

          const prevEntry = latestByToken.get(tokenAddress);
          if (!prevEntry) {
            latestByToken.set(tokenAddress, nextEntry);
            return;
          }

          if (nextEntry.blockNumber > prevEntry.blockNumber) {
            latestByToken.set(tokenAddress, nextEntry);
            return;
          }

          if (nextEntry.blockNumber === prevEntry.blockNumber && nextEntry.logIndex > prevEntry.logIndex) {
            latestByToken.set(tokenAddress, nextEntry);
          }
        });

        setTokens(Array.from(latestByToken.values()));
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setTokens([]);
        }
      } finally {
        setIsLoadingLogs(false);
      }
    };

    fetchLogs();

    return () => controller.abort();
  }, [stakingAddress]);

  const activeTokens = useMemo(
    () => (includeZeroStakeLimit ? tokens : tokens.filter((token) => token.stakeLimit > 0n)),
    [includeZeroStakeLimit, tokens]
  );

  const { data: symbolData, isLoading: isLoadingSymbols } = useReadContracts({
    contracts: activeTokens.map((token) => ({
      abi: erc20Config.abi,
      address: token.address,
      functionName: 'symbol'
    })),
    query: {
      enabled: activeTokens.length > 0
    }
  });

  const tokenOptions = useMemo<TokenOption[]>(() => {
    return activeTokens.map((token, index) => {
      const symbolResult = symbolData?.[index];
      const symbol = symbolResult?.status === 'success' ? symbolResult.result : undefined;
      return {
        address: token.address,
        stakeLimit: token.stakeLimit,
        cooldown: token.cooldown,
        symbol
      };
    });
  }, [activeTokens, symbolData]);

  return {
    tokens: tokenOptions,
    isLoading: isLoadingLogs || isLoadingSymbols
  };
};
