import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { chains } from "../utils/config";
import { SINGLE_CHAIN_KEY } from "../utils/env";
import { AccountModePanel } from "../components/AccountModePanel";
import { getChainLogo } from "../utils/assets";
import { LogoBadge } from "../components/LogoBadge";

export const LandingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (SINGLE_CHAIN_KEY) {
      navigate(`/chain/${SINGLE_CHAIN_KEY}`, { replace: true });
      return;
    }
    const chainKey = searchParams.get("chainKey");
    if (chainKey) {
      navigate(`/chain/${chainKey}`, { replace: true });
    }
  }, [navigate, searchParams]);

  const filteredChains = useMemo(() => {
    if (!filter) {
      return chains;
    }
    const lowered = filter.toLowerCase();
    return chains.filter((chain) => chain.name.toLowerCase().includes(lowered));
  }, [filter]);

  return (
    <main className="container">
      <h1>Elastic Network Portal</h1>
      <p className="muted">
        Select a chain to view deposit, withdraw, and finalization flows. This portal connects directly to RPCs and
        runs entirely in your browser.
      </p>
      <div className="search-row" style={{ margin: "24px 0" }}>
        <div className="search-col">
          <AccountModePanel />
        </div>
        <div className="search-col">
          <form
            className="search-panel"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <div className="search-bar">
              <input
                className="input search-input"
                placeholder="Search by chain"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
              <button className="search-button" type="button" aria-label="Search chains">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="grid grid-3">
        {filteredChains.map((chain) => (
          <button
            key={chain.chainKey}
            className="card card-button chain-card"
            onClick={() => navigate(`/chain/${chain.chainKey}`)}
          >
            <div className="chain-card-header">
              <LogoBadge label={chain.name} src={getChainLogo(chain)} size={44} />
              <div>
                <div className="chain-name">{chain.name}</div>
                <div className="small muted">{chain.networkType.toUpperCase()}</div>
              </div>
            </div>
            <div className="small muted">
              {chain.networkType.toUpperCase()} · Chain ID {chain.chainId}
            </div>
          </button>
        ))}
      </div>
    </main>
  );
};
