# MVP Limitations (Pure Client)

This MVP connects directly to RPC endpoints from the browser. Without an indexer or helper server, the portal can only provide best-effort history and finalization readiness.

## RPC-based history

- History depends on RPC support for `eth_getLogs` / `getHistory` and may omit deposits/withdrawals.
- Locally stored transactions (initiated within this portal) are always shown first.
- Use the Refresh button to re-query RPCs; results can still be incomplete.

## Withdrawal readiness

- Finalization readiness depends on proof availability on L1.
- The portal polls RPCs to check if a withdrawal is ready, but this is not guaranteed if providers lack the required method.
- Expect delays; keep the tab open or return later.

## Recommended RPC providers

- Use multiple RPC URLs per chain in `config/chains.json` for fallback.
- Prefer providers with zkSync-era compatibility and support for withdrawal status methods.
