import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAddress } from "ethers";
import { useAccount } from "../runtime/account";

export const WatchAddressForm = () => {
  const account = useAccount();
  const [input, setInput] = useState(account.watchAddress ?? "");
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="flex" style={{ flexDirection: "column", gap: 8 }}>
        <label className="small muted">Watch address (no wallet required)</label>
        <input
          className="input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="0x..."
        />
        {error ? <div className="small" style={{ color: "#ff9b9b" }}>{error}</div> : null}
        <div className="flex">
          <button className="primary-button" type="submit">
            {input ? "Save watch address" : "Clear watch address"}
          </button>
        </div>
      </div>
    </form>
  );
};
