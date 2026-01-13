# Atlas Portal — Product Definition (Deliverable 0)

## Goals
- Provide a unified portal for **zkSync Atlas / Elastic Network** chains only (EVM-based). This explicitly **excludes legacy zkEVM** networks.  
- Support core bridge actions: **Deposit**, **Withdraw**, and **Finalize Withdrawal**.  
- Provide **best-effort history** without requiring an indexer.  
- Allow **wallet mode** (connected wallet) and **watch-address mode** (paste address without wallet).  
- Support two portal presentation modes: **All-chains** and **Single-chain** (branding/skin).  
- Support two operating modes: **Pure client** and **Thin helper** (optional read-only API).  

## Non-goals (for this deliverable)
- UI implementation or helper server implementation.  
- Onramps or fiat flows.  
- Full-featured account history indexer.  
- Multi-chain swapping or routing.  

## Supported Chains
- **Atlas / Elastic Network** chains only.  
- **Not supported:** legacy zkEVM networks.  

## Supported Features
- **Deposits** (L1 → L2).  
- **Withdrawals** (L2 → L1).  
- **Withdrawal finalization** (claim / execute on L1).  
- **History (best-effort)** via RPC logs and receipt lookups, with known limitations.  

## Portal Modes
1) **All-chains mode**  
   - Displays a list of configured chains from static config.  
   - User selects chain context inside the portal.  

2) **Single-chain mode**  
   - Same portal, but preconfigured and branded to a specific chain/ecosystem.  
   - Chain selection is hidden or constrained to the single chain.  

## Operating Modes
1) **Pure client**  
   - Static hosting.  
   - Browser calls RPC endpoints directly.  

2) **Thin helper (optional)**  
   - Read-only, stateless service with in-memory caching only.  
   - No database.  
   - Provides config aggregation and basic helpers (e.g., withdrawal status).  

## Key Terms & Definitions
- **L1**: Ethereum mainnet/testnet chain.  
- **L2**: zkSync Elastic/Atlas chain.  
- **Deposit**: L1 → L2 token transfer via zkSync bridge.  
- **Withdrawal**: L2 → L1 token transfer via zkSync bridge (initiation).  
- **Finalization**: L1 transaction that claims the withdrawal after it becomes ready.  
- **Chain**: A single zkSync Elastic Network chain, identified by a stable `chainKey`.  
- **Token**: Native or ERC-20 asset configured per chain.  
- **Watch-address mode**: User-provided address without wallet connection.  

## Future Scope Notes (Explicitly Out of Scope)
- SIWE / Prividium authentication and role-based access.  
- Token lists fetched from external registries.  
- Advanced analytics or historical indexing.  

## Assumptions / TBDs
- Bridge contract addresses and system contracts are provided by config, even if placeholders in examples.  
- Finalization readiness is determined by RPC queries and protocol-specific rules (defined later via `zksync-js`).  
