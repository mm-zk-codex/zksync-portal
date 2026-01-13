import * as zksync from "@matterlabs/zksync-js";

export type WithdrawalStatus = {
  label: "not-ready" | "ready" | "finalized" | "unknown";
  details: string;
};

export const fetchWithdrawalStatus = async (
  provider: zksync.Provider,
  txHash: string
): Promise<WithdrawalStatus> => {
  const anyProvider = provider as unknown as { getWithdrawalStatus?: (hash: string) => Promise<number> };
  if (!anyProvider.getWithdrawalStatus) {
    return { label: "unknown", details: "Provider does not support withdrawal status checks." };
  }
  const status = await anyProvider.getWithdrawalStatus(txHash);
  switch (status) {
    case 0:
      return { label: "not-ready", details: "Withdrawal not yet ready for finalization." };
    case 1:
      return { label: "ready", details: "Withdrawal is ready to finalize." };
    case 2:
      return { label: "finalized", details: "Withdrawal already finalized." };
    default:
      return { label: "unknown", details: "Unknown withdrawal status." };
  }
};

export const finalizeWithdrawal = async (
  wallet: zksync.Wallet,
  txHash: string
) => {
  const anyWallet = wallet as unknown as { finalizeWithdrawal?: (hash: string) => Promise<{ hash: string }> };
  if (!anyWallet.finalizeWithdrawal) {
    throw new Error("Finalize withdrawal is not supported by this wallet SDK");
  }
  return anyWallet.finalizeWithdrawal(txHash);
};
