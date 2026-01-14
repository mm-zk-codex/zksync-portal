import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Contract } from "ethers";
import { ETH_ADDRESS } from "@matterlabs/zksync-js/core";
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
import { erc20Abi } from "../utils/erc20";
import { upsertStoredTx, updateStoredTxStatus, StoredTx } from "../storage/txStore";
import { isValidAmount } from "../utils/amount";
import { createSdk } from "../runtime/sdk";

export const DepositPage = () => {
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
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const isAmountValid = isValidAmount(amount);

  useEffect(() => {
    setAmount(searchParams.get("amount") ?? "");
  }, [searchParams]);

  const isReady = chain && token && l2Provider && l1Provider;
  const isWalletConnected = !!wallet.signer;
  const isChainMismatch = wallet.chainId ? wallet.chainId !== chain?.l1ChainId : false;

  const checkAllowance = async () => {
    if (!wallet.signer || !token || !chain || token.isNative || !token.address) {
      setApprovalNeeded(false);
      return;
    }
    const contract = new Contract(token.address, erc20Abi, wallet.signer);
    const owner = await wallet.signer.getAddress();
    const allowance = (await contract.allowance(owner, chain.contracts.l1Bridge)) as bigint;
    const needed = parseAmount(amount || "0", token.decimals);
    setApprovalNeeded(allowance < needed);
  };

  useEffect(() => {
    if (isWalletConnected && amount && token && !token.isNative) {
      checkAllowance();
    }
  }, [amount, token?.address, isWalletConnected]);

  if (!chain || !token) {
    return (
      <main className="container">
        <h2>Chain not found</h2>
      </main>
    );
  }

  const submitApprove = async () => {
    if (!wallet.signer || !token?.address) {
      return;
    }
    setStatus("Submitting approval...");
    try {
      const contract = new Contract(token.address, erc20Abi, wallet.signer);
      const needed = parseAmount(amount || "0", token.decimals);
      const txResponse = await contract.approve(chain.contracts.l1Bridge, needed);
      await txResponse.wait();
      setApprovalNeeded(false);
      setStatus("Approval confirmed.");
    } catch (error) {
      setStatus(`Approval failed: ${(error as Error).message}`);
    }
  };

  const submitDeposit = async () => {
    if (!wallet.signer || !token || !isReady) {
      return;
    }
    if (!isAmountValid) {
      setStatus("Enter a valid amount greater than zero.");
      return;
    }
    setStatus("Submitting deposit...");
    try {
      const sdk = createSdk({ l1Provider: l1Provider!, l2Provider: l2Provider!, signer: wallet.signer });
      const value = parseAmount(amount, token.decimals);
      const createResult = await sdk.deposits.tryCreate({
        token: token.isNative ? ETH_ADDRESS : token.address!,
        amount: value,
        to: (account.address ?? undefined) as string | undefined
      });
      if (!createResult.ok) {
        throw createResult.error;
      }
      const handle = createResult.value as { l1TxHash: string };
      const explorerUrl = getExplorerTxUrl(chain, handle.l1TxHash);
      const stored: StoredTx = {
        id: `deposit-${handle.l1TxHash}`,
        type: "deposit",
        chainKey: chain.chainKey,
        address: wallet.address ?? account.address ?? "",
        token: token.symbol,
        amount,
        txHash: handle.l1TxHash,
        explorerUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "submitted"
      };
      setTx(stored);
      upsertStoredTx(stored);
      const receipt = await l1Provider!.waitForTransaction(handle.l1TxHash);
      if (receipt && receipt.status === 1) {
        updateStoredTxStatus(stored.id, "confirmed");
        setTx({ ...stored, status: "confirmed" });
        setStatus("Deposit confirmed on L1.");
      }
    } catch (error) {
      setStatus(`Deposit failed: ${(error as Error).message}`);
    }
  };

  return (
    <main className="container">
      <ChainBanner chain={chain} />
      {isDegraded ? <div className="banner warning">RPC degraded: using fallback RPC.</div> : null}
      <div className="card">
        <div className="flex space-between">
          <h2 className="section-title">Deposit</h2>
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
            <div>Wallet is on the wrong network. Switch to chain ID {chain.l1ChainId}.</div>
            <button className="secondary-button" onClick={() => wallet.switchNetwork(chain.l1ChainId)}>
              Switch network
            </button>
          </div>
        ) : null}
        {!isWalletConnected ? (
          <div className="banner warning">Connect a wallet to submit a deposit.</div>
        ) : null}
        <div className="link-row" style={{ marginTop: 12 }}>
          {!token.isNative && approvalNeeded ? (
            <button className="secondary-button" onClick={submitApprove} disabled={!isAmountValid || isChainMismatch}>
              Approve
            </button>
          ) : null}
          <button
            className="primary-button"
            onClick={submitDeposit}
            disabled={!isAmountValid || isChainMismatch || !isWalletConnected || approvalNeeded}
          >
            Deposit
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
