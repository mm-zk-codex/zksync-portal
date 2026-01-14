export type StoredTx = {
  id: string;
  type: "deposit" | "withdraw" | "finalize";
  chainKey: string;
  address: string;
  token: string;
  amount: string;
  txHash: string;
  explorerUrl?: string;
  createdAt: number;
  updatedAt: number;
  status: "submitted" | "confirmed" | "failed";
};

const STORAGE_KEY = "atlas_portal_txs";

const readStore = (): StoredTx[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as StoredTx[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStore = (items: StoredTx[]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const getStoredTxs = (chainKey?: string, address?: string) => {
  const items = readStore();
  return items.filter((item) => {
    if (chainKey && item.chainKey !== chainKey) {
      return false;
    }
    if (address && item.address.toLowerCase() !== address.toLowerCase()) {
      return false;
    }
    return true;
  });
};

export const upsertStoredTx = (tx: StoredTx) => {
  const items = readStore();
  const index = items.findIndex((item) => item.id === tx.id);
  if (index >= 0) {
    items[index] = tx;
  } else {
    items.push(tx);
  }
  writeStore(items);
};

export const updateStoredTxStatus = (id: string, status: StoredTx["status"]) => {
  const items = readStore();
  const index = items.findIndex((item) => item.id === id);
  if (index >= 0) {
    items[index] = {
      ...items[index],
      status,
      updatedAt: Date.now()
    };
    writeStore(items);
  }
};
