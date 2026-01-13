import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { providers } from "ethers";
import * as zksync from "@matterlabs/zksync-js";

export type WalletState = {
  address: string | null;
  chainId: number | null;
  provider: providers.Web3Provider | null;
  signer: providers.JsonRpcSigner | null;
  zksyncWallet: zksync.Wallet | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
};

const WalletContext = createContext<WalletState | undefined>(undefined);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<providers.JsonRpcSigner | null>(null);
  const [zksyncWallet, setZksyncWallet] = useState<zksync.Wallet | null>(null);

  const connect = async () => {
    if (!window.ethereum) {
      throw new Error("No injected wallet available");
    }
    const web3Provider = new providers.Web3Provider(window.ethereum as providers.ExternalProvider);
    await web3Provider.send("eth_requestAccounts", []);
    const nextSigner = web3Provider.getSigner();
    const nextAddress = await nextSigner.getAddress();
    const network = await web3Provider.getNetwork();
    setAddress(nextAddress);
    setChainId(network.chainId);
    setProvider(web3Provider);
    setSigner(nextSigner);
    setZksyncWallet(zksync.Wallet.fromEthSigner(nextSigner));
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
    setZksyncWallet(null);
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) {
      throw new Error("No injected wallet available");
    }
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${targetChainId.toString(16)}` }]
    });
  };

  const value = useMemo(
    () => ({
      address,
      chainId,
      provider,
      signer,
      zksyncWallet,
      connect,
      disconnect,
      switchNetwork
    }),
    [address, chainId, provider, signer, zksyncWallet]
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
