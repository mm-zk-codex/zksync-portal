import { useState } from "react";
import { useAccount } from "../runtime/account";
import { useWallet } from "../runtime/wallet";
import { normalizeError, type NormalizedError } from "../utils/errors";
import { ErrorNotice } from "./ErrorNotice";
import { AccountModeToggle } from "./AccountModeToggle";
import { WatchAddressForm } from "./WatchAddressForm";

export const AccountModePanel = () => {
  const wallet = useWallet();
  const account = useAccount();
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

  return (
    <div className="card">
      <div className="flex space-between" style={{ alignItems: "flex-start" }}>
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Account mode</h3>
          <div className="small muted">Pick one mode to control the active account.</div>
        </div>
        <AccountModeToggle mode={account.mode} onChange={account.setMode} />
      </div>
      {account.mode === "wallet" ? (
        <div style={{ marginTop: 12 }}>
          <div className="small muted">Wallet mode lets you sign deposits, withdrawals, and finalizations.</div>
          <div className="link-row" style={{ marginTop: 12 }}>
            {wallet.address ? (
              <button className="secondary-button" onClick={handleDisconnect}>
                Disconnect wallet
              </button>
            ) : (
              <button className="primary-button" onClick={handleConnect}>
                Connect wallet
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div className="small muted">
            Watch mode is read-only. Paste any address to explore its activity without signing.
          </div>
          <div style={{ marginTop: 12 }}>
            <WatchAddressForm variant="inline" />
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>
            Wallet stays connected, but signing requires switching back to Wallet mode.
          </div>
        </div>
      )}
      {connectError ? <ErrorNotice error={connectError} variant="banner" /> : null}
    </div>
  );
};
