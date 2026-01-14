import brandsRaw from "../../config/brands.json";
import chainsRaw from "../../config/chains.json";
import tokensRaw from "../../config/tokens.json";

export type BrandConfig = {
  brandKey: string;
  displayName: string;
  assets: {
    logo: string;
    favicon: string;
    background: string;
  };
  theme: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    muted: string;
  };
  copy: {
    appName: string;
    tagline: string;
    footerLinks: { label: string; href: string }[];
  };
};

export type ChainConfig = {
  chainKey: string;
  chainId: number;
  name: string;
  networkType: "mainnet" | "testnet";
  rpcUrls: string[];
  explorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  l1ChainId: number;
  l1RpcUrls: string[];
  contracts: {
    l1Bridge: string;
    l2Bridge: string;
    l1SharedBridge: string;
    l2SharedBridge: string;
    l1Weth: string;
    l2Weth: string;
  };
  features: {
    deposits: boolean;
    withdrawals: boolean;
    finalizeSupported: boolean;
  };
  ui: {
    logoKey: string;
    themeKey: string;
  };
};

export type TokenConfig = {
  chainKey: string;
  tokens: {
    symbol: string;
    name: string;
    decimals: number;
    address: string | null;
    isNative: boolean;
    enabled: boolean;
    logoURI?: string;
  }[];
};

export const parseChains = (input: unknown): ChainConfig[] => {
  if (!Array.isArray(input)) {
    throw new Error("Chains config must be an array");
  }
  return input.map((chain) => {
    if (
      typeof chain !== "object" ||
      chain === null ||
      typeof (chain as ChainConfig).chainKey !== "string" ||
      typeof (chain as ChainConfig).chainId !== "number"
    ) {
      throw new Error("Invalid chain config entry");
    }
    return chain as ChainConfig;
  });
};

export const parseBrands = (input: unknown): BrandConfig[] => {
  if (!Array.isArray(input)) {
    throw new Error("Brands config must be an array");
  }
  return input.map((brand) => {
    if (
      typeof brand !== "object" ||
      brand === null ||
      typeof (brand as BrandConfig).brandKey !== "string"
    ) {
      throw new Error("Invalid brand config entry");
    }
    return brand as BrandConfig;
  });
};

export const parseTokens = (input: unknown): TokenConfig[] => {
  if (!Array.isArray(input)) {
    throw new Error("Tokens config must be an array");
  }
  return input.map((tokenGroup) => {
    if (
      typeof tokenGroup !== "object" ||
      tokenGroup === null ||
      typeof (tokenGroup as TokenConfig).chainKey !== "string"
    ) {
      throw new Error("Invalid token config entry");
    }
    return tokenGroup as TokenConfig;
  });
};

export const brands = parseBrands(brandsRaw);
export const chains = parseChains(chainsRaw);
export const tokens = parseTokens(tokensRaw);

export const getBrand = (brandKey: string) =>
  brands.find((brand) => brand.brandKey === brandKey) ?? brands[0];

export const getChain = (chainKey: string) =>
  chains.find((chain) => chain.chainKey === chainKey);

export const getTokensForChain = (chainKey: string) => {
  const group = tokens.find((entry) => entry.chainKey === chainKey);
  return group?.tokens.filter((token) => token.enabled) ?? [];
};
