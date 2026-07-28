import { afterEach, describe, expect, it, vi } from "vitest";
import { cooldownMs, isQuiet, quotes, setClockForTest } from "../src/crypto.js";

afterEach(() => { setClockForTest(); vi.unstubAllGlobals(); });

describe("CryptoWatch notification rules", () => {
  it("suppresses alerts during quiet hours, including an overnight range", () => {
    setClockForTest(() => Date.UTC(2026, 0, 1, 2, 0));
    expect(isQuiet({ telegramId: 1, timezone: "UTC", quietStart: "00:00", quietEnd: "08:00", summaryTime: "08:15", optInStatus: true, metricsConsent: true, watchlist: [], alerts: [], alertSequence: 0 })).toBe(true);
    setClockForTest(() => Date.UTC(2026, 0, 1, 12, 0));
    expect(isQuiet({ telegramId: 1, timezone: "UTC", quietStart: "22:00", quietEnd: "07:00", summaryTime: "08:15", optInStatus: true, metricsConsent: true, watchlist: [], alerts: [], alertSequence: 0 })).toBe(false);
  });

  it("escalates alert cooldowns up to one day", () => {
    expect(cooldownMs(0)).toBe(60 * 60_000);
    expect(cooldownMs(2)).toBe(4 * 60 * 60_000);
    expect(cooldownMs(20)).toBe(24 * 60 * 60_000);
  });

  it("requests and returns multiple coin quotes in one batch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ bitcoin: { usd: 100, usd_24h_change: 2 }, ethereum: { usd: 10, usd_24h_change: -1 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(quotes([{ coinId: "bitcoin" }, { coinId: "ethereum" }])).resolves.toEqual({ bitcoin: { price: 100, change: 2 }, ethereum: { price: 10, change: -1 } });
    expect(fetchMock.mock.calls[0][0]).toContain("bitcoin%2Cethereum");
  });
});
