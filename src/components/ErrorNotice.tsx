import { useState } from "react";
import { NormalizedError } from "../utils/errors";

type ErrorNoticeProps = {
  error: NormalizedError;
  variant?: "banner" | "inline";
};

export const ErrorNotice = ({ error, variant = "banner" }: ErrorNoticeProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(error.details);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`error-box ${variant}`}>
      <div className="error-title">{error.title}</div>
      <div className="error-message">{error.message}</div>
      <details>
        <summary>Technical details</summary>
        <pre className="code small">{error.details}</pre>
        <button className="secondary-button small" type="button" onClick={handleCopy}>
          {copied ? "Copied details" : "Copy technical details"}
        </button>
      </details>
    </div>
  );
};
