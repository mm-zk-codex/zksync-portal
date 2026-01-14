import type { ChainConfig } from "./config";

import chainZkosTestnet1 from "../assets/chains/chain-zkos-testnet-1.svg";
import chainZkosTestnet2 from "../assets/chains/chain-zkos-testnet-2.svg";
import tokenEth from "../assets/tokens/token-ETH.svg";
import tokenUsdc from "../assets/tokens/token-USDC.svg";
import tokenDai from "../assets/tokens/token-DAI.svg";
import tokenTeth from "../assets/tokens/token-tETH.svg";
import tokenTusdc from "../assets/tokens/token-tUSDC.svg";

const localAssets = import.meta.glob("../assets/**/*.svg", { eager: true, as: "url" });

const chainLogoMap: Record<string, string> = {
  "zkos-testnet-1": chainZkosTestnet1,
  "zkos-testnet-2": chainZkosTestnet2
};

const tokenLogoMap: Record<string, string> = {
  ETH: tokenEth,
  USDC: tokenUsdc,
  DAI: tokenDai,
  tETH: tokenTeth,
  tUSDC: tokenTusdc
};

const normalizeAssetPath = (value: string) => value.replace(/^\/+/, "");

export const resolveLogoUri = (logoURI?: string) => {
  if (!logoURI) {
    return null;
  }
  if (logoURI.startsWith("http://") || logoURI.startsWith("https://")) {
    return logoURI;
  }
  const normalized = normalizeAssetPath(logoURI);
  const match = Object.entries(localAssets).find(([key]) => key.endsWith(normalized));
  if (match) {
    return match[1] as string;
  }
  return `/${normalized}`;
};

export const getChainLogo = (chain?: ChainConfig | null) => {
  if (!chain) {
    return null;
  }
  return chainLogoMap[chain.chainKey] ?? null;
};

export const getTokenLogo = (symbol: string, logoURI?: string) => {
  return resolveLogoUri(logoURI) ?? tokenLogoMap[symbol] ?? null;
};

export const getInitials = (label: string) => {
  if (!label) {
    return "?";
  }
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};
