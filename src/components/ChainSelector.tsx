import { useRef } from "react";
import type { ChainConfig } from "../utils/config";
import { getChainLogo } from "../utils/assets";
import { LogoBadge } from "./LogoBadge";

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

type ChainSelectorProps = {
  chains: ChainConfig[];
  activeChainKey: string;
  onChange: (value: string) => void;
};

export const ChainSelector = ({ chains, activeChainKey, onChange }: ChainSelectorProps) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const activeChain = chains.find((chain) => chain.chainKey === activeChainKey) ?? null;

  const handleSelect = (chainKey: string) => {
    onChange(chainKey);
    if (detailsRef.current) {
      detailsRef.current.removeAttribute("open");
    }
  };

  return (
    <details className="select chain-selector" ref={detailsRef}>
      <summary className="select-trigger">
        <LogoBadge
          label={activeChain?.name ?? "Chain"}
          src={getChainLogo(activeChain)}
          size={28}
          shape="rounded"
        />
        <div className="select-text">
          <div className="select-title">{activeChain?.name ?? "Select chain"}</div>
          <div className="small muted">
            {activeChain ? `${activeChain.networkType.toUpperCase()} · ${activeChain.chainId}` : "All chains"}
          </div>
        </div>
        <ChevronIcon />
      </summary>
      <div className="select-menu">
        {chains.map((chain) => (
          <button
            key={chain.chainKey}
            type="button"
            className="select-option"
            onClick={() => handleSelect(chain.chainKey)}
          >
            <LogoBadge label={chain.name} src={getChainLogo(chain)} size={24} shape="rounded" />
            <div>
              <div className="select-title">{chain.name}</div>
              <div className="small muted">
                {chain.networkType.toUpperCase()} · Chain ID {chain.chainId}
              </div>
            </div>
          </button>
        ))}
      </div>
    </details>
  );
};
