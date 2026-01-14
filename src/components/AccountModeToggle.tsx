import type { AccountMode } from "../runtime/account";

const WalletIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2.5 5.5C2.5 4.4 3.4 3.5 4.5 3.5H11.5C12.6 3.5 13.5 4.4 13.5 5.5V10.5C13.5 11.6 12.6 12.5 11.5 12.5H4.5C3.4 12.5 2.5 11.6 2.5 10.5V5.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M10 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1.5 8C2.8 5.2 5.2 3.5 8 3.5C10.8 3.5 13.2 5.2 14.5 8C13.2 10.8 10.8 12.5 8 12.5C5.2 12.5 2.8 10.8 1.5 8Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

type AccountModeToggleProps = {
  mode: AccountMode;
  onChange: (mode: AccountMode) => void;
  compact?: boolean;
};

export const AccountModeToggle = ({ mode, onChange, compact = false }: AccountModeToggleProps) => {
  return (
    <div className={`segmented-control ${compact ? "compact" : ""}`}>
      <button
        type="button"
        className={mode === "wallet" ? "active" : ""}
        onClick={() => onChange("wallet")}
      >
        <WalletIcon />
        <span>{compact ? "Wallet" : "Connect wallet"}</span>
      </button>
      <button
        type="button"
        className={mode === "watch" ? "active" : ""}
        onClick={() => onChange("watch")}
      >
        <EyeIcon />
        <span>{compact ? "Watch" : "Watch address"}</span>
      </button>
    </div>
  );
};
