import { useEffect, useMemo, useState } from "react";
import { JsonRpcProvider } from "ethers";
import { ChainConfig } from "../utils/config";
import { pickRpcUrl } from "./chainRuntime";

export const useChainProviders = (chain: ChainConfig | undefined) => {
  const [rpcUrl, setRpcUrl] = useState<string | null>(null);
  const [isDegraded, setIsDegraded] = useState(false);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (!chain) {
        return;
      }
      const result = await pickRpcUrl(chain);
      if (isActive) {
        setRpcUrl(result.rpcUrl);
        setIsDegraded(result.isDegraded);
      }
    };
    load();
    return () => {
      isActive = false;
    };
  }, [chain]);

  const l2Provider = useMemo(() => (rpcUrl ? new JsonRpcProvider(rpcUrl) : null), [rpcUrl]);
  const l1Provider = useMemo(
    () => (chain ? new JsonRpcProvider(chain.l1RpcUrls[0], chain.l1ChainId) : null),
    [chain]
  );

  return { rpcUrl, l2Provider, l1Provider, isDegraded };
};
