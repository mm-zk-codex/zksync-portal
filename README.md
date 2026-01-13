# Atlas Portal (Pure Client MVP)

A static, client-only portal for the zkSync Elastic Network Atlas chains. The app connects directly to RPC endpoints from the browser (no helper server).

## Requirements

- Node.js 18+
- An injected wallet (EIP-1193, e.g. MetaMask) for write actions

## Local development

```bash
npm install
npm run dev
```

## Build for static hosting

```bash
npm run build
```

The output is in `dist/` and can be served by Netlify, Vercel Static, Caddy, or any static host.

## Environment variables

Create a `.env` file (see `.env.example`):

- `VITE_BRAND_KEY`: brand entry from `config/brands.json`.
- `VITE_SINGLE_CHAIN_KEY`: if set, forces single-chain mode and redirects `/` to that chain.

## Config files

Edit config files to add chains or tokens:

- `config/chains.json`
- `config/tokens.json`
- `config/brands.json`

Example steps to add a token:

1. Locate the chain entry in `config/tokens.json`.
2. Add a new token object with `symbol`, `decimals`, and `address` (or `null` if native).
3. Ensure `enabled` is set to `true`.

## Branding assets

Brand assets live in `public/brand/<brandKey>/` and are referenced from `config/brands.json`.

Minimal assets required:

- `logo.svg`
- `favicon.svg`
- `background.svg`

## Known limitations

See `docs/MVP_LIMITATIONS.md` for RPC-only history constraints and withdrawal readiness details.
