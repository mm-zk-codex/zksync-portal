import { useEffect, useMemo, useRef, useState } from "react";
import { Interface, VoidSigner, ZeroAddress, formatUnits, getAddress } from "ethers";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CopyLinkButton } from "../components/CopyLinkButton";
import { ErrorNotice } from "../components/ErrorNotice";
import { TxStatusCard } from "../components/TxStatusCard";
import { useAccount } from "../runtime/account";
import { useWallet } from "../runtime/wallet";
import { useChainProviders } from "../runtime/useChainProviders";
import { useSyncWatchAddress } from "../runtime/useSyncWatchAddress";
import { getChain, getTokensForChain } from "../utils/config";
import { createSdk } from "../runtime/sdk";
import { getExplorerTxUrl } from "../runtime/chainRuntime";
import { getStoredTxs, upsertStoredTx, StoredTx } from "../storage/txStore";
import { normalizeError, type NormalizedError } from "../utils/errors";

const WITHDRAWAL_EVENT_ABI = [
  "event WithdrawalInitiated(address indexed l2Sender,address indexed l1Receiver,address l2Token,uint256 amount)"
];

const SCAN_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SCAN_RANGE = 20000;
const EXTENDED_SCAN_RANGE = 120000;
const SCAN_PAGE_SIZE = 2500;

type WithdrawalCandidate = {
  txHash: string;
  tokenSymbol: string;
  amount: string;
  source: "local" | "scan";
  timestamp?: number;
  status: "Not ready" | "Ready to finalize" | "Finalizing" | "Finalized" | "Unknown";
  phase?: string;
  l1AddressMissing?: boolean;
};

type ScanCache = {
  timestamp: number;
  range: number;
  items: Array<{
    txHash: string;
    l2Token: string;
    amount: string;
    timestamp?: number;
  }>;
};

const getScanStorageKey = (chainKey: string, address: string) =>
  `atlas_withdrawals_scan_${chainKey}_${address.toLowerCase()}`;

const mapPhaseToStatus = (phase?: string) => {
  switch ((phase ?? "").toLowerCase()) {
    case "ready_to_finalize":
      return "Ready to finalize" as const;
    case "finalizing":
      return "Finalizing" as const;
    case "finalized":
    case "completed":
      return "Finalized" as const;
    case "l2_pending":
    case "l2_included":
    case "pending":
      return "Not ready" as const;
    default:
      return "Unknown" as const;
  }
};

const formatDisplayAmount = (value: bigint, decimals: number) => {
  const formatted = formatUnits(value, decimals);
  const [whole, fraction] = formatted.split(".");
  if (!fraction) {
    return whole;
  }
  return `${whole}.${fraction.slice(0, 6)}`.replace(/\.$/, "");
};

