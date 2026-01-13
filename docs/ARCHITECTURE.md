# Architecture (High-Level)

This document defines module boundaries and operating modes without implementation details.

## Source of Truth
- **Chains, tokens, and brand packs** are sourced from static config files in `config/` and `brand/`.  
- The portal must treat these configs as the **single source of truth**.  

## Frontend Modules
- **Config Loader**: Loads `chains`, `tokens`, and `brands` configs; validates against schemas.  
- **Chain Selector**: Lists available chains (all-chains mode) or locks to a single chain (single-chain mode).  
- **Wallet Connector (later)**: Integrates with wallet providers for signing.  
- **Watch-Address Mode**: Allows viewing activity and status by pasted address.  
- **Bridge/Tx Orchestration (later)**: Uses `@matterlabs/zksync-js` to prepare and submit txs.  
- **Status Polling**: Polls for tx receipts, finalization readiness, and errors.  
- **History Fetcher**: Best-effort RPC log/receipt scanning.  
- **Theming/Branding**: Applies brand pack and overrides.  

## Operating Modes

### Pure Client Mode (Static Hosting)
**Data flow (textual):**
1. Load configs from local JSON files.  
2. User selects chain or lands on single-chain.  
3. Browser calls chain RPCs directly.  
4. UI polls status and renders results.  

### Thin Helper Mode (Optional Read-Only Service)
**Adds:**
- Aggregated config endpoints (`/chains`).  
- Cached withdrawal status checks to reduce RPC load.  
- Optional history lookup (best-effort).  

**Constraints:**
- **Stateless**, **read-only**, **no database**.  
- In-memory cache only, short TTLs.  
- If helper is down, UI should **fall back to pure client** behavior.  

## Config & Branding Boundaries
- **Chains** define network connectivity and bridge contract addresses.  
- **Tokens** define what assets are available per chain.  
- **Brands** define UI theming and copy overrides for single-chain mode.  
