import { getTokensForChain } from "./config";

export const findToken = (chainKey: string, tokenParam?: string | null) => {
  const tokens = getTokensForChain(chainKey);
  if (!tokenParam) {
    return tokens[0];
  }
  const lowered = tokenParam.toLowerCase();
  return (
    tokens.find((token) => token.symbol.toLowerCase() === lowered) ||
    tokens.find((token) => token.address?.toLowerCase() === lowered) ||
    tokens[0]
  );
};
