export type DeepLinkParams = {
  chainKey?: string;
  token?: string | null;
  amount?: string | null;
  address?: string | null;
  txHash?: string | null;
  mode?: string | null;
};

export const parseQueryParams = (search: string): DeepLinkParams => {
  const params = new URLSearchParams(search);
  const entries = (key: string) => params.get(key);
  return {
    chainKey: entries("chainKey") ?? undefined,
    token: entries("token"),
    amount: entries("amount"),
    address: entries("address"),
    txHash: entries("txHash"),
    mode: entries("mode")
  };
};

export const buildQueryParams = (params: Record<string, string | null | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};
