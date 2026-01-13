import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { utils as ethersUtils } from "ethers";
import { useAccount } from "./account";

export const useSyncWatchAddress = () => {
  const [searchParams] = useSearchParams();
  const account = useAccount();

  useEffect(() => {
    const address = searchParams.get("address");
    if (address) {
      try {
        const checksum = ethersUtils.getAddress(address);
        if (checksum !== account.watchAddress) {
          account.setWatchAddress(checksum);
        }
      } catch {
        return;
      }
    }
  }, [searchParams, account]);
};
