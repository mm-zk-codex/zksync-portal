import { useState } from "react";

export const CopyLinkButton = ({ label = "Copy link" }: { label?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button className="secondary-button" onClick={handleCopy}>
      {copied ? "Copied" : label}
    </button>
  );
};
