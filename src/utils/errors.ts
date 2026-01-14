export type ErrorCategory =
  | "USER_REJECTED"
  | "INSUFFICIENT_FUNDS"
  | "INSUFFICIENT_TOKEN"
  | "RPC_ERROR"
  | "NETWORK_MISMATCH"
  | "CONTRACT_REVERT"
  | "CONFIG_ERROR"
  | "UNKNOWN";

export type NormalizedError = {
  title: string;
  message: string;
  category: ErrorCategory;
  details: string;
};

type ErrorContext = Record<string, unknown>;

const safeStringify = (value: unknown) =>
  JSON.stringify(
    value,
    (_key, val) => (typeof val === "bigint" ? val.toString() : val),
    2
  );

const extractErrorMessage = (error: unknown) => {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unknown error";
};

const extractErrorCode = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code?: number | string }).code;
  }
  return undefined;
};

export const formatErrorDetails = (error: unknown, context?: ErrorContext) => {
  const message = extractErrorMessage(error);
  const code = extractErrorCode(error);
  const details = {
    message,
    code,
    stack: error && typeof error === "object" && "stack" in error ? (error as { stack?: string }).stack : undefined,
    context: context ?? {}
  };
  return safeStringify(details);
};

export const createNormalizedError = (input: {
  title: string;
  message: string;
  category: ErrorCategory;
  details?: string;
  context?: ErrorContext;
}): NormalizedError => {
  return {
    title: input.title,
    message: input.message,
    category: input.category,
    details: input.details ?? safeStringify({ message: input.message, context: input.context ?? {} })
  };
};

export const normalizeError = (error: unknown, context?: ErrorContext): NormalizedError => {
  const message = extractErrorMessage(error);
  const code = extractErrorCode(error);
  const lowered = message.toLowerCase();
  const details = formatErrorDetails(error, context);

  if (code === 4001 || lowered.includes("user rejected") || lowered.includes("request rejected")) {
    return {
      title: "Request rejected",
      message: "Request was rejected in your wallet.",
      category: "USER_REJECTED",
      details
    };
  }

  if (code === 4902 || lowered.includes("unrecognized chain") || lowered.includes("unknown chain")) {
    return {
      title: "Unknown chain",
      message: "This chain is not added in your wallet yet.",
      category: "NETWORK_MISMATCH",
      details
    };
  }

  if (lowered.includes("insufficient funds") || lowered.includes("intrinsic transaction cost")) {
    return {
      title: "Insufficient funds",
      message: "You do not have enough native balance to cover the transaction and gas fees.",
      category: "INSUFFICIENT_FUNDS",
      details
    };
  }

  if (
    lowered.includes("insufficient balance") ||
    lowered.includes("transfer amount exceeds balance") ||
    lowered.includes("balance too low")
  ) {
    return {
      title: "Insufficient token balance",
      message: "You do not have enough token balance to complete this transaction.",
      category: "INSUFFICIENT_TOKEN",
      details
    };
  }

  if (
    lowered.includes("failed to fetch") ||
    lowered.includes("cors") ||
    lowered.includes("rate limit") ||
    lowered.includes("429") ||
    lowered.includes("timeout") ||
    lowered.includes("network error") ||
    lowered.includes("could not connect") ||
    lowered.includes("connection refused")
  ) {
    return {
      title: "RPC unavailable",
      message: "Couldn’t check balance right now. Try again or change RPC.",
      category: "RPC_ERROR",
      details
    };
  }

  if (lowered.includes("execution reverted") || lowered.includes("revert")) {
    return {
      title: "Transaction would fail",
      message: "Transaction would fail. Check amount, token, and network.",
      category: "CONTRACT_REVERT",
      details
    };
  }

  if (lowered.includes("invalid address") || lowered.includes("bad address")) {
    return {
      title: "Invalid address",
      message: "The address format looks invalid. Double-check and try again.",
      category: "CONFIG_ERROR",
      details
    };
  }

  if (lowered.includes("missing wallet metadata")) {
    return {
      title: "Chain configuration missing",
      message: "This chain can’t be added automatically; missing wallet metadata in config.",
      category: "CONFIG_ERROR",
      details
    };
  }

  if (lowered.includes("no injected wallet") || (lowered.includes("ethereum") && lowered.includes("not found"))) {
    return {
      title: "Wallet not detected",
      message: "No injected wallet found. Install MetaMask or a compatible wallet.",
      category: "CONFIG_ERROR",
      details
    };
  }

  if (lowered.includes("no accounts") || lowered.includes("accounts returned empty") || lowered.includes("no accounts returned")) {
    return {
      title: "Wallet locked",
      message: "Wallet is locked or has no available accounts.",
      category: "CONFIG_ERROR",
      details
    };
  }

  return {
    title: "Something went wrong",
    message: message || "Unexpected error. Please try again.",
    category: "UNKNOWN",
    details
  };
};
