export const Mainnet = 1;
export const Arbitrum = 42161;
export const Base = 8453;
export const AnvilTest = 1222;
export const TenderlyTest = 1999999;
import { mainnet } from 'wagmi/chains';

export const appChainConfig = {
  [mainnet.id]: {
    contracts: {
      ENA: '0x57e114b691db790c35207b2e685d4a43181e6061',
      ENA_LP_STAKING: '0x8707f238936c12c309bfc2B9959C35828AcFc512',
      SENA: '0x8be3460a480c80728a8c4d7a5d5303c85ba7b3b9',
      USDE: '0x4c9edd5852cd905f086c759e8383e09bff1e68b3',
      SUSDE: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497', // staked USDE v2
      StakedUSDeOFTAdapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2' // IGNORE
    }
  }
} as const;

export const ETHERSCAN_API_URL = 'https://api.etherscan.io/v2/api';
export const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY ?? 'B3YQTMH75Q18WAXMETH5SSKS24YUUA64PI';
export const ENA_LP_STAKING_LOGS_FROM_BLOCK = 18970882;
export const ENA_LP_STAKING_LOGS_TOPIC0 = '0xe9ea56618d31afea8558726ec90e5fef0c46d19e0674b8462b208da51359ed79';
export const SUSDE_VAULT_COMPOSER = '0x424B7a72BBc3C7FE201ce2EfA4a29c6624B0ee81';

export const ENA = '0x57e114b691db790c35207b2e685d4a43181e6061'; // USDE v2
export const USDE = '0x4c9edd5852cd905f086c759e8383e09bff1e68b3'; // USDE v2
export const SUSDE = '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497'; // staked USDE v2
export const USDeOFTAdapter = '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34';
export const StakedUSDeOFTAdapter = '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2'; // most l2

export const OUTPUT_DECIMALS = 6;

export const addressToTokenMap = {
  '0x57e114b691db790c35207b2e685d4a43181e6061': 'ENA',
  '0x8707f238936c12c309bfc2B9959C35828AcFc512': 'ENA_LP_STAKING',
  '0x8be3460a480c80728a8c4d7a5d5303c85ba7b3b9': 'SENA',
  '0x4c9edd5852cd905f086c759e8383e09bff1e68b3': 'USDE',
  '0x9d39a5de30e57443bff2a8307a4256c8797a3497': 'SUSDE',
  '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2': 'StakedUSDeOFTAdapter' // IGNORE
} as const;

export const TOKEN_DECIMALS = 18;
