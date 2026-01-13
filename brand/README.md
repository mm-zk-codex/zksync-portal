# Branding Packs

Branding is configuration-driven to avoid code forks. The portal reads brand packs from `config/brands.example.json` (or future equivalents) and applies them at runtime.

## Asset Organization
- Assets live under `brand/<brandKey>/` (example paths in the config).  
- Recommended assets:
  - `logo.svg`
  - `favicon.ico`
  - `background.png` (optional)

## Selecting a Brand
- An environment variable (e.g., `BRAND=abstract`) selects a brand pack at runtime.  
- If unset, the portal uses `brandKey=default`.  

## Overridable Fields
- **Assets**: logo, favicon, background.  
- **Theme tokens**: primary, secondary, background, text, muted.  
- **Copy**: app name, tagline, footer links.  

## Design Constraints
- Keep branding **config-driven** to avoid divergence.  
- Changes should not require code forks or per-chain hardcoding.  
