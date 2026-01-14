import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getAddress } from "ethers";
import { useAccount } from "./account";

export const useSyncWatchAddress = () => {
  const [searchParams] = useSearchParams();
  const account = useAccount();

  useEffect(() => {
    const address = searchParams.get("address");
    if (address) {
      try {
        const checksum = getAddress(address);
        if (checksum !== account.watchAddress) {
          account.setWatchAddress(checksum);
        }
        if (account.mode !== "watch") {
          account.setMode("watch");
        }
      } catch {
        return;
      }
    }
  }, [searchParams, account]);
};
