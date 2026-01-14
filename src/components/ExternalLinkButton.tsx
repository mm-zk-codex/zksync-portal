import { ReactNode } from "react";

type ExternalLinkButtonProps = {
  href: string;
  label: string;
  className?: string;
  children?: ReactNode;
};

export const ExternalLinkButton = ({ href, label, className, children }: ExternalLinkButtonProps) => {
  return (
    <a
      className={`icon-button ${className ?? ""}`.trim()}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
    >
      {children ?? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9.5 2H14V6.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 9.5L14 2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 3H4.5C3.12 3 2 4.12 2 5.5V11.5C2 12.88 3.12 14 4.5 14H10.5C11.88 14 13 12.88 13 11.5V9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </a>
  );
};
