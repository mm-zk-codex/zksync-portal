import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import * as zksync from "@matterlabs/zksync-js";
import { ChainBanner } from "../components/ChainBanner";
import { CopyLinkButton } from "../components/CopyLinkButton";
import { TxStatusCard } from "../components/TxStatusCard";
import { useAccount } from "../runtime/account";
import { useWallet } from "../runtime/wallet";
import { useChainProviders } from "../runtime/useChainProviders";
import { useSyncWatchAddress } from "../runtime/useSyncWatchAddress";
import { findToken } from "../utils/token";
import { getChain, getTokensForChain } from "../utils/config";
import { parseAmount, getExplorerTxUrl } from "../runtime/chainRuntime";
import { upsertStoredTx, updateStoredTxStatus, StoredTx } from "../storage/txStore";
import { isValidAmount } from "../utils/amount";

export const WithdrawPage = () => {
  const { chainKey } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const wallet = useWallet();
  const account = useAccount();
  useSyncWatchAddress();
  const chain = chainKey ? getChain(chainKey) : undefined;
  const { l2Provider, l1Provider, isDegraded } = useChainProviders(chain);
  const tokenParam = searchParams.get("token");
  const token = useMemo(() => (chainKey ? findToken(chainKey, tokenParam) : undefined), [chainKey, tokenParam]);
  const tokens = useMemo(() => (chainKey ? getTokensForChain(chainKey) : []), [chainKey]);

  const [amount, setAmount] = useState(searchParams.get("amount") ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [tx, setTx] = useState<StoredTx | null>(null);
  const isAmountValid = isValidAmount(amount);

  useEffect(() => {
    setAmount(searchParams.get("amount") ?? "");
  }, [searchParams]);

  const isReady = chain && token && l2Provider && l1Provider;
  const isWalletConnected = !!wallet.signer;
  const isChainMismatch = wallet.chainId ? wallet.chainId !== chain?.chainId : false;

  if (!chain || !token) {
    return (
      <main className="container">
        <h2>Chain not found</h2>
      </main>
    );
  }

  const submitWithdraw = async () => {
    if (!wallet.signer || !token || !isReady) {
      return;
    }
    if (!isAmountValid) {
      setStatus("Enter a valid amount greater than zero.");
      return;
    }
    setStatus("Submitting withdrawal...");
    try {
      const zkWallet = zksync.Wallet.fromEthSigner(wallet.signer, l2Provider!, l1Provider!);
      const value = parseAmount(amount, token.decimals);
      const withdrawTx = await zkWallet.withdraw({
        token: token.isNative ? zksync.utils.ETH_ADDRESS : token.address!,
        amount: value,
        to: account.address ?? undefined
      });
      const explorerUrl = getExplorerTxUrl(chain, withdrawTx.hash);
      const stored: StoredTx = {
        id: `withdraw-${withdrawTx.hash}`,
        type: "withdraw",
        chainKey: chain.chainKey,
        address: wallet.address ?? account.address ?? "",
        token: token.symbol,
        amount,
        txHash: withdrawTx.hash,
        explorerUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "submitted"
      };
      setTx(stored);
      upsertStoredTx(stored);
      const receipt = await l2Provider!.waitForTransaction(withdrawTx.hash);
      if (receipt && receipt.status === 1) {
        updateStoredTxStatus(stored.id, "confirmed");
        setTx({ ...stored, status: "confirmed" });
        setStatus("Withdrawal confirmed on L2.");
      }
    } catch (error) {
      setStatus(`Withdrawal failed: ${(error as Error).message}`);
    }
  };

  return (
    <main className="container">
      <ChainBanner chain={chain} />
      {isDegraded ? <div className="banner warning">RPC degraded: using fallback RPC.</div> : null}
      <div className="card">
        <div className="flex space-between">
          <h2 className="section-title">Withdraw</h2>
          <CopyLinkButton />
        </div>
        <label className="small muted">Token</label>
        <select
          className="input"
          value={token.symbol}
          onChange={(event) => {
            const params = new URLSearchParams(location.search);
            params.set("token", event.target.value);
            navigate(`${location.pathname}?${params.toString()}`, { replace: true });
          }}
        >
          {tokens.map((item) => (
            <option key={item.symbol} value={item.symbol}>
              {item.symbol}
            </option>
          ))}
        </select>
        <label className="small muted" style={{ marginTop: 12, display: "block" }}>
          Amount
        </label>
        <input
          className="input"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.0"
        />
        {isChainMismatch ? (
          <div className="banner warning">
            <div>Wallet is on the wrong network. Switch to chain ID {chain.chainId}.</div>
            <button className="secondary-button" onClick={() => wallet.switchNetwork(chain.chainId)}>
              Switch network
            </button>
          </div>
        ) : null}
        {!isWalletConnected ? (
          <div className="banner warning">Connect a wallet to submit a withdrawal.</div>
        ) : null}
        <div className="link-row" style={{ marginTop: 12 }}>
          <button
            className="primary-button"
            onClick={submitWithdraw}
            disabled={!isAmountValid || isChainMismatch || !isWalletConnected}
          >
            Withdraw
          </button>
        </div>
        {status ? <div className="small muted" style={{ marginTop: 12 }}>{status}</div> : null}
      </div>
      {tx ? (
        <div style={{ marginTop: 16 }}>
          <TxStatusCard tx={tx} />
        </div>
      ) : null}
    </main>
  );
};
