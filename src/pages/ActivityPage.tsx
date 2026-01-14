import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChainBanner } from "../components/ChainBanner";
import { CopyLinkButton } from "../components/CopyLinkButton";
import { ErrorNotice } from "../components/ErrorNotice";
import { ExternalLinkButton } from "../components/ExternalLinkButton";
import { LogoBadge } from "../components/LogoBadge";
import { TxStatusCard } from "../components/TxStatusCard";
import { useAccount } from "../runtime/account";
import { useChainProviders } from "../runtime/useChainProviders";
import { useSyncWatchAddress } from "../runtime/useSyncWatchAddress";
import { getExplorerTxUrl } from "../runtime/chainRuntime";
import { getChain } from "../utils/config";
import { getTokenLogo } from "../utils/assets";
import { formatActivityTime } from "../utils/time";
import { getStoredTxs, StoredTx } from "../storage/txStore";
import { normalizeError, type NormalizedError } from "../utils/errors";

type HistoryItem = {
  hash: string;
  blockNumber?: number;
  timestamp?: number;
};

type ActivityItem =
  | {
      kind: "group";
      withdraw: StoredTx;
      finalize?: StoredTx;
      timestamp: number;
    }
  | {
      kind: "single";
      tx: StoredTx;
      timestamp: number;
    };

