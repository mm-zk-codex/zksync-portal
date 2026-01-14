import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Contract, formatUnits } from "ethers";
import { ETH_ADDRESS } from "@matterlabs/zksync-js/core";
import { ChainBanner } from "../components/ChainBanner";
import { CopyLinkButton } from "../components/CopyLinkButton";
import { ErrorNotice } from "../components/ErrorNotice";
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
import { getAmountError, isValidAmount } from "../utils/amount";
import { createSdk } from "../runtime/sdk";
import { createNormalizedError, normalizeError, type NormalizedError } from "../utils/errors";

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
  const [approvalInfo, setApprovalInfo] = useState<{ current: bigint; required: bigint } | null>(null);
  const [approvalError, setApprovalError] = useState<NormalizedError | null>(null);
  const [inlineError, setInlineError] = useState<NormalizedError | null>(null);
  const [submitError, setSubmitError] = useState<NormalizedError | null>(null);
  const [networkError, setNetworkError] = useState<NormalizedError | null>(null);
  const [needsChainAdd, setNeedsChainAdd] = useState(false);
  const [balanceRefresh, setBalanceRefresh] = useState(0);
  const [nativeBalance, setNativeBalance] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    value?: bigint;
    error?: NormalizedError;
  }>({ status: "idle" });
  const [tokenBalance, setTokenBalance] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    value?: bigint;
    error?: NormalizedError;
  }>({ status: "idle" });
  const isAmountValid = token ? isValidAmount(amount, token.decimals) : false;

  useEffect(() => {
    setAmount(searchParams.get("amount") ?? "");
  }, [searchParams]);

  const isReady = chain && token && l2Provider && l1Provider;
  const isWalletConnected = !!wallet.signer;
  const isChainMismatch = wallet.chainId ? wallet.chainId !== chain?.l1ChainId : false;
  const amountValidation = token ? getAmountError(amount, token.decimals, { allowEmpty: true }) : null;
  const amountValidationError = amountValidation
    ? createNormalizedError({
        title: "Invalid amount",
        message: amountValidation,
        category: "UNKNOWN",
        context: { amount, token: token?.symbol, chainKey: chain?.chainKey }
      })
    : null;
  const displayInlineError = inlineError ?? amountValidationError;

  useEffect(() => {
    setInlineError(null);
    setSubmitError(null);
    setApprovalError(null);
  }, [amount, token?.symbol]);

  const formatDisplayAmount = (value: bigint, decimals: number) => {
    const formatted = formatUnits(value, decimals);
    const [whole, fraction] = formatted.split(".");
    if (!fraction) {
      return whole;
    }
    return `${whole}.${fraction.slice(0, 6)}`.replace(/\.$/, "");
  };

  const renderBalanceValue = (
    balance: {
      status: "idle" | "loading" | "ready" | "error";
      value?: bigint;
    },
    decimals: number
  ) => {
    if (balance.status === "loading") {
      return "Loading...";
    }
    if (balance.status === "ready" && balance.value !== undefined) {
      return formatDisplayAmount(balance.value, decimals);
    }
    if (balance.status === "error") {
      return "Unavailable";
    }
    return "--";
  };

  useEffect(() => {
    let isActive = true;
    const fetchBalances = async () => {
      if (!l1Provider || !account.address || !token) {
        if (isActive) {
          setNativeBalance({ status: "idle" });
          setTokenBalance({ status: "idle" });
        }
        return;
      }
      setNativeBalance({ status: "loading" });
      setTokenBalance({ status: "loading" });
      try {
        const nativeValue = await l1Provider.getBalance(account.address);
        if (isActive) {
          setNativeBalance({ status: "ready", value: nativeValue });
          if (token.isNative) {
            setTokenBalance({ status: "ready", value: nativeValue });
          }
        }
      } catch (error) {
        if (isActive) {
          setNativeBalance({
            status: "error",
            error: normalizeError(error, {
              action: "Fetch balance",
              chainKey: chain?.chainKey,
              rpcUrl: chain?.l1RpcUrls[0]
            })
          });
        }
      }
      if (token.isNative) {
        return;
      }
      if (!token.l1Address) {
        if (isActive) {
          setTokenBalance({
            status: "error",
            error: createNormalizedError({
              title: "Token config missing L1 address",
              message: "This token is missing its L1 address, so balance lookups are unavailable.",
              category: "CONFIG_ERROR",
              context: { chainKey: chain?.chainKey, token: token.symbol }
            })
          });
        }
        return;
      }
      try {
        const contract = new Contract(token.l1Address, erc20Abi, l1Provider);
        const tokenValue = (await contract.balanceOf(account.address)) as bigint;
        if (isActive) {
          setTokenBalance({ status: "ready", value: tokenValue });
        }
      } catch (error) {
        if (isActive) {
          setTokenBalance({
            status: "error",
            error: normalizeError(error, {
              action: "Fetch token balance",
              chainKey: chain?.chainKey,
              rpcUrl: chain?.l1RpcUrls[0],
              token: token.symbol
            })
          });
        }
      }
    };
    fetchBalances();
    return () => {
      isActive = false;
    };
  }, [account.address, chain?.chainKey, chain?.l1RpcUrls, l1Provider, token, balanceRefresh]);

  const runPreflight = async () => {
    if (!chain || !token || !wallet.signer || !l1Provider) {
      return false;
    }
    setInlineError(null);
    const blockingError = getAmountError(amount, token.decimals);
    if (blockingError) {
      setInlineError(
        createNormalizedError({
          title: "Invalid amount",
          message: blockingError,
          category: "UNKNOWN",
          context: { amount, token: token.symbol, chainKey: chain.chainKey }
        })
      );
      return false;
    }
    let value: bigint;
    try {
      value = parseAmount(amount, token.decimals);
    } catch (error) {
      setInlineError(
        createNormalizedError({
          title: "Invalid amount",
          message: "Amount could not be parsed. Check decimals and try again.",
          category: "UNKNOWN",
          context: { amount, token: token.symbol }
        })
      );
      return false;
    }
    try {
      const address = wallet.address ?? (await wallet.signer.getAddress());
      if (token.isNative) {
        const balance = await l1Provider.getBalance(address);
        const feeData = await l1Provider.getFeeData();
        const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
        const gasBuffer = 100000n;
        const totalNeeded = value + gasPrice * gasBuffer;
        if (balance < totalNeeded) {
          const have = formatDisplayAmount(balance, token.decimals);
          const need = formatDisplayAmount(totalNeeded, token.decimals);
          setInlineError(
            createNormalizedError({
              title: "Not enough balance",
              message: `Not enough ${token.symbol} on ${chain.name}. You have ${have}, need ${need}.`,
              category: "INSUFFICIENT_FUNDS",
              context: { balance: balance.toString(), needed: totalNeeded.toString() }
            })
          );
          return false;
        }
      } else if (token.l1Address) {
        const contract = new Contract(token.l1Address, erc20Abi, l1Provider);
        const balance = (await contract.balanceOf(address)) as bigint;
        if (balance < value) {
          const have = formatDisplayAmount(balance, token.decimals);
          const need = formatDisplayAmount(value, token.decimals);
          setInlineError(
            createNormalizedError({
              title: "Insufficient token balance",
              message: `Not enough ${token.symbol} on ${chain.name}. You have ${have}, need ${need}.`,
              category: "INSUFFICIENT_TOKEN",
              context: { balance: balance.toString(), needed: value.toString() }
            })
          );
          return false;
        }
      } else {
        setInlineError(
          createNormalizedError({
            title: "Token not configured",
            message: "This token is missing on-chain metadata and cannot be used.",
            category: "CONFIG_ERROR",
            context: { token: token.symbol, chainKey: chain.chainKey }
          })
        );
        return false;
      }
    } catch (error) {
      setInlineError(
        normalizeError(error, {
          action: "Check balance",
          chainKey: chain.chainKey,
          rpcUrl: chain.l1RpcUrls[0],
          token: token.symbol,
          amount
        })
      );
      return false;
    }
    return true;
  };

  const handleNetworkSwitch = async () => {
    if (!chain) {
      return;
    }
    setNetworkError(null);
    try {
      await wallet.switchNetwork({ targetChainId: chain.l1ChainId });
      setNeedsChainAdd(false);
    } catch (error) {
      const normalized = normalizeError(error, {
        action: "Switch network",
        targetChainId: chain.l1ChainId
      });
      if (normalized.category === "NETWORK_MISMATCH") {
        setNeedsChainAdd(true);
      }
      setNetworkError(normalized);
    }
  };

  const checkAllowance = async () => {
    if (!wallet.signer || !token || !chain || token.isNative || !token.l1Address) {
      setApprovalNeeded(false);
      setApprovalInfo(null);
      setApprovalError(null);
      return;
    }
    if (amountValidation) {
      setApprovalNeeded(false);
      setApprovalInfo(null);
      return;
    }
    try {
      const contract = new Contract(token.l1Address!, erc20Abi, wallet.signer);
      const owner = await wallet.signer.getAddress();
      const allowance = (await contract.allowance(owner, chain.contracts.l1Bridge)) as bigint;
      const needed = parseAmount(amount || "0", token.decimals);
      setApprovalNeeded(allowance < needed);
      setApprovalInfo({ current: allowance, required: needed });
      setApprovalError(null);
    } catch (error) {
      setApprovalNeeded(false);
      setApprovalInfo(null);
      setApprovalError(
        createNormalizedError({
          title: "Allowance check failed",
          message: "Couldn’t check allowance right now. Try again or change RPC.",
          category: "RPC_ERROR",
          context: {
            action: "Check allowance",
            chainKey: chain.chainKey,
            token: token.symbol,
            rpcUrl: chain.l1RpcUrls[0],
            error: normalizeError(error, { chainKey: chain.chainKey }).details
          }
        })
      );
    }
  };

  useEffect(() => {
    if (isWalletConnected && amount && token && !token.isNative) {
      checkAllowance();
    }
  }, [amount, token?.l1Address, isWalletConnected, amountValidation, chain?.chainKey]);

  if (!chain || !token) {
    return (
      <main className="container">
        <h2>Chain not found</h2>
      </main>
    );
  }

  const submitApprove = async () => {
    if (!wallet.signer || !token?.l1Address) {
      return;
    }
    setSubmitError(null);
    setStatus("Submitting approval...");
    try {
      const contract = new Contract(token.l1Address, erc20Abi, wallet.signer);
      const needed = parseAmount(amount || "0", token.decimals);
      const txResponse = await contract.approve(chain.contracts.l1Bridge, needed);
      await txResponse.wait();
      setApprovalNeeded(false);
      setStatus("Approval confirmed.");
    } catch (error) {
      setStatus(null);
      setSubmitError(
        normalizeError(error, {
          action: "Approve token",
          chainKey: chain.chainKey,
          token: token.symbol,
          amount
        })
      );
    }
  };

  const submitDeposit = async () => {
    if (!wallet.signer || !token || !isReady) {
      return;
    }
    const preflightOk = await runPreflight();
    if (!preflightOk) {
      return;
    }
    setSubmitError(null);
    setStatus("Submitting deposit...");
    try {
      const sdk = createSdk({ l1Provider: l1Provider!, l2Provider: l2Provider!, signer: wallet.signer });
      const value = parseAmount(amount, token.decimals);
      const createResult = await sdk.deposits.tryCreate({
        token: token.isNative ? ETH_ADDRESS : token.l1Address!,
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
        setBalanceRefresh((value) => value + 1);
      }
    } catch (error) {
      setStatus(null);
      setSubmitError(
        normalizeError(error, {
          action: "Deposit",
          chainKey: chain.chainKey,
          token: token.symbol,
          amount,
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
        <div style={{ marginTop: 12 }}>
          <div className="small muted">Balances</div>
          <div className="flex" style={{ gap: 24, flexWrap: "wrap" }}>
            <div>
              <div className="small muted">Native</div>
              <div>{renderBalanceValue(nativeBalance, chain.nativeCurrency.decimals)}</div>
            </div>
            <div>
              <div className="small muted">{token.symbol}</div>
              <div>{renderBalanceValue(tokenBalance, token.decimals)}</div>
            </div>
          </div>
          {nativeBalance.error ? <ErrorNotice error={nativeBalance.error} variant="inline" /> : null}
          {tokenBalance.error ? <ErrorNotice error={tokenBalance.error} variant="inline" /> : null}
        </div>
        <label className="small muted" style={{ marginTop: 12, display: "block" }}>
          Amount
        </label>
        <input
          className="input"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.0"
        />
        {displayInlineError ? <ErrorNotice error={displayInlineError} variant="inline" /> : null}
        {isChainMismatch ? (
          <div className="banner warning">
            <div>Wallet is on the wrong network. Switch to chain ID {chain.l1ChainId}.</div>
            <button className="secondary-button" onClick={handleNetworkSwitch}>
              {needsChainAdd ? `Add & switch to ${chain.name}` : `Switch to chain ${chain.l1ChainId}`}
            </button>
          </div>
        ) : null}
        {networkError ? <ErrorNotice error={networkError} variant="banner" /> : null}
        {!isWalletConnected ? (
          <div className="banner warning">Connect a wallet to submit a deposit.</div>
        ) : null}
        <div className="link-row" style={{ marginTop: 12 }}>
          {!token.isNative && approvalNeeded ? (
            <button
              className="secondary-button"
              onClick={submitApprove}
              disabled={!isAmountValid || isChainMismatch || !!displayInlineError}
            >
              Approve
            </button>
          ) : null}
          <button
            className="primary-button"
            onClick={submitDeposit}
            disabled={!isAmountValid || isChainMismatch || !isWalletConnected || approvalNeeded || !!displayInlineError}
          >
            Deposit
          </button>
        </div>
        {approvalInfo && approvalNeeded ? (
          <div className="small muted" style={{ marginTop: 8 }}>
            Allowance: {formatDisplayAmount(approvalInfo.current, token.decimals)} /{" "}
            {formatDisplayAmount(approvalInfo.required, token.decimals)} {token.symbol}
          </div>
        ) : null}
        {approvalError ? <ErrorNotice error={approvalError} variant="inline" /> : null}
        {submitError ? <ErrorNotice error={submitError} variant="banner" /> : null}
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
