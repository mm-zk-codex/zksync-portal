# Routes & Deep Links

This document defines the canonical routes, query parameters, and deep-link behavior for both **all-chains** and **single-chain** modes.

## Canonical Route Table

| Route | Description | Required Params | Optional Params |
| --- | --- | --- | --- |
| `/` | Landing / chain selector | none | `mode`, `chainKey` |
| `/chain/:chainKey` | Chain dashboard / overview | `chainKey` path | `address` |
| `/chain/:chainKey/deposit` | Deposit flow | `chainKey` path | `token`, `amount`, `address` |
| `/chain/:chainKey/withdraw` | Withdraw flow | `chainKey` path | `token`, `amount`, `address` |
| `/chain/:chainKey/finalize` | Withdrawal finalization | `chainKey` path | `txHash`, `address` |
| `/chain/:chainKey/activity` | Activity / history | `chainKey` path | `address` |

### Query Param Definitions
- `chainKey`: **Stable string identifier** from config (not just `chainId`).
- `token`: Token symbol or token address (symbol preferred when configured).  
- `amount`: Decimal amount string (no separators).  
- `address`: Watch address (0x...) for **watch-address mode**.  
- `txHash`: Transaction hash for withdrawal finalization.  
- `mode`: Optional UI hint (`all` or `single`) when landing at `/`.  

## Landing Behavior

### All-chains mode
- `/` displays a chain list derived from config.  
- If `chainKey` is provided, auto-navigate to `/chain/:chainKey`.  

### Single-chain mode
- `/` resolves to the configured single chain and redirects to `/chain/:chainKey`.  
- Chain selector is hidden or disabled.  

## Watch-Address Mode
- Any route can include `address` to activate watch-address mode.  
- The UI should not require wallet connection when `address` is present.  
- If both wallet and `address` are present, **wallet takes precedence** unless user explicitly toggles to watch mode.  

## Deep Link Examples

### Open chain dashboard
- `/chain/abstract-mainnet`  
- `/chain/atlas-testnet?address=0x1111111111111111111111111111111111111111`  

### Open deposit for token
- `/chain/abstract-mainnet/deposit?token=ETH`  
- `/chain/atlas-testnet/deposit?token=USDC&amount=100&address=0x2222222222222222222222222222222222222222`  

### Open withdraw for token
- `/chain/abstract-mainnet/withdraw?token=ETH`  
- `/chain/abstract-mainnet/withdraw?token=0x3333333333333333333333333333333333333333&amount=1.25`  

### Open activity/history for an address
- `/chain/abstract-mainnet/activity?address=0x4444444444444444444444444444444444444444`  

### Open finalize screen for a tx hash
- `/chain/atlas-testnet/finalize?txHash=0x5555555555555555555555555555555555555555555555555555555555555555`  
- `/chain/atlas-testnet/finalize?txHash=0x6666666666666666666666666666666666666666666666666666666666666666&address=0x7777777777777777777777777777777777777777`  

## Chain Key Selection Rules
- `chainKey` is the **canonical stable string ID** from config (e.g., `abstract-mainnet`, `atlas-testnet`).  
- Deep links **must not** assume `chainId` maps to a specific `chainKey`.  
- When a chain is renamed or rebranded, the `chainKey` must remain stable for deep links to remain valid.
