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
import { upsertStoredTx, updateStoredTxStatus, StoredTx } from "../storage/txStore";
import { getAmountError, isValidAmount } from "../utils/amount";
import { createSdk } from "../runtime/sdk";
import { erc20Abi } from "../utils/erc20";
import { createNormalizedError, normalizeError, type NormalizedError } from "../utils/errors";

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
  const isChainMismatch = wallet.chainId ? wallet.chainId !== chain?.chainId : false;
  const canAutoAddChain = !!(chain?.nativeCurrency && chain.rpcUrls.length && chain.explorerUrls.length);
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
  }, [amount, token?.symbol]);

  const formatDisplayAmount = (value: bigint, decimals: number) => {
    const formatted = formatUnits(value, decimals);
    const [whole, fraction] = formatted.split(".");
    if (!fraction) {
      return whole;
    }
    return `${whole}.${fraction.slice(0, 6)}`.replace(/\.$/, "");
  };

  const handleMax = async () => {
    if (!token) {
      return;
    }
    if (token.isNative) {
      if (!l2Provider || nativeBalance.value === undefined) {
        return;
      }
      try {
        const feeData = await l2Provider.getFeeData();
        const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
        const gasBuffer = 100000n;
        const buffer = gasPrice * gasBuffer;
        const maxAmount = nativeBalance.value > buffer ? nativeBalance.value - buffer : 0n;
        setAmount(formatDisplayAmount(maxAmount, token.decimals));
      } catch {
        setAmount(formatDisplayAmount(nativeBalance.value, token.decimals));
      }
      return;
    }
    if (tokenBalance.value !== undefined) {
      setAmount(formatDisplayAmount(tokenBalance.value, token.decimals));
    }
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
      if (!l2Provider || !account.address || !token) {
        if (isActive) {
          setNativeBalance({ status: "idle" });
          setTokenBalance({ status: "idle" });
        }
        return;
      }
      setNativeBalance({ status: "loading" });
      setTokenBalance({ status: "loading" });
      try {
        const nativeValue = await l2Provider.getBalance(account.address);
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
              rpcUrl: chain?.rpcUrls[0]
            })
          });
        }
      }
      if (token.isNative) {
        return;
      }
      if (!token.l2Address) {
        if (isActive) {
          setTokenBalance({
            status: "error",
            error: createNormalizedError({
              title: "Token config missing L2 address",
              message: "This token is missing its L2 address, so balance lookups are unavailable.",
              category: "CONFIG_ERROR",
              context: { chainKey: chain?.chainKey, token: token.symbol }
            })
          });
        }
        return;
      }
      try {
        const contract = new Contract(token.l2Address, erc20Abi, l2Provider);
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
              rpcUrl: chain?.rpcUrls[0],
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
  }, [account.address, chain?.chainKey, chain?.rpcUrls, l2Provider, token, balanceRefresh]);

  const runPreflight = async () => {
    if (!chain || !token || !wallet.signer || !l2Provider) {
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
    } catch {
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
        const balance = await l2Provider.getBalance(address);
        const feeData = await l2Provider.getFeeData();
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
      } else if (token.l2Address) {
        const contract = new Contract(token.l2Address, erc20Abi, l2Provider);
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
          rpcUrl: chain.rpcUrls[0],
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
      await wallet.switchNetwork({ targetChainId: chain.chainId, chain });
      setNeedsChainAdd(false);
    } catch (error) {
      const normalized = normalizeError(error, {
        action: "Switch network",
        targetChainId: chain.chainId
      });
      if (normalized.category === "NETWORK_MISMATCH") {
        setNeedsChainAdd(true);
      }
      setNetworkError(normalized);
    }
  };

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
    const preflightOk = await runPreflight();
    if (!preflightOk) {
      return;
    }
    setSubmitError(null);
    setStatus("Submitting withdrawal...");
    try {
      const sdk = createSdk({ l1Provider: l1Provider!, l2Provider: l2Provider!, signer: wallet.signer });
      const value = parseAmount(amount, token.decimals);
      const createResult = await sdk.withdrawals.tryCreate({
        token: token.isNative ? ETH_ADDRESS : token.l2Address!,
        amount: value,
        to: (account.address ?? undefined) as string | undefined
      });
      if (!createResult.ok) {
        throw createResult.error;
      }
      const handle = createResult.value as { l2TxHash: string };
      const explorerUrl = getExplorerTxUrl(chain, handle.l2TxHash);
      const stored: StoredTx = {
        id: `withdraw-${handle.l2TxHash}`,
        type: "withdraw",
        chainKey: chain.chainKey,
        address: wallet.address ?? account.address ?? "",
        token: token.symbol,
        amount,
        txHash: handle.l2TxHash,
        explorerUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "submitted"
      };
      setTx(stored);
      upsertStoredTx(stored);
      const receipt = await l2Provider!.waitForTransaction(handle.l2TxHash);
      if (receipt && receipt.status === 1) {
        updateStoredTxStatus(stored.id, "confirmed");
        setTx({ ...stored, status: "confirmed" });
        setStatus("Withdrawal confirmed on L2.");
        setBalanceRefresh((value) => value + 1);
      }
    } catch (error) {
      setStatus(null);
      setSubmitError(
        normalizeError(error, {
          action: "Withdraw",
          chainKey: chain.chainKey,
          token: token.symbol,
          amount,
          rpcUrl: chain.rpcUrls[0]
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
        <div className="flex space-between" style={{ marginTop: 12, alignItems: "center" }}>
          <label className="small muted" style={{ display: "block" }}>
            Amount
          </label>
          <button className="secondary-button small" type="button" onClick={handleMax}>
            Max
          </button>
        </div>
        <input
          className="input"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.0"
        />
        <div className="small muted" style={{ marginTop: 6 }}>
          Available to withdraw: {renderBalanceValue(tokenBalance, token.decimals)} {token.symbol}
          {token.isNative ? " (leaves room for gas)" : ""}
        </div>
        {displayInlineError ? <ErrorNotice error={displayInlineError} variant="inline" /> : null}
        {isChainMismatch ? (
          <div className="banner warning">
            <div>Wallet is on the wrong network. Switch to chain ID {chain.chainId}.</div>
            <button className="secondary-button" onClick={handleNetworkSwitch}>
              {needsChainAdd || canAutoAddChain ? `Add & switch to ${chain.name}` : `Switch to ${chain.name}`}
            </button>
          </div>
        ) : null}
        {networkError ? <ErrorNotice error={networkError} variant="banner" /> : null}
        {!isWalletConnected ? (
          <div className="banner warning">Connect a wallet to submit a withdrawal.</div>
        ) : null}
        <div className="link-row" style={{ marginTop: 12 }}>
          <button
            className="primary-button"
            onClick={submitWithdraw}
            disabled={!isAmountValid || isChainMismatch || !isWalletConnected || !!displayInlineError}
          >
            Withdraw
          </button>
        </div>
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
