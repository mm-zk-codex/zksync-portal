import { useEffect, useState } from "react";
import { VoidSigner, ZeroAddress } from "ethers";
import { useParams, useSearchParams } from "react-router-dom";
import { ChainBanner } from "../components/ChainBanner";
import { CopyLinkButton } from "../components/CopyLinkButton";
import { ErrorNotice } from "../components/ErrorNotice";
import { TxStatusCard } from "../components/TxStatusCard";
import { useAccount } from "../runtime/account";
import { useWallet } from "../runtime/wallet";
import { useChainProviders } from "../runtime/useChainProviders";
import { useSyncWatchAddress } from "../runtime/useSyncWatchAddress";
import { getChain } from "../utils/config";
import { createSdk } from "../runtime/sdk";
import { getExplorerTxUrl } from "../runtime/chainRuntime";
import { upsertStoredTx, StoredTx } from "../storage/txStore";
import { normalizeError, type NormalizedError } from "../utils/errors";

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
  const [statusError, setStatusError] = useState<NormalizedError | null>(null);
  const [submitError, setSubmitError] = useState<NormalizedError | null>(null);
  const [networkError, setNetworkError] = useState<NormalizedError | null>(null);

  const isChainMismatch = wallet.chainId ? wallet.chainId !== chain?.l1ChainId : false;

  useEffect(() => {
    let isActive = true;
    let timer: number;
    const poll = async () => {
      if (!l2Provider || !l1Provider || !txHash) {
        return;
      }
      try {
        const signer =
          wallet.signer ??
          new VoidSigner(account.address ?? ZeroAddress, l1Provider);
        const sdk = createSdk({ l1Provider, l2Provider, signer });
        const result = await sdk.withdrawals.status(txHash as `0x${string}`);
        if (!isActive) {
          return;
        }
        const statusValue =
          typeof result === "object" && result
            ? ((result as { status?: string; state?: string }).status ??
              (result as { status?: string; state?: string }).state ??
              "")
            : "";
        if (statusValue === "ready" || statusValue === "ready-to-finalize") {
          setStatus("Withdrawal is ready to finalize.");
          setReady(true);
          setFinalized(false);
          setStatusError(null);
        } else if (statusValue === "finalized" || statusValue === "completed") {
          setStatus("Withdrawal already finalized.");
          setReady(false);
          setFinalized(true);
          setStatusError(null);
        } else {
          setStatus("Withdrawal not yet ready for finalization.");
          setReady(false);
          setFinalized(false);
          setStatusError(null);
        }
      } catch (error) {
        if (isActive) {
          setStatus("Unable to fetch withdrawal status.");
          setStatusError(
            normalizeError(error, {
              action: "Fetch withdrawal status",
              chainKey: chain?.chainKey,
              rpcUrl: chain?.l1RpcUrls[0]
            })
          );
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
  }, [account.address, l1Provider, l2Provider, txHash, wallet.signer]);

  if (!chain) {
    return (
      <main className="container">
        <h2>Chain not found</h2>
      </main>
    );
  }

  const handleNetworkSwitch = async () => {
    setNetworkError(null);
    try {
      await wallet.switchNetwork({ targetChainId: chain.l1ChainId });
    } catch (error) {
      setNetworkError(
        normalizeError(error, {
          action: "Switch network",
          targetChainId: chain.l1ChainId
        })
      );
    }
  };

  const submitFinalize = async () => {
    if (!wallet.signer || !l2Provider || !l1Provider || !txHash) {
      return;
    }
    setSubmitError(null);
    setStatus("Submitting finalization...");
    try {
      const sdk = createSdk({ l1Provider, l2Provider, signer: wallet.signer });
      const result = await sdk.withdrawals.tryFinalize(txHash as `0x${string}`);
      if (!result.ok) {
        throw result.error;
      }
      const finalizeTxHash =
        (result.value as { receipt?: { hash?: string } }).receipt?.hash ?? txHash;
      const explorerUrl = getExplorerTxUrl(chain, finalizeTxHash);
      const stored: StoredTx = {
        id: `finalize-${finalizeTxHash}`,
        type: "finalize",
        chainKey: chain.chainKey,
        address: wallet.address ?? account.address ?? "",
        token: "N/A",
        amount: "0",
        txHash: finalizeTxHash,
        explorerUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "submitted"
      };
      upsertStoredTx(stored);
      setTx(stored);
      setStatus("Finalize transaction submitted.");
    } catch (error) {
      setStatus(null);
      setSubmitError(
        normalizeError(error, {
          action: "Finalize",
          chainKey: chain.chainKey,
          txHash,
          rpcUrl: chain.l1RpcUrls[0]
        })
      );
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
        {statusError ? <ErrorNotice error={statusError} variant="banner" /> : null}
        {isChainMismatch ? (
          <div className="banner warning">
            <div>Wallet is on the wrong network. Switch to chain ID {chain.l1ChainId}.</div>
            <button className="secondary-button" onClick={handleNetworkSwitch}>
              Switch network
            </button>
          </div>
        ) : null}
        {networkError ? <ErrorNotice error={networkError} variant="banner" /> : null}
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
        {submitError ? <ErrorNotice error={submitError} variant="banner" /> : null}
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
