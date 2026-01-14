import React, { createContext, useContext, useEffect, useMemo } from "react";
import { BrandConfig, getBrand } from "../utils/config";
import { BRAND_KEY } from "../utils/env";

type BrandState = {
  brand: BrandConfig;
};

const BrandContext = createContext<BrandState | undefined>(undefined);

export const BrandProvider = ({ children }: { children: React.ReactNode }) => {
  const brand = getBrand(BRAND_KEY);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", brand.theme.primary);
    root.style.setProperty("--color-secondary", brand.theme.secondary);
    root.style.setProperty("--color-background", brand.theme.background);
    root.style.setProperty("--color-text", brand.theme.text);
    root.style.setProperty("--color-muted", brand.theme.muted);
    root.style.setProperty("--brand-background-image", `url(/${brand.assets.background})`);
    document.title = brand.copy.appName;
    const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (favicon) {
      favicon.href = `/${brand.assets.favicon}`;
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = `/${brand.assets.favicon}`;
      document.head.appendChild(link);
    }
  }, [brand]);

  const value = useMemo(() => ({ brand }), [brand]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within BrandProvider");
  }
  return context;
};
