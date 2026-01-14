import { ChainConfig } from "../utils/config";
import { getChainLogo } from "../utils/assets";
import { LogoBadge } from "./LogoBadge";

export const ChainBanner = ({ chain }: { chain: ChainConfig }) => {
  return (
    <div className="banner">
      <div className="flex space-between">
        <div className="flex" style={{ gap: 12 }}>
          <LogoBadge label={chain.name} src={getChainLogo(chain)} size={36} />
          <div>
            <div className="small muted">You are on</div>
            <strong>{chain.name}</strong>
            <div className="muted small">Chain ID {chain.chainId}</div>
          </div>
        </div>
        <div className="badge">{chain.networkType.toUpperCase()}</div>
      </div>
    </div>
  );
};
