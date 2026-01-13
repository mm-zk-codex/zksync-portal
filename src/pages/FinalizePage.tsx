import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import * as zksync from "@matterlabs/zksync-js";
import { ChainBanner } from "../components/ChainBanner";
import { CopyLinkButton } from "../components/CopyLinkButton";
import { TxStatusCard } from "../components/TxStatusCard";
import { useAccount } from "../runtime/account";
import { useWallet } from "../runtime/wallet";
import { useChainProviders } from "../runtime/useChainProviders";
import { useSyncWatchAddress } from "../runtime/useSyncWatchAddress";
import { getChain } from "../utils/config";
import { fetchWithdrawalStatus, finalizeWithdrawal } from "../runtime/withdrawal";
import { getExplorerTxUrl } from "../runtime/chainRuntime";
import { upsertStoredTx, StoredTx } from "../storage/txStore";

export const FinalizePage = () => {
  const { chainKey } = useParams();
  const [searchParams] = useSearchParams();
  const wallet = useWallet();
  const account = useAccount();
  useSyncWatchAddress();
  const chain = chainKey ? getChain(chainKey) : undefined;
  const { l2Provider, l1Provider, isDegraded } = useChainProviders(chain);
  const txHash = searchParams.get("txHash") ?? "";

  const [status, setStatus] = useState("Checking withdrawal status...");
  const [ready, setReady] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [tx, setTx] = useState<StoredTx | null>(null);

  const isChainMismatch = wallet.chainId ? wallet.chainId !== chain?.l1ChainId : false;

  useEffect(() => {
    let isActive = true;
    let timer: number;
    const poll = async () => {
      if (!l2Provider || !txHash) {
        return;
      }
      try {
        const result = await fetchWithdrawalStatus(l2Provider, txHash);
        if (!isActive) {
          return;
        }
        setStatus(result.details);
        setReady(result.label === "ready");
        setFinalized(result.label === "finalized");
      } catch (error) {
        if (isActive) {
          setStatus(`Unable to fetch withdrawal status: ${(error as Error).message}`);
        }
      }
      if (isActive) {
        timer = window.setTimeout(poll, 10000);
      }
    };
    poll();
    return () => {
      isActive = false;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [l2Provider, txHash]);

  if (!chain) {
    return (
      <main className="container">
        <h2>Chain not found</h2>
      </main>
    );
  }

  const submitFinalize = async () => {
    if (!wallet.signer || !l2Provider || !l1Provider || !txHash) {
      return;
    }
    setStatus("Submitting finalization...");
    try {
      const zkWallet = zksync.Wallet.fromEthSigner(wallet.signer, l2Provider, l1Provider);
      const finalizeTx = await finalizeWithdrawal(zkWallet, txHash);
      const explorerUrl = getExplorerTxUrl(chain, finalizeTx.hash);
      const stored: StoredTx = {
        id: `finalize-${finalizeTx.hash}`,
        type: "finalize",
        chainKey: chain.chainKey,
        address: wallet.address ?? account.address ?? "",
        token: "N/A",
        amount: "0",
        txHash: finalizeTx.hash,
        explorerUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "submitted"
      };
      upsertStoredTx(stored);
      setTx(stored);
      setStatus("Finalize transaction submitted.");
    } catch (error) {
      setStatus(`Finalize failed: ${(error as Error).message}`);
    }
  };

  return (
    <main className="container">
      <ChainBanner chain={chain} />
      {isDegraded ? <div className="banner warning">RPC degraded: using fallback RPC.</div> : null}
      <div className="card">
        <div className="flex space-between">
          <h2 className="section-title">Finalize withdrawal</h2>
          <CopyLinkButton />
        </div>
        <div className="small muted">Withdrawal tx hash</div>
        <div className="code small" style={{ marginBottom: 12 }}>
          {txHash || "Provide a txHash query parameter to finalize."}
        </div>
        {finalized ? (
          <div className="banner">Withdrawal already finalized.</div>
        ) : (
          <div className="banner warning">{status}</div>
        )}
        {isChainMismatch ? (
          <div className="banner warning">
            <div>Wallet is on the wrong network. Switch to chain ID {chain.l1ChainId}.</div>
            <button className="secondary-button" onClick={() => wallet.switchNetwork(chain.l1ChainId)}>
              Switch network
            </button>
          </div>
        ) : null}
        {account.isWatchMode ? (
          <div className="banner warning">Connect a wallet to finalize this withdrawal.</div>
        ) : null}
        <button
          className="primary-button"
          disabled={!ready || account.isWatchMode || isChainMismatch || !txHash}
          onClick={submitFinalize}
        >
          Finalize
        </button>
        <div className="small muted" style={{ marginTop: 12 }}>
          Finalization requires L1 confirmation and proof availability. Keep this tab open or return later.
        </div>
      </div>
      {tx ? (
        <div style={{ marginTop: 16 }}>
          <TxStatusCard tx={tx} />
        </div>
      ) : null}
    </main>
  );
};
