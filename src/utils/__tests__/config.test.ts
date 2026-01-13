import { describe, expect, it } from "vitest";
import { parseBrands, parseChains, parseTokens } from "../config";

const sampleChains = [
  {
    chainKey: "atlas-testnet",
    chainId: 123,
    name: "Atlas",
    networkType: "testnet",
    rpcUrls: ["https://rpc"],
    explorerUrls: ["https://explorer"],
    l1ChainId: 11155111,
    l1RpcUrls: ["https://l1"],
    contracts: {
      l1Bridge: "0x1",
      l2Bridge: "0x2",
      l1SharedBridge: "0x3",
      l2SharedBridge: "0x4",
      l1Weth: "0x5",
      l2Weth: "0x6"
    },
    features: {
      deposits: true,
      withdrawals: true,
      finalizeSupported: true
    },
    ui: {
      logoKey: "atlas",
      themeKey: "default"
    }
  }
];

const sampleBrands = [
  {
    brandKey: "default",
    displayName: "Atlas Portal",
    assets: {
      logo: "logo.svg",
      favicon: "favicon.svg",
      background: "bg.svg"
    },
    theme: {
      primary: "#000",
      secondary: "#111",
      background: "#000",
      text: "#fff",
      muted: "#999"
    },
    copy: {
      appName: "Atlas Portal",
      tagline: "Test",
      footerLinks: []
    }
  }
];

const sampleTokens = [
  {
    chainKey: "atlas-testnet",
    tokens: [
      {
        symbol: "ETH",
        name: "Ether",
        decimals: 18,
        address: null,
        isNative: true,
        enabled: true
      }
    ]
  }
];

describe("config parsing", () => {
  it("parses chain config", () => {
    expect(parseChains(sampleChains)).toHaveLength(1);
  });

  it("parses brand config", () => {
    expect(parseBrands(sampleBrands)).toHaveLength(1);
  });

  it("parses token config", () => {
    expect(parseTokens(sampleTokens)).toHaveLength(1);
  });
});
