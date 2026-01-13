import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ChainBanner } from "../components/ChainBanner";
import { CopyLinkButton } from "../components/CopyLinkButton";
import { TxStatusCard } from "../components/TxStatusCard";
import { useAccount } from "../runtime/account";
import { useChainProviders } from "../runtime/useChainProviders";
import { useSyncWatchAddress } from "../runtime/useSyncWatchAddress";
import { getChain } from "../utils/config";
import { getStoredTxs } from "../storage/txStore";
import { getExplorerTxUrl } from "../runtime/chainRuntime";

export const ActivityPage = () => {
  const { chainKey } = useParams();
  const [searchParams] = useSearchParams();
  const account = useAccount();
  useSyncWatchAddress();
  const chain = chainKey ? getChain(chainKey) : undefined;
  const { l2Provider, isDegraded } = useChainProviders(chain);
  const [history, setHistory] = useState<{ hash: string; status?: number }[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [limit, setLimit] = useState(5);

  const address = searchParams.get("address") ?? account.address ?? "";

  const storedTxs = useMemo(() => getStoredTxs(chainKey, address), [chainKey, address]);

  const fetchHistory = async () => {
    if (!l2Provider || !address) {
      return;
    }
    setStatus("Fetching RPC history...");
    try {
      const anyProvider = l2Provider as unknown as { getHistory?: (addr: string) => Promise<{ hash: string }[]> };
      if (!anyProvider.getHistory) {
        setStatus("RPC provider does not support history. Showing locally stored transactions only.");
        return;
      }
      const items = await anyProvider.getHistory(address);
      setHistory(items.slice(0, limit));
      setStatus(null);
    } catch (error) {
      setStatus(`Unable to fetch history: ${(error as Error).message}`);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [address, l2Provider, limit]);

  if (!chain) {
    return (
      <main className="container">
        <h2>Chain not found</h2>
      </main>
    );
  }

  return (
    <main className="container">
      <ChainBanner chain={chain} />
      {isDegraded ? <div className="banner warning">RPC degraded: using fallback RPC.</div> : null}
      <div className="card">
        <div className="flex space-between">
          <h2 className="section-title">Activity</h2>
          <CopyLinkButton />
        </div>
        <div className="small muted">Address</div>
        <div className="code small" style={{ marginBottom: 12 }}>
          {address || "Provide an address query parameter or connect a wallet."}
        </div>
        <div className="banner warning">
          RPC-based history may be incomplete without an indexer. Locally stored transactions are listed first.
        </div>
        <div className="link-row">
          <button className="secondary-button" onClick={fetchHistory}>
            Refresh
          </button>
          <button className="secondary-button" onClick={() => setLimit((prev) => prev + 5)}>
            Load more
          </button>
        </div>
        {status ? <div className="small muted" style={{ marginTop: 12 }}>{status}</div> : null}
      </div>
      <div className="grid" style={{ marginTop: 16 }}>
        {storedTxs.map((tx) => (
          <TxStatusCard key={tx.id} tx={tx} />
        ))}
        {history.map((item) => (
          <div key={item.hash} className="card">
            <div className="small muted">RPC transaction</div>
            <div className="code small">{item.hash}</div>
            <div style={{ marginTop: 8 }}>
              <a
                className="secondary-button"
                href={getExplorerTxUrl(chain, item.hash)}
                target="_blank"
                rel="noreferrer"
              >
                View on explorer
              </a>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};
