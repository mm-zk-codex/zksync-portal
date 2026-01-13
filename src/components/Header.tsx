import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useBrand } from "../runtime/brand";
import { useWallet } from "../runtime/wallet";
import { useAccount } from "../runtime/account";
import { chains } from "../utils/config";
import { SINGLE_CHAIN_KEY } from "../utils/env";

export const Header = () => {
  const { brand } = useBrand();
  const wallet = useWallet();
  const account = useAccount();
  const location = useLocation();
  const navigate = useNavigate();

  const handleConnect = async () => {
    try {
      await wallet.connect();
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleDisconnect = () => {
    wallet.disconnect();
  };

  const modeLabel = account.mode === "wallet" ? "Wallet connected" : "Watch mode";
  const modeDetail = account.address ?? "No address";

  const chainOptions = chains.map((chain) => ({
    value: chain.chainKey,
    label: chain.name
  }));

  const activeChainKey = location.pathname.startsWith("/chain/")
    ? location.pathname.split("/")[2]
    : SINGLE_CHAIN_KEY || "";

  const activityLink = activeChainKey ? `/chain/${activeChainKey}/activity` : "/";
  const finalizeLink = activeChainKey ? `/chain/${activeChainKey}/finalize` : "/";

  const handleChainChange = (value: string) => {
    navigate(`/chain/${value}`);
  };

  return (
    <header className="container" style={{ paddingBottom: 8 }}>
      <div className="flex space-between" style={{ alignItems: "center" }}>
        <div className="flex" style={{ gap: 16 }}>
          <img src={`/${brand.assets.logo}`} alt={brand.displayName} style={{ height: 32 }} />
          <div>
            <div style={{ fontWeight: 700 }}>{brand.copy.appName}</div>
            <div className="muted small">{brand.copy.tagline}</div>
          </div>
        </div>
        <div className="flex" style={{ gap: 16 }}>
          {SINGLE_CHAIN_KEY ? null : (
            <select
              className="input"
              value={activeChainKey}
              onChange={(event) => handleChainChange(event.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">Select chain</option>
              {chainOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          <div className="card" style={{ padding: "8px 12px" }}>
            <div className="small muted">{modeLabel}</div>
            <div className="small">{modeDetail}</div>
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
      <nav className="flex" style={{ gap: 16, marginTop: 12 }}>
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to={activityLink}>Activity</NavLink>
        <NavLink to={finalizeLink}>Finalize</NavLink>
      </nav>
    </header>
  );
};
