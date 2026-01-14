import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useBrand } from "../runtime/brand";
import { useWallet } from "../runtime/wallet";
import { useAccount } from "../runtime/account";
import { chains, getChain } from "../utils/config";
import { SINGLE_CHAIN_KEY } from "../utils/env";
import { ErrorNotice } from "./ErrorNotice";
import { normalizeError, type NormalizedError } from "../utils/errors";
import { ChainSelector } from "./ChainSelector";
import { AccountModeToggle } from "./AccountModeToggle";

export const Header = () => {
  const { brand } = useBrand();
  const wallet = useWallet();
  const account = useAccount();
  const location = useLocation();
  const navigate = useNavigate();
  const [connectError, setConnectError] = useState<NormalizedError | null>(null);

  const handleConnect = async () => {
    try {
      await wallet.connect();
      setConnectError(null);
    } catch (error) {
      setConnectError(normalizeError(error, { action: "Connect wallet" }));
    }
  };

  const handleDisconnect = () => {
    wallet.disconnect();
  };

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const routeChainKey = location.pathname.startsWith("/chain/") ? location.pathname.split("/")[2] : "";
  const queryChainKey = params.get("chainKey") ?? "";
  const activeChainKey = routeChainKey || queryChainKey || SINGLE_CHAIN_KEY || "";
  const selectedChain = activeChainKey ? getChain(activeChainKey) : undefined;
  const hasSelectedChain = Boolean(activeChainKey);

  const activityLink = activeChainKey ? `/chain/${activeChainKey}/activity` : "/";
  const finalizeLink = activeChainKey ? `/chain/${activeChainKey}/finalize` : "/";

  const handleChainChange = (value: string) => {
    navigate(`/chain/${value}`);
  };

  const addressLabel = "Active account";
  const addressValue = account.address
    ? `${account.mode === "wallet" ? "Wallet" : "Watching"}: ${account.address}`
    : "No address selected";

  const handleCopy = async () => {
    if (!account.address) {
      return;
    }
    await navigator.clipboard.writeText(account.address);
  };

  return (
    <header className="container" style={{ paddingBottom: 8 }}>
      <div className="flex space-between" style={{ alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div className="flex" style={{ gap: 16 }}>
          <img src={`/${brand.assets.logo}`} alt={brand.displayName} style={{ height: 32 }} />
          <div>
            <div style={{ fontWeight: 700 }}>{brand.copy.appName}</div>
            <div className="muted small">{brand.copy.tagline}</div>
          </div>
        </div>
        <div className="header-controls">
          {SINGLE_CHAIN_KEY ? null : (
            <ChainSelector chains={chains} activeChainKey={activeChainKey} onChange={handleChainChange} />
          )}
          <div className="account-stack">
            <AccountModeToggle mode={account.mode} onChange={account.setMode} compact />
            <div className="address-card">
              <div className="small muted">{addressLabel}</div>
              <div className="address-row">
                <span className="small">{addressValue}</span>
                <button className="icon-button" type="button" onClick={handleCopy} disabled={!account.address}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="2" y="2" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          {wallet.address ? (
            <button className="secondary-button" onClick={handleDisconnect}>
              Disconnect
            </button>
          ) : (
            <button className="primary-button" onClick={handleConnect}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
      {connectError ? <ErrorNotice error={connectError} variant="banner" /> : null}
      {SINGLE_CHAIN_KEY || hasSelectedChain ? (
        <nav className="flex" style={{ gap: 16, marginTop: 12 }}>
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to={activityLink}>Activity</NavLink>
          <NavLink to={finalizeLink}>Finalize</NavLink>
        </nav>
      ) : null}
      {!SINGLE_CHAIN_KEY && selectedChain ? (
        <div className="banner" style={{ marginTop: 12 }}>
          You are on <strong>{selectedChain.name}</strong>.
        </div>
      ) : null}
    </header>
  );
};
