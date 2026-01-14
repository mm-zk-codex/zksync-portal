import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAddress } from "ethers";
import { useWallet } from "./wallet";

export type AccountMode = "wallet" | "watch";

type AccountState = {
  mode: AccountMode;
  address: string | null;
  watchAddress: string | null;
  setWatchAddress: (address: string | null) => void;
  clearWatchAddress: () => void;
  isWatchMode: boolean;
  setMode: (mode: AccountMode) => void;
};

const STORAGE_KEY = "atlas_watch_address";
const MODE_STORAGE_KEY = "atlas_account_mode";

const AccountContext = createContext<AccountState | undefined>(undefined);

export const AccountProvider = ({ children }: { children: React.ReactNode }) => {
  const wallet = useWallet();
  const [watchAddress, setWatchAddressState] = useState<string | null>(null);
  const [mode, setModeState] = useState<AccountMode>("watch");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setWatchAddressState(stored);
    }
    const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY) as AccountMode | null;
    if (storedMode === "wallet" || storedMode === "watch") {
      setModeState(storedMode);
    }
  }, []);

  const setWatchAddress = (address: string | null) => {
    if (address) {
      const checksummed = getAddress(address);
      window.localStorage.setItem(STORAGE_KEY, checksummed);
      setWatchAddressState(checksummed);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      setWatchAddressState(null);
    }
  };

  const clearWatchAddress = () => setWatchAddress(null);

  useEffect(() => {
    if (!wallet.address && mode === "wallet") {
      setModeState("watch");
    }
  }, [wallet.address, mode]);

  const setMode = (nextMode: AccountMode) => {
    setModeState(nextMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODE_STORAGE_KEY, nextMode);
    }
  };

  const address = mode === "wallet" ? wallet.address : watchAddress;

  const value = useMemo(
    () => ({
      mode,
      address,
      watchAddress,
      setWatchAddress,
      clearWatchAddress,
      isWatchMode: mode === "watch",
      setMode
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