export const FinalizePage = () => {
  const { chainKey } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const wallet = useWallet();
  const account = useAccount();
  useSyncWatchAddress();
  const chain = chainKey ? getChain(chainKey) : undefined;
  const tokens = useMemo(() => (chainKey ? getTokensForChain(chainKey) : []), [chainKey]);
  const { l2Provider, l1Provider, isDegraded } = useChainProviders(chain);
  const txHashParam = (searchParams.get("txHash") ?? "").trim();
  const addressParam = (searchParams.get("address") ?? "").trim();

  const [status, setStatus] = useState("Checking withdrawal status...");
  const [ready, setReady] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [tx, setTx] = useState<StoredTx | null>(null);
  const [statusError, setStatusError] = useState<NormalizedError | null>(null);
  const [submitError, setSubmitError] = useState<NormalizedError | null>(null);
  const [networkError, setNetworkError] = useState<NormalizedError | null>(null);
  const [mode, setMode] = useState<"select" | "paste">(txHashParam ? "paste" : "select");
  const [selectedTxHash, setSelectedTxHash] = useState(txHashParam);
  const [txHashInput, setTxHashInput] = useState(txHashParam);
  const [addressInput, setAddressInput] = useState(addressParam || account.address || "");
  const [isAddressTouched, setIsAddressTouched] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<WithdrawalCandidate[]>([]);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scanError, setScanError] = useState<NormalizedError | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanRange, setScanRange] = useState(DEFAULT_SCAN_RANGE);
  const scanAbortRef = useRef(false);
  const candidateKey = useMemo(
    () => candidates.map((item) => item.txHash.toLowerCase()).join("|"),
    [candidates]
  );

  const isChainMismatch = wallet.chainId ? wallet.chainId !== chain?.l1ChainId : false;

  useEffect(() => {
    setSelectedTxHash(txHashParam);
    setTxHashInput(txHashParam);
    if (txHashParam) {
      setMode("paste");
    }
  }, [txHashParam]);

  useEffect(() => {
    if (!selectedTxHash) {
      setStatus("Checking withdrawal status...");
      setReady(false);
      setFinalized(false);
      setStatusError(null);
    }
  }, [selectedTxHash]);

  useEffect(() => {
    if (!isAddressTouched && account.address) {
      setAddressInput(account.address);
    }
  }, [account.address, isAddressTouched]);

  const resolvedAddress = useMemo(() => {
    if (!addressInput) {
      return "";
    }
    try {
      return getAddress(addressInput);
    } catch {
      return "";
    }
  }, [addressInput]);

  useEffect(() => {
    if (!addressInput) {
      setAddressError(null);
      return;
    }
    try {
      getAddress(addressInput);
      setAddressError(null);
    } catch {
      setAddressError("Invalid address format");
    }
  }, [addressInput]);

  const setQueryParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const updateAddressParam = () => {
    if (!resolvedAddress) {
      return;
    }
    account.setWatchAddress(resolvedAddress);
    setQueryParam("address", resolvedAddress);
  };

  const updateTxHashParam = (value: string) => {
    const trimmed = value.trim();
    setSelectedTxHash(trimmed);
    setQueryParam("txHash", trimmed || null);
  };

  const detectFromStored = () => {
    if (!chain?.chainKey || !resolvedAddress) {
      return [] as WithdrawalCandidate[];
    }
    const stored = getStoredTxs(chain.chainKey, resolvedAddress).filter((item) => item.type === "withdraw");
    const mapped = stored.map((item) => {
      const tokenConfig = tokens.find((token) => token.symbol === item.token);
      const l1AddressMissing = tokenConfig ? !tokenConfig.isNative && !tokenConfig.l1Address : false;
      return {
        txHash: item.txHash,
        tokenSymbol: item.token,
        amount: item.amount,
        source: "local" as const,
        timestamp: item.createdAt,
        status: "Unknown" as const,
        l1AddressMissing
      };
    });
    return mapped;
  };

  const loadScanCache = () => {
    if (!chain?.chainKey || !resolvedAddress) {
      return [] as WithdrawalCandidate[];
    }
    if (typeof window === "undefined") {
      return [] as WithdrawalCandidate[];
    }
    const raw = window.localStorage.getItem(getScanStorageKey(chain.chainKey, resolvedAddress));
    if (!raw) {
      return [] as WithdrawalCandidate[];
    }
    try {
      const parsed = JSON.parse(raw) as ScanCache;
      if (!parsed.timestamp || Date.now() - parsed.timestamp > SCAN_CACHE_TTL_MS) {
        return [] as WithdrawalCandidate[];
      }
      return parsed.items.map((item) => {
        const tokenConfig = tokens.find(
          (token) => token.l2Address?.toLowerCase() === item.l2Token.toLowerCase()
        );
        const tokenSymbol = tokenConfig?.symbol ?? "Unknown";
        const formattedAmount = tokenConfig
          ? formatDisplayAmount(BigInt(item.amount), tokenConfig.decimals)
          : item.amount;
        const l1AddressMissing = tokenConfig ? !tokenConfig.isNative && !tokenConfig.l1Address : false;
        return {
          txHash: item.txHash,
          tokenSymbol,
          amount: formattedAmount,
          source: "scan" as const,
          timestamp: item.timestamp,
          status: "Unknown" as const,
          l1AddressMissing
        };
      });
    } catch {
      return [] as WithdrawalCandidate[];
    }
  };

  const mergeCandidates = (items: WithdrawalCandidate[]) => {
    const map = new Map<string, WithdrawalCandidate>();
    items.forEach((item) => {
      map.set(item.txHash.toLowerCase(), item);
    });
    return Array.from(map.values());
  };

  const loadCandidates = () => {
    const stored = detectFromStored();
    const cached = loadScanCache();
    setCandidates(mergeCandidates([...stored, ...cached]));
  };

  useEffect(() => {
    if (!resolvedAddress || !chain?.chainKey) {
      setCandidates([]);
      return;
    }
    loadCandidates();
  }, [resolvedAddress, chain?.chainKey, tokens]);

  useEffect(() => {
    let isActive = true;
    const updateStatuses = async () => {
      if (!l2Provider || !l1Provider || candidates.length === 0) {
        return;
      }
      try {
        const signer = wallet.signer ?? new VoidSigner(account.address ?? ZeroAddress, l1Provider);
        const sdk = createSdk({ l1Provider, l2Provider, signer });
        const results = await Promise.all(
          candidates.map(async (item) => {
            try {
              const statusResult = await sdk.withdrawals.status(item.txHash as `0x${string}`);
              return { txHash: item.txHash, phase: statusResult.phase.toString().toLowerCase() };
            } catch {
              return { txHash: item.txHash, phase: "unknown" };
            }
          })
        );
        if (!isActive) {
          return;
        }
        setCandidates((prev) =>
          prev.map((item) => {
            const result = results.find((entry) => entry.txHash === item.txHash);
            const phase = result?.phase;
            return {
              ...item,
              phase,
              status: mapPhaseToStatus(phase)
            };
          })
        );
      } catch (error) {
        if (isActive) {
          setScanError(
            normalizeError(error, {
              action: "Fetch withdrawal status",
              chainKey: chain?.chainKey,
              rpcUrl: chain?.l1RpcUrls[0]
            })
          );
        }
      }
    };
    updateStatuses();
    return () => {
      isActive = false;
    };
  }, [account.address, candidateKey, chain?.chainKey, chain?.l1RpcUrls, l1Provider, l2Provider, wallet.signer]);

  useEffect(() => {
    let isActive = true;
    let timer: number;
    const poll = async () => {
      if (!l2Provider || !l1Provider || !selectedTxHash) {
        return;
      }
      try {
        const signer = wallet.signer ?? new VoidSigner(account.address ?? ZeroAddress, l1Provider);
        const sdk = createSdk({ l1Provider, l2Provider, signer });
        const result = await sdk.withdrawals.status(selectedTxHash as `0x${string}`);
        if (!isActive) {
          return;
        }
        const statusValue = result.phase.toString().toLowerCase();
        if (statusValue === "ready_to_finalize") {
          setStatus("Withdrawal is ready to finalize.");
          setReady(true);
          setFinalized(false);
          setStatusError(null);
        } else if (statusValue === "finalized" || statusValue === "completed") {
          setStatus("Withdrawal already finalized.");
          setReady(false);
          setFinalized(true);
          setStatusError(null);
        } else if (statusValue === "finalizing") {
          setStatus("Withdrawal finalization in progress.");
          setReady(false);
          setFinalized(false);
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
  }, [account.address, l1Provider, l2Provider, selectedTxHash, wallet.signer]);

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
    if (!wallet.signer || !l2Provider || !l1Provider || !selectedTxHash) {
      return;
    }
    setSubmitError(null);
    setStatus("Submitting finalization...");
    try {
      const sdk = createSdk({ l1Provider, l2Provider, signer: wallet.signer });
      const result = await sdk.withdrawals.tryFinalize(selectedTxHash as `0x${string}`);
      if (!result.ok) {
        throw result.error;
      }
      const finalizeTxHash =
        (result.value as { receipt?: { hash?: string } }).receipt?.hash ?? selectedTxHash;
      const explorerUrl = getExplorerTxUrl(chain, finalizeTxHash);
      const stored: StoredTx = {
        id: `finalize-${finalizeTxHash}`,
        type: "finalize",
        chainKey: chain.chainKey,
        address: wallet.address ?? account.address ?? "",
        token: "N/A",
        amount: "0",
        txHash: finalizeTxHash,
        withdrawalTxHash: selectedTxHash,
        explorerUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "submitted"
      };
      upsertStoredTx(stored);
      setTx(stored);
      setStatus("Finalize transaction submitted.");
    } catch (error) {
      setStatus("Unable to submit finalization.");
      setSubmitError(
        normalizeError(error, {
          action: "Finalize",
          chainKey: chain.chainKey,
          txHash: selectedTxHash,
          rpcUrl: chain.l1RpcUrls[0]
        })
      );
    }
  };

  const scanChain = async (range: number) => {
    if (!l2Provider || !chain || !resolvedAddress) {
      return;
    }
    setScanError(null);
    setScanStatus("Starting scan...");
    setIsScanning(true);
    scanAbortRef.current = false;
    const interfaceInstance = new Interface(WITHDRAWAL_EVENT_ABI);
    try {
      const latestBlock = await l2Provider.getBlockNumber();
      const fromBlock = Math.max(latestBlock - range, 0);
      const addresses = [chain.contracts.l2Bridge, chain.contracts.l2SharedBridge].filter(Boolean);
      const topic = interfaceInstance.getEvent("WithdrawalInitiated").topicHash;
      const results: ScanCache["items"] = [];
      for (let end = latestBlock; end >= fromBlock; end -= SCAN_PAGE_SIZE) {
        if (scanAbortRef.current) {
          setScanStatus("Scan canceled.");
          break;
        }
        const start = Math.max(fromBlock, end - SCAN_PAGE_SIZE + 1);
        setScanStatus(`Scanning blocks ${start.toLocaleString()}-${end.toLocaleString()}...`);
        const logs = await l2Provider.getLogs({
          address: addresses,
          fromBlock: start,
          toBlock: end,
          topics: [topic]
        });
        for (const log of logs) {
          try {
            const parsed = interfaceInstance.parseLog(log);
            const l2Sender = parsed.args.l2Sender as string;
            const l1Receiver = parsed.args.l1Receiver as string;
            if (
              l2Sender.toLowerCase() !== resolvedAddress.toLowerCase() &&
              l1Receiver.toLowerCase() !== resolvedAddress.toLowerCase()
            ) {
              continue;
            }
            const l2Token = parsed.args.l2Token as string;
            const amount = (parsed.args.amount as bigint).toString();
            const block = await l2Provider.getBlock(log.blockNumber);
            results.push({
              txHash: log.transactionHash,
              l2Token,
              amount,
              timestamp: block?.timestamp ? block.timestamp * 1000 : undefined
            });
          } catch {
            continue;
          }
        }
      }
      const cache: ScanCache = {
        timestamp: Date.now(),
        range,
        items: results
      };
      window.localStorage.setItem(
        getScanStorageKey(chain.chainKey, resolvedAddress),
        JSON.stringify(cache)
      );
      const mapped = results.map((item) => {
        const tokenConfig = tokens.find(
          (token) => token.l2Address?.toLowerCase() === item.l2Token.toLowerCase()
        );
        const tokenSymbol = tokenConfig?.symbol ?? "Unknown";
        const formattedAmount = tokenConfig
          ? formatDisplayAmount(BigInt(item.amount), tokenConfig.decimals)
          : item.amount;
        const l1AddressMissing = tokenConfig ? !tokenConfig.isNative && !tokenConfig.l1Address : false;
        return {
          txHash: item.txHash,
          tokenSymbol,
          amount: formattedAmount,
          source: "scan" as const,
          timestamp: item.timestamp,
          status: "Unknown" as const,
          l1AddressMissing
        };
      });
      setCandidates((prev) => mergeCandidates([...prev, ...mapped]));
      setScanStatus(results.length ? "Scan complete." : "Scan complete: no withdrawals found.");
    } catch (error) {
      setScanStatus(null);
      setScanError(
        normalizeError(error, {
          action: "Scan chain",
          chainKey: chain.chainKey,
          rpcUrl: chain.rpcUrls[0]
        })
      );
    } finally {
      setIsScanning(false);
    }
  };

  const visibleCandidates = candidates.filter((item) => item.status !== "Finalized");
  const selectedCandidate = visibleCandidates.find(
    (item) => item.txHash.toLowerCase() === selectedTxHash.toLowerCase()
  );
  const l1AddressMissing = selectedCandidate?.l1AddressMissing ?? false;

  return (
    <main className="container">
      {isDegraded ? <div className="banner warning">RPC degraded: using fallback RPC.</div> : null}
      <div className="card">
        <div className="flex space-between">
          <h2 className="section-title">Finalize withdrawal</h2>
          <CopyLinkButton />
        </div>
        <div className="link-row" style={{ marginTop: 8 }}>
          <button
            className={mode === "select" ? "primary-button" : "secondary-button"}
            onClick={() => setMode("select")}
          >
            Select from detected withdrawals
          </button>
          <button
            className={mode === "paste" ? "primary-button" : "secondary-button"}
            onClick={() => setMode("paste")}
          >
            Paste tx hash
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              setScanRange(EXTENDED_SCAN_RANGE);
              scanChain(EXTENDED_SCAN_RANGE);
            }}
            disabled={isScanning || !resolvedAddress}
          >
            Scan older blocks
          </button>
        </div>
        <div className="small muted" style={{ marginTop: 12 }}>
          Without an indexer, history is best-effort. If you don’t see a withdrawal, paste the tx hash
          or scan a larger range.
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="small muted">Address to scan</label>
          <input
            className="input"
            value={addressInput}
            onChange={(event) => {
              setIsAddressTouched(true);
              setAddressInput(event.target.value);
            }}
            placeholder="0x..."
          />
          {addressError ? <div className="small" style={{ color: "#ff9b9b" }}>{addressError}</div> : null}
          <div className="link-row" style={{ marginTop: 8 }}>
            <button
              className="secondary-button"
              type="button"
              onClick={updateAddressParam}
              disabled={!resolvedAddress}
            >
              Use this address
            </button>
            {account.watchAddress ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setAddressInput(account.watchAddress ?? "");
                  setIsAddressTouched(false);
                }}
              >
                Use saved watch address
              </button>
            ) : null}
            {wallet.address ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setAddressInput(wallet.address ?? "");
                  setIsAddressTouched(false);
                }}
              >
                Use wallet address
              </button>
            ) : null}
          </div>
        </div>
        {mode === "select" ? (
          <div style={{ marginTop: 16 }}>
            <div className="small muted">Detected withdrawals</div>
            {scanStatus ? <div className="small muted" style={{ marginTop: 6 }}>{scanStatus}</div> : null}
            {scanError ? <ErrorNotice error={scanError} variant="inline" /> : null}
            {visibleCandidates.length ? (
              <div style={{ marginTop: 8 }}>
                {visibleCandidates.map((item) => (
                  <div
                    key={item.txHash}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                      padding: "10px 0"
                    }}
                  >
                    <div className="flex space-between" style={{ alignItems: "center" }}>
                      <div>
                        <div className="small muted">Token</div>
                        <div>{item.tokenSymbol}</div>
                      </div>
                      <span className="badge">{item.status}</span>
                    </div>
                    <div className="small muted" style={{ marginTop: 6 }}>
                      Amount: {item.amount}
                    </div>
                    {item.timestamp ? (
                      <div className="small muted">
                        Time: {new Date(item.timestamp).toLocaleString()}
                      </div>
                    ) : null}
                    <div className="small muted" style={{ marginTop: 6 }}>
                      Tx hash: {item.txHash}
                      <button
                        className="secondary-button small"
                        style={{ marginLeft: 8 }}
                        type="button"
                        onClick={async () => navigator.clipboard?.writeText(item.txHash)}
                      >
                        Copy
                      </button>
                    </div>
                    <div className="link-row" style={{ marginTop: 8 }}>
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => updateTxHashParam(item.txHash)}
                      >
                        Select withdrawal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="small muted" style={{ marginTop: 8 }}>
                No pending withdrawals found yet. Save an address above to load local history or scan
                the chain.
              </div>
            )}
            <div className="link-row" style={{ marginTop: 12 }}>
              <button
                className="secondary-button"
                type="button"
                onClick={() => scanChain(scanRange)}
                disabled={isScanning || !resolvedAddress}
              >
                Scan chain
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setScanRange(EXTENDED_SCAN_RANGE);
                  scanChain(EXTENDED_SCAN_RANGE);
                }}
                disabled={isScanning || !resolvedAddress}
              >
                Scan older blocks
              </button>
              {isScanning ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    scanAbortRef.current = true;
                  }}
                >
                  Cancel scan
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <label className="small muted">Withdrawal tx hash</label>
            <input
              className="input"
              value={txHashInput}
              onChange={(event) => setTxHashInput(event.target.value)}
              placeholder="0x..."
            />
            <div className="link-row" style={{ marginTop: 8 }}>
              <button className="secondary-button" type="button" onClick={() => updateTxHashParam(txHashInput)}>
                Use tx hash
              </button>
            </div>
          </div>
        )}
        {selectedTxHash ? (
          <div style={{ marginTop: 16 }}>
            <div className="small muted">Selected tx hash</div>
            <div className="code small" style={{ marginBottom: 12 }}>
              {selectedTxHash}
            </div>
            {finalized ? (
              <div className="banner">Withdrawal already finalized.</div>
            ) : (
              <div className="banner warning">{status}</div>
            )}
          </div>
        ) : (
          <div className="banner warning" style={{ marginTop: 16 }}>
            Select a withdrawal or paste a tx hash to continue.
          </div>
        )}
        {statusError ? <ErrorNotice error={statusError} variant="banner" /> : null}
        {l1AddressMissing ? (
          <div className="banner warning">
            Token config missing L1 address; cannot finalize automatically. Update token config and
            try again.
          </div>
        ) : null}
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
          <div className="banner warning">Switch to Wallet mode to finalize this withdrawal.</div>
        ) : null}
        <button
          className="primary-button"
          disabled={!ready || account.isWatchMode || isChainMismatch || !selectedTxHash || l1AddressMissing}
          onClick={submitFinalize}
        >
          Finalize
        </button>
        {submitError ? <ErrorNotice error={submitError} variant="banner" /> : null}
        <div className="small muted" style={{ marginTop: 12 }}>
          Finalization requires L1 confirmation and proof availability. Keep this tab open or return
          later.
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
