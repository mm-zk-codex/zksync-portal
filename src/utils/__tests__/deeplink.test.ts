import { describe, expect, it } from "vitest";
import { buildQueryParams, parseQueryParams } from "../deeplink";

describe("deeplink parsing", () => {
  it("parses query params", () => {
    const params = parseQueryParams("?token=ETH&amount=1&address=0xabc&txHash=0x123");
    expect(params.token).toBe("ETH");
    expect(params.amount).toBe("1");
    expect(params.address).toBe("0xabc");
    expect(params.txHash).toBe("0x123");
  });

  it("builds query params", () => {
    const query = buildQueryParams({ token: "ETH", amount: "1" });
    expect(query).toBe("?token=ETH&amount=1");
  });
});
