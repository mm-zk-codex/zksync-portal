import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAddress } from "ethers";
import { useAccount } from "../runtime/account";

export const WatchAddressForm = ({ variant = "card" }: { variant?: "card" | "inline" }) => {
  const account = useAccount();
  const [input, setInput] = useState(account.watchAddress ?? "");
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setInput(account.watchAddress ?? "");
  }, [account.watchAddress]);

  const syncAddressToUrl = (address: string | null) => {
    const params = new URLSearchParams(location.search);
    if (address) {
      params.set("address", address);
    } else {
      params.delete("address");
    }
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!input) {
      account.clearWatchAddress();
      syncAddressToUrl(null);
      setError(null);
      return;
    }
    try {
      const checksum = getAddress(input.trim());
      account.setWatchAddress(checksum);
      syncAddressToUrl(checksum);
      setError(null);
    } catch {
      setError("Invalid address format");
    }
  };

  const formContent = (
    <div className="flex" style={{ flexDirection: "column", gap: 8 }}>
      <div className="search-bar">
        <input
          className="input search-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search by address (0x...)"
        />
        <button className="search-button" type="submit" disabled={!input} aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {error ? <div className="small" style={{ color: "#ff9b9b" }}>{error}</div> : null}
    </div>
  );

  if (variant === "inline") {
    return (
      <form className="search-form" onSubmit={handleSubmit}>
        {formContent}
      </form>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      {formContent}
    </form>
  );
};
