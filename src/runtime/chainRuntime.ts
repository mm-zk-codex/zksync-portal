import { providers, utils as ethersUtils } from "ethers";
import * as zksync from "@matterlabs/zksync-js";
import { ChainConfig } from "../utils/config";

export type RpcState = {
  rpcUrl: string;
  isDegraded: boolean;
};

export const pickRpcUrl = async (chain: ChainConfig): Promise<RpcState> => {
  for (const rpcUrl of chain.rpcUrls) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_chainId",
          params: []
        })
      });
      if (response.ok) {
        return { rpcUrl, isDegraded: false };
      }
    } catch {
      continue;
    }
  }
  return { rpcUrl: chain.rpcUrls[0], isDegraded: true };
};

export const createL2Provider = (rpcUrl: string) => new zksync.Provider(rpcUrl);

export const createL1Provider = (chain: ChainConfig) =>
  new providers.JsonRpcProvider(chain.l1RpcUrls[0], chain.l1ChainId);

export const getExplorerTxUrl = (chain: ChainConfig, txHash: string) =>
  `${chain.explorerUrls[0]}/tx/${txHash}`;

export const formatAmount = (amount: string, decimals: number) => {
  try {
    return ethersUtils.formatUnits(amount, decimals);
  } catch {
    return amount;
  }
};

export const parseAmount = (amount: string, decimals: number) =>
  ethersUtils.parseUnits(amount || "0", decimals);
