import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { chains } from "../utils/config";
import { SINGLE_CHAIN_KEY } from "../utils/env";
import { WatchAddressForm } from "../components/WatchAddressForm";

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
      <div className="grid" style={{ margin: "24px 0" }}>
        <WatchAddressForm />
        <div className="card">
          <label className="small muted">Search chains</label>
          <input
            className="input"
            placeholder="Search by name"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-3">
        {filteredChains.map((chain) => (
          <button
            key={chain.chainKey}
            className="card"
            style={{ textAlign: "left", cursor: "pointer" }}
            onClick={() => navigate(`/chain/${chain.chainKey}`)}
          >
            <h3 style={{ marginTop: 0 }}>{chain.name}</h3>
            <div className="small muted">Chain ID {chain.chainId}</div>
            <div className="small muted">Network {chain.networkType}</div>
          </button>
        ))}
      </div>
    </main>
  );
};