export const ActivityPage = () => {
  const { chainKey } = useParams();
  const [searchParams] = useSearchParams();
  const account = useAccount();
  useSyncWatchAddress();
  const chain = chainKey ? getChain(chainKey) : undefined;
  const { l2Provider, isDegraded, rpcUrl } = useChainProviders(chain);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<NormalizedError | null>(null);
  const [limit, setLimit] = useState(5);
  const [isFetching, setIsFetching] = useState(false);
  const [scanMeta, setScanMeta] = useState<{
    oldestScannedBlock?: number;
    oldestScannedTimestamp?: number;
    reachedLowerBound?: boolean;
  }>({});
  const navigate = useNavigate();

  const address = searchParams.get("address") ?? account.address ?? "";

  const storedTxs = useMemo(() => getStoredTxs(chainKey, address), [chainKey, address]);

  const activityItems = useMemo<ActivityItem[]>(() => {
    const finalizeMap = new Map<string, StoredTx[]>();
    const withdraws = storedTxs.filter((tx) => tx.type === "withdraw");
    const finalizeTxs = storedTxs.filter((tx) => tx.type === "finalize");

    for (const finalizeTx of finalizeTxs) {
      if (!finalizeTx.withdrawalTxHash) {
        continue;
      }
      const bucket = finalizeMap.get(finalizeTx.withdrawalTxHash) ?? [];
      bucket.push(finalizeTx);
      finalizeMap.set(finalizeTx.withdrawalTxHash, bucket);
    }

    const usedFinalizeIds = new Set<string>();

    const groups: ActivityItem[] = withdraws.map((withdraw) => {
      const finalizeMatches = finalizeMap.get(withdraw.txHash) ?? [];
      const latestFinalize = finalizeMatches.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (latestFinalize) {
        usedFinalizeIds.add(latestFinalize.id);
      }
      return {
        kind: "group",
        withdraw,
        finalize: latestFinalize,
        timestamp: Math.max(withdraw.updatedAt, latestFinalize?.updatedAt ?? 0)
      };
    });

    const singles: ActivityItem[] = storedTxs
      .filter((tx) => tx.type !== "withdraw" && !(tx.type === "finalize" && usedFinalizeIds.has(tx.id)))
      .map((tx) => ({
        kind: "single",
        tx,
        timestamp: tx.updatedAt
      }));

    return [...groups, ...singles].sort((a, b) => b.timestamp - a.timestamp);
  }, [storedTxs]);

  const fetchHistory = async () => {
    if (!l2Provider || !address) {
      return;
    }
    setIsFetching(true);
    setStatus("Fetching RPC history...");
    try {
      const anyProvider = l2Provider as unknown as { getHistory?: (addr: string) => Promise<any[]> };
      if (!anyProvider.getHistory) {
        setStatus("RPC provider does not support history. Showing locally stored transactions only.");
        setIsFetching(false);
        return;
      }
      const items = await anyProvider.getHistory(address);
      const normalized = items
        .map((item) => ({
          hash: item.hash ?? item.transactionHash,
          blockNumber: item.blockNumber
        }))
        .filter((item) => Boolean(item.hash));
      const sorted = normalized.sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0));
      const visible = sorted.slice(0, limit);

      const withTimestamps = await Promise.all(
        visible.map(async (item) => {
          if (!item.blockNumber) {
            return item;
          }
          const block = await l2Provider.getBlock(item.blockNumber);
          return {
            ...item,
            timestamp: block?.timestamp ? block.timestamp * 1000 : undefined
          };
        })
      );

      setHistory(withTimestamps);
      const oldest = withTimestamps[withTimestamps.length - 1];
      setScanMeta({
        oldestScannedBlock: oldest?.blockNumber,
        oldestScannedTimestamp: oldest?.timestamp,
        reachedLowerBound: sorted.length <= limit
      });
      setStatus(null);
      setStatusError(null);
    } catch (error) {
      setStatus("Unable to fetch history.");
      setStatusError(
        normalizeError(error, {
          action: "Fetch history",
          chainKey: chain?.chainKey,
          rpcUrl,
          address
        })
      );
    } finally {
      setIsFetching(false);
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

  const scanInfo = scanMeta.oldestScannedBlock
    ? `Scanned back to block ${scanMeta.oldestScannedBlock}${
        scanMeta.oldestScannedTimestamp
          ? ` (${formatActivityTime(scanMeta.oldestScannedTimestamp)})`
          : ""
      }.`
    : "No RPC history scanned yet.";

  const reachedLowerBoundText = scanMeta.reachedLowerBound ? "Reached earliest scan limit." : "";

  return (
    <main className="container">
      <ChainBanner chain={chain} />
      {isDegraded ? <div className="banner warning">RPC degraded: using fallback RPC.</div> : null}
      <div className="card">
        <div className="flex space-between" style={{ alignItems: "center" }}>
          <h2 className="section-title">Activity</h2>
          <div className="link-row">
            <button className="secondary-button" onClick={fetchHistory} disabled={isFetching}>
              {isFetching ? <span className="spinner" /> : null}
              Refresh
            </button>
            <CopyLinkButton />
          </div>
        </div>
        <div className="small muted">Address</div>
        <div className="code small" style={{ marginBottom: 12 }}>
          {address || "Provide an address query parameter or connect a wallet."}
        </div>
        <div className="banner warning">
          RPC-based history may be incomplete without an indexer. Locally stored transactions are listed first.
        </div>
        {status ? <div className="small muted" style={{ marginTop: 12 }}>{status}</div> : null}
        {statusError ? <ErrorNotice error={statusError} variant="banner" /> : null}
      </div>
      <div className="grid" style={{ marginTop: 16 }}>
        {activityItems.map((item) => {
          if (item.kind === "single") {
            return <TxStatusCard key={item.tx.id} tx={item.tx} />;
          }
          const finalizeTime = item.finalize?.updatedAt ?? item.finalize?.createdAt;
          return (
            <div key={item.withdraw.id} className="card activity-card">
              <div className="flex space-between">
                <div>
                  <strong>Withdrawal</strong>
                  <div className="small muted">{formatActivityTime(item.timestamp)}</div>
                </div>
                <span className="badge">{item.withdraw.status}</span>
              </div>
              <div className="activity-row">
                <LogoBadge
                  label={item.withdraw.token}
                  src={getTokenLogo(item.withdraw.token)}
                  size={30}
                  shape="circle"
                />
                <div>
                  <div className="small muted">Amount</div>
                  <div>
                    {item.withdraw.amount} {item.withdraw.token}
                  </div>
                </div>
                {item.withdraw.explorerUrl ? (
                  <ExternalLinkButton href={item.withdraw.explorerUrl} label="View withdrawal on explorer" />
                ) : null}
              </div>
              <div className="small muted">Withdrawal tx hash</div>
              <div className="code small">{item.withdraw.txHash}</div>
              <div className="activity-divider" />
              <div className="flex space-between" style={{ alignItems: "center" }}>
                <div>
                  <strong>Finalization</strong>
                  <div className="small muted">
                    {item.finalize ? formatActivityTime(finalizeTime) : "Not finalized"}
                  </div>
                </div>
                <span className="badge">{item.finalize ? item.finalize.status : "Pending"}</span>
              </div>
              {item.finalize ? (
                <>
                  <div className="activity-row">
                    <div>
                      <div className="small muted">Finalize tx hash</div>
                      <div className="code small">{item.finalize.txHash}</div>
                    </div>
                    {item.finalize.explorerUrl ? (
                      <ExternalLinkButton href={item.finalize.explorerUrl} label="View finalization on explorer" />
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="link-row" style={{ marginTop: 12 }}>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      navigate(`/chain/${chain.chainKey}/finalize?txHash=${item.withdraw.txHash}`)
                    }
                  >
                    Go to finalize
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {history.map((item) => (
          <div key={item.hash} className="card activity-card">
            <div className="flex space-between">
              <div>
                <strong>RPC transaction</strong>
                <div className="small muted">
                  {item.timestamp ? formatActivityTime(item.timestamp) : "Timestamp unavailable"}
                </div>
              </div>
            </div>
            <div className="code small">{item.hash}</div>
            <div className="activity-row" style={{ marginTop: 8 }}>
              <div className="small muted">Block {item.blockNumber ?? "-"}</div>
              <ExternalLinkButton href={getExplorerTxUrl(chain, item.hash)} label="View on explorer" />
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="link-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <button
            className="secondary-button"
            onClick={() => setLimit((prev) => prev + 5)}
            disabled={isFetching || scanMeta.reachedLowerBound}
          >
            {isFetching ? <span className="spinner" /> : null}
            Load more
          </button>
          <div className="small muted" style={{ textAlign: "right" }}>
            <div>{scanInfo}</div>
            {reachedLowerBoundText ? <div>{reachedLowerBoundText}</div> : null}
          </div>
        </div>
      </div>
    </main>
  );
};
