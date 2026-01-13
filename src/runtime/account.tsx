import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { utils as ethersUtils } from "ethers";
import { useWallet } from "./wallet";

type AccountMode = "wallet" | "watch";

type AccountState = {
  mode: AccountMode;
  address: string | null;
  watchAddress: string | null;
  setWatchAddress: (address: string | null) => void;
  clearWatchAddress: () => void;
  isWatchMode: boolean;
};

const STORAGE_KEY = "atlas_watch_address";

const AccountContext = createContext<AccountState | undefined>(undefined);

export const AccountProvider = ({ children }: { children: React.ReactNode }) => {
  const wallet = useWallet();
  const [watchAddress, setWatchAddressState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setWatchAddressState(stored);
    }
  }, []);

  const setWatchAddress = (address: string | null) => {
    if (address) {
      const checksummed = ethersUtils.getAddress(address);
      window.localStorage.setItem(STORAGE_KEY, checksummed);
      setWatchAddressState(checksummed);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      setWatchAddressState(null);
    }
  };

  const clearWatchAddress = () => setWatchAddress(null);

  const mode: AccountMode = wallet.address ? "wallet" : watchAddress ? "watch" : "watch";
  const address = wallet.address ?? watchAddress;

  const value = useMemo(
    () => ({
      mode,
      address,
      watchAddress,
      setWatchAddress,
      clearWatchAddress,
      isWatchMode: mode === "watch"
    }),
    [mode, address, watchAddress]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within AccountProvider");
  }
  return context;
};
