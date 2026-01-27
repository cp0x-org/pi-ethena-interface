export type RuntimeConfig = {
  walletConnectProjectId?: string;
  projectId?: string;
  rpcs?: Record<string, string>;
  chainIds?: Record<string, number>;
  layerZero?: {
    eids?: Record<string, number>;
    usdeOftAddresses?: Record<string, string>;
  };
};

const DEFAULT_CONFIG: RuntimeConfig = {
  walletConnectProjectId: '',
  rpcs: {},
  chainIds: {},
  layerZero: {
    eids: {},
    usdeOftAddresses: {}
  }
};

let runtimeConfig: RuntimeConfig | null = null;

export const loadRuntimeConfig = async (): Promise<RuntimeConfig> => {
  if (runtimeConfig) return runtimeConfig;
  try {
    const response = await fetch('/config.json', { cache: 'no-store' });
    if (!response.ok) {
      console.warn(`Failed to load config.json: ${response.status}`);
      runtimeConfig = { ...DEFAULT_CONFIG };
      return runtimeConfig;
    }
    runtimeConfig = (await response.json()) as RuntimeConfig;
    return runtimeConfig;
  } catch (error) {
    console.warn('Failed to load config.json', error);
    runtimeConfig = { ...DEFAULT_CONFIG };
    return runtimeConfig;
  }
};

export const getRuntimeConfig = (): RuntimeConfig => {
  return runtimeConfig ?? { ...DEFAULT_CONFIG };
};
