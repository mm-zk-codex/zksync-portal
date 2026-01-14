import { useRef } from "react";
import type { TokenConfig } from "../utils/config";
import { getTokenLogo } from "../utils/assets";
import { LogoBadge } from "./LogoBadge";

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

type TokenSelectProps = {
  tokens: TokenConfig["tokens"];
  value: string;
  onChange: (value: string) => void;
};

export const TokenSelect = ({ tokens, value, onChange }: TokenSelectProps) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const activeToken = tokens.find((token) => token.symbol === value) ?? tokens[0];

  const handleSelect = (symbol: string) => {
    onChange(symbol);
    if (detailsRef.current) {
      detailsRef.current.removeAttribute("open");
    }
  };

  return (
    <details className="select token-select" ref={detailsRef}>
      <summary className="select-trigger">
        <LogoBadge
          label={activeToken.name}
          src={getTokenLogo(activeToken.symbol, activeToken.logoURI)}
          size={24}
          shape="circle"
        />
        <div className="select-text">
          <div className="select-title">{activeToken.symbol}</div>
          <div className="small muted">{activeToken.name}</div>
        </div>
        <ChevronIcon />
      </summary>
      <div className="select-menu">
        {tokens.map((token) => (
          <button
            key={token.symbol}
            type="button"
            className="select-option"
            onClick={() => handleSelect(token.symbol)}
          >
            <LogoBadge label={token.name} src={getTokenLogo(token.symbol, token.logoURI)} size={24} shape="circle" />
            <div>
              <div className="select-title">{token.symbol}</div>
              <div className="small muted">{token.name}</div>
            </div>
          </button>
        ))}
      </div>
    </details>
  );
};
