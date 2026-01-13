# Optional Thin Helper API (Read-Only)

This document specifies a **read-only**, **stateless** helper service. It is **not implemented** in this deliverable.

## Principles
- **No database** (in-memory cache allowed).  
- **Read-only** endpoints.  
- **Stateless** (safe to scale horizontally).  

## Endpoints

### GET /health
**Description:** Basic health check.

**Response (200)**
```json
{
  "status": "ok",
  "version": "0.0.0",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Caching:** none.  
**Errors:** `500` if unhealthy.

---

### GET /chains
**Description:** Returns chain + token configuration bundled for the UI.

**Query Params:** none.

**Response (200)**
```json
{
  "chains": [/* chain entries */],
  "tokens": [/* token entries */],
  "brands": [/* brand entries */],
  "source": "config",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Caching:** 5–15 minutes TTL.  
**Errors:** `500` on fetch/parse failure.

---

### GET /withdrawal-status
**Description:** Returns status for a withdrawal based on chainKey and txHash.

**Query Params**
- `chainKey` (string, required)  
- `txHash` (string, required)  

**Response (200)**
```json
{
  "chainKey": "atlas-testnet",
  "txHash": "0x...",
  "status": "not-ready",
  "l1TxHash": null,
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Status values:** `not-ready`, `ready-to-finalize`, `submitted`, `completed`, `failed`.

**Caching:** 30–120 seconds TTL.  
**Errors:** `400` for missing params; `404` if withdrawal not found; `500` for RPC errors.

---

### (Optional) GET /address-history
**Description:** Best-effort history lookup for an address on a chain.

**Query Params**
- `chainKey` (string, required)  
- `address` (string, required)  
- `cursor` (string, optional)  

**Response (200)**
```json
{
  "chainKey": "atlas-testnet",
  "address": "0x...",
  "items": [/* tx summaries */],
  "nextCursor": null,
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Caching:** 1–5 minutes TTL.  
**Errors:** `400` for missing params; `500` for RPC errors.

## Config Refresh (Conceptual)
- Helper periodically fetches config JSON from GitHub (or similar).  
- Validation is performed against the JSON schemas before serving.  
- If remote fetch fails, helper serves **last-known-good** config from memory.  
