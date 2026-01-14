# State Machines

This document defines the portal’s state machines for **deposit**, **withdraw**, and **withdrawal finalization** flows. It focuses on inputs, observable states, and error handling. No implementation is included.

## Common Inputs
- `chainKey` (stable string id)  
- `token` (symbol or L2 token address; native token is `isNative=true`)  
- `amount` (decimal string)  
- `address` (wallet or watch address)  

## Common Statuses
- `idle` — no action started  
- `pending` — transaction submitted, waiting for confirmation  
- `confirmed` — transaction confirmed on chain  
- `failed` — transaction failed or reverted  

## Error Categories & Messaging Guidance

| Error Category | Example Trigger | Recommended User Message |
| --- | --- | --- |
| Wrong network | Wallet chainId does not match selected `chainKey` | “Switch your wallet to the selected network to continue.” |
| RPC unavailable / rate-limited | RPC timeouts, 429s, or network errors | “RPC is unavailable or rate-limited. Please retry or change RPC.” |
| Token not configured | Token not found in config | “This token is not available in the portal configuration.” |
| Insufficient funds | Balance < required amount + fees | “Insufficient balance to cover amount and fees.” |
| User rejects transaction | Wallet signature rejected | “Transaction was rejected in the wallet.” |

> **Note:** The portal must provide clear recovery actions (retry, switch network, edit amount) instead of generic failures.

## Deposit Flow (Native & ERC-20)

### State Table

| State | Preconditions | Actions | Next State |
| --- | --- | --- | --- |
| `idle` | Inputs not complete | Collect inputs | `ready` |
| `ready` | Inputs valid | For ERC-20, check allowance | `needs-approval` or `awaiting-submit` |
| `needs-approval` | ERC-20 with insufficient allowance | Prompt approval tx | `approval-pending` |
| `approval-pending` | Approval tx submitted | Wait for confirmation | `awaiting-submit` or `failed` |
| `awaiting-submit` | Ready to deposit | Prompt deposit tx | `pending` |
| `pending` | Deposit tx submitted | Wait for confirmation | `confirmed` or `failed` |
| `confirmed` | Deposit confirmed | Show success | `complete` |
| `failed` | Tx failed | Show error + retry | `ready` |

### Notes
- Native token deposits skip approval.  
- Approval is only required if ERC-20 allowance is insufficient.  

## Withdraw Flow (Initiate)

### State Table

| State | Preconditions | Actions | Next State |
| --- | --- | --- | --- |
| `idle` | Inputs not complete | Collect inputs | `ready` |
| `ready` | Inputs valid | Prompt withdraw tx | `pending` |
| `pending` | Withdraw tx submitted | Wait for confirmation | `confirmed` or `failed` |
| `confirmed` | Withdraw confirmed on L2 | Provide finalization instructions | `complete` |
| `failed` | Tx failed | Show error + retry | `ready` |

## Withdrawal Finalization Flow

### Status Model
- `not-ready` — withdrawal exists but is not yet finalizable.  
- `ready-to-finalize` — proof is available; finalize can be submitted.  
- `submitted` — finalize tx submitted on L1.  
- `completed` — withdrawal finalized on L1.  
- `failed` — finalize tx failed or reverted.  

### State Table

| State | Preconditions | Actions | Next State |
| --- | --- | --- | --- |
| `idle` | `txHash` provided | Query withdrawal status | `not-ready` / `ready-to-finalize` / `completed` |
| `not-ready` | Withdrawal exists | Show ETA/refresh | `ready-to-finalize` |
| `ready-to-finalize` | Proof available | Prompt finalize tx | `submitted` |
| `submitted` | L1 tx submitted | Wait for confirmation | `completed` or `failed` |
| `completed` | Finalized | Show success | terminal |
| `failed` | L1 tx failed | Show error + retry | `ready-to-finalize` |

### Inputs
- `chainKey`, `txHash`, and optional `address` for watch mode.  

## Best-Effort History (No Indexer)
- History uses **RPC logs and receipt lookups** only.  
- Limitations:  
  - Partial results due to log pruning or RPC limitations.  
  - Pagination may be approximate and incomplete.  
  - Some transactions may not be discoverable without a dedicated indexer.  
