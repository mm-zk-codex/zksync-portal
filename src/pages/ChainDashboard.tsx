import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AccountModePanel } from "../components/AccountModePanel";
import { useAccount } from "../runtime/account";
import { useWallet } from "../runtime/wallet";
import { useSyncWatchAddress } from "../runtime/useSyncWatchAddress";
import { getChain, getTokensForChain } from "../utils/config";
import { buildQueryParams } from "../utils/deeplink";
import { getTokenLogo } from "../utils/assets";
import { LogoBadge } from "../components/LogoBadge";

export const ChainDashboard = () => {
  const { chainKey } = useParams();
  const [searchParams] = useSearchParams();
  const account = useAccount();
  const wallet = useWallet();
  const navigate = useNavigate();
  useSyncWatchAddress();

  const chain = chainKey ? getChain(chainKey) : undefined;
  const tokens = useMemo(() => (chainKey ? getTokensForChain(chainKey) : []), [chainKey]);

  if (!chain) {
    return (
      <main className="container">
        <h2>Chain not found</h2>
      </main>
    );
  }

  const addressParam = searchParams.get("address") ?? account.watchAddress ?? "";

  const openRoute = (path: string, params?: Record<string, string>) => {
    const query = buildQueryParams({
      address: addressParam || undefined,
      ...params
    });
    navigate(`/chain/${chain.chainKey}${path}${query}`);
  };

  return (
    <main className="container">
      <div className="grid" style={{ marginBottom: 16 }}>
        {wallet.address ? (
          <div className="actions-row">
            <div className="link-row">
              <button className="primary-button" onClick={() => openRoute("/deposit")}>Deposit</button>
              <button className="secondary-button" onClick={() => openRoute("/withdraw")}>Withdraw</button>
            </div>
            <div className="actions-search">
              <AccountModePanel />
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="section-title">Connect a wallet to continue</div>
            <div className="small muted" style={{ marginTop: 6 }}>
              Deposits and withdrawals require a connected wallet.
            </div>
          </div>
        )}
      </div>
      {wallet.address ? (
        <div className="card">
          <h3 className="section-title">Available tokens</h3>
          <div className="grid grid-3">
            {tokens.map((token) => (
              <div key={token.symbol} className="card token-card">
                <div className="flex" style={{ gap: 12, alignItems: "center" }}>
                  <LogoBadge
                    label={token.name}
                    src={getTokenLogo(token.symbol, token.logoURI)}
                    size={36}
                    shape="circle"
                  />
                  <div>
                    <strong>{token.symbol}</strong>
                    <div className="small muted">{token.name}</div>
                  </div>
                </div>
                <div className="link-row" style={{ marginTop: 8 }}>
                  <button className="secondary-button" onClick={() => openRoute("/deposit", { token: token.symbol })}>
                    Deposit
                  </button>
                  <button className="secondary-button" onClick={() => openRoute("/withdraw", { token: token.symbol })}>
                    Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
};
