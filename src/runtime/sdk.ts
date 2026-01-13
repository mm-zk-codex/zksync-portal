import { JsonRpcProvider, type Signer } from "ethers";
import { createEthersClient, createEthersSdk, type EthersSdk } from "@matterlabs/zksync-js/ethers";

export const createSdk = (options: {
  l1Provider: JsonRpcProvider;
  l2Provider: JsonRpcProvider;
  signer: Signer;
}): EthersSdk => {
  const client = createEthersClient({
    l1: options.l1Provider,
    l2: options.l2Provider,
    signer: options.signer
  });
  return createEthersSdk(client);
};
