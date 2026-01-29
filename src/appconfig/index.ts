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

export const LP_TOKEN_NAMES: Record<string, string> = {
  '0x4c9edd5852cd905f086c759e8383e09bff1e68b3': 'USDe',
  '0x8be3460a480c80728a8c4d7a5d5303c85ba7b3b9': 'StakedENA',
  '0x57e114b691db790c35207b2e685d4a43181e6061': 'Ethena',
  '0x02950460e2b9529d0e00284a5fa2d7bdf3fa4d72': 'CurveStableSwapNG',
  '0xf55b0f6f2da5ffddb104b58a60f2862745960442': 'CurveStableSwapNG',
  '0x1ab3d612ea7df26117554dddd379764ebce1a5ad': 'CurveStableSwapNG',
  '0x5dc1bf6f1e983c0b21efb003c105133736fa0743': 'CurveStableSwapNG',
  '0xf36a4ba50c603204c3fc6d2da8b78a7b69cbc67d': 'CurveStableSwapNG',
  '0x167478921b907422f8e88b43c4af2b8bea278d3a': 'CurveStableSwapNG',
  '0x670a72e6d22b0956c0d2573288f82dcc5d6e3a61': 'CurveStableSwapNG',
  '0xf8db2accdef8e7a26b0e65c3980adc8ce11671a4': 'CurveStableSwapNG',
  '0x74fd29b63766e9d05ed9d1181a365522d096ed6f': 'PendlePrincipalToken',
  '0x9946c55a34cd105f1e0cf815025eaecff7356487': 'PendlePrincipalToken',
  '0xafa002de2dadb57b2b04e32aa4f42a69adebf2fd': 'PendlePrincipalToken',
  '0x2d9bf9c1befd77c094461df615bdbe905895f7c6': 'CurveStableSwapNG'
};
