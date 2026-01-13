# Security & Safety

## Wallet Safety Guidance
- Always display **transaction details** (amount, token, destination chain, and fees) before signature.  
- Provide **explorer links** for both L1 and L2 transactions.  
- Show **chain context banners** so users know where they are signing.  

## RPC Trust Model
- The portal depends on configured RPC endpoints for state and transaction submission.  
- RPCs can be unreliable or censored; users should be able to switch to fallback RPCs.  
- Clearly warn users when RPC data is stale or unavailable.  

## Token List Safety Policy
- Tokens are **config-only** in this deliverable.  
- If user-paste token addresses are allowed in future:  
  - Show a strong warning about unverified tokens.  
  - Validate checksum formatting.  
  - Require explicit user confirmation before proceeding.  

## Contract / Address Verification
- Display checksummed addresses.  
- Link to chain explorers for bridge/system contract addresses.  
- Highlight when an address is not verified on the explorer.  

## Anti-Phishing UX Notes
- Always show chain name and logo.  
- Use distinct theming per chain in single-chain mode.  
- Avoid ambiguous abbreviations or truncated chain names.  

## Private Key Handling
- **Never** handle or store private keys.  
- All signing happens in the user’s wallet.  
