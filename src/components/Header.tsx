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

const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

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
      account.setMode("wallet");
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
  const isWalletConnected = Boolean(wallet.address);

  const activityLink = activeChainKey ? `/chain/${activeChainKey}/activity` : "/";
  const finalizeLink = activeChainKey ? `/chain/${activeChainKey}/finalize` : "/";

  const handleChainChange = (value: string) => {
    navigate(`/chain/${value}`);
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) {
      return address;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCopy = async () => {
    if (!wallet.address) {
      return;
    }
    await navigator.clipboard.writeText(wallet.address);
  };

  return (
    <header className="container" style={{ paddingBottom: 8 }}>
      <div className="header-bar">
        <div className="header-brand">
          <NavLink to="/" className="brand-title">
            {brand.copy.appName}
          </NavLink>
          <div className="muted small">{brand.copy.tagline}</div>
        </div>
        <div className="header-controls">
          {SINGLE_CHAIN_KEY ? null : (
            <ChainSelector chains={chains} activeChainKey={activeChainKey} onChange={handleChainChange} />
          )}
          {isWalletConnected ? (
            <details className="account-menu">
              <summary className="account-trigger">
                <span className="small">{formatAddress(wallet.address!)}</span>
                <ChevronIcon />
              </summary>
              <div className="account-menu-panel">
                <button className="select-option" type="button" onClick={handleCopy}>
                  Copy address
                </button>
                <button className="select-option" type="button" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            </details>
          ) : (
            <button className="primary-button" onClick={handleConnect}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
      {connectError ? <ErrorNotice error={connectError} variant="banner" /> : null}
      {SINGLE_CHAIN_KEY || hasSelectedChain ? (
        <div style={{ marginTop: 12 }}>
          {selectedChain ? <div className="chain-title">{selectedChain.name}</div> : null}
          {isWalletConnected ? (
            <nav className="flex" style={{ gap: 16 }}>
              <NavLink to={activeChainKey ? `/chain/${activeChainKey}` : "/"} end>
                Home
              </NavLink>
              <NavLink to={activityLink}>Activity</NavLink>
              <NavLink to={finalizeLink}>Finalize</NavLink>
            </nav>
          ) : null}
        </div>
      ) : null}
    </header>
  );
};
