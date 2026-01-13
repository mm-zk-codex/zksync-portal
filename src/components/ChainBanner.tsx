import { ChainConfig } from "../utils/config";

export const ChainBanner = ({ chain }: { chain: ChainConfig }) => {
  return (
    <div className="banner">
      <div className="flex space-between">
        <div>
          <strong>{chain.name}</strong>
          <div className="muted small">Chain ID {chain.chainId}</div>
        </div>
        <div className="badge">{chain.networkType.toUpperCase()}</div>
      </div>
    </div>
  );
};
