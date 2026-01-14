import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BrowserProvider, JsonRpcSigner, type Eip1193Provider } from "ethers";
import { ChainConfig } from "../utils/config";

export type WalletState = {
  address: string | null;
  chainId: number | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (options: { targetChainId: number; chain?: ChainConfig }) => Promise<void>;
};

const WalletContext = createContext<WalletState | undefined>(undefined);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);

  const connect = async () => {
    if (!window.ethereum) {
      throw new Error("No injected wallet available");
    }
    const web3Provider = new BrowserProvider(window.ethereum as Eip1193Provider);
    const accounts = (await web3Provider.send("eth_requestAccounts", [])) as string[];
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts returned from wallet.");
    }
    const nextSigner = await web3Provider.getSigner();
    const nextAddress = await nextSigner.getAddress();
    const network = await web3Provider.getNetwork();
    setAddress(nextAddress);
    setChainId(Number(network.chainId));
    setProvider(web3Provider);
    setSigner(nextSigner);
  };

  useEffect(() => {
    if (!window.ethereum || !provider) {
      return;
    }
    const handleAccounts = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
      }
    };
    const handleChain = (chainIdHex: string) => {
      const nextChainId = parseInt(chainIdHex, 16);
      setChainId(nextChainId);
    };
    window.ethereum.on?.("accountsChanged", handleAccounts);
    window.ethereum.on?.("chainChanged", handleChain);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccounts);
      window.ethereum?.removeListener?.("chainChanged", handleChain);
    };
  }, [provider]);

  const disconnect = () => {
    setAddress(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
  };

  const isUnknownChainError = (error: unknown) => {
    if (error && typeof error === "object" && "code" in error) {
      return (error as { code?: number }).code === 4902;
    }
    if (error && typeof error === "object" && "message" in error) {
      const message = String((error as { message?: string }).message).toLowerCase();
      return message.includes("unrecognized chain") || message.includes("unknown chain");
    }
    return false;
  };

  const switchNetwork = async ({ targetChainId, chain }: { targetChainId: number; chain?: ChainConfig }) => {
    if (!window.ethereum) {
      throw new Error("No injected wallet available");
    }
    const chainIdHex = `0x${targetChainId.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }]
      });
    } catch (error) {
      if (!isUnknownChainError(error)) {
        throw error;
      }
      if (!chain || chain.chainId !== targetChainId) {
        throw new Error("This chain can’t be added automatically; missing wallet metadata in config.");
      }
      if (!chain.rpcUrls.length || !chain.explorerUrls.length || !chain.nativeCurrency) {
        throw new Error("This chain can’t be added automatically; missing wallet metadata in config.");
      }
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: chain.name,
            rpcUrls: chain.rpcUrls,
            nativeCurrency: chain.nativeCurrency,
            blockExplorerUrls: chain.explorerUrls
          }
        ]
      });
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }]
      });
    }
  };

  const value = useMemo(
    () => ({
      address,
      chainId,
      provider,
      signer,
      connect,
      disconnect,
      switchNetwork
    }),
    [address, chainId, provider, signer]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
};
