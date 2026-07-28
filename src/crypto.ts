import type { Ctx } from "./bot.js";

export type AlertType = "threshold" | "percent";
export interface AlertRule {
  id: string;
  ticker: string;
  coinId: string;
  type: AlertType;
  value: number;
  enabled: boolean;
  baseline?: number;
  cooldownUntil?: number;
  fireCount: number;
}
export interface UserRecords {
  telegramId: number;
  timezone: string;
  quietStart: string;
  quietEnd: string;
  summaryTime: string;
  optInStatus: boolean;
  metricsConsent: boolean;
  watchlist: { ticker: string; displayName: string; coinId: string }[];
  alerts: AlertRule[];
  alertSequence: number;
}

const COINS: Record<string, { id: string; name: string }> = {
  BTC: { id: "bitcoin", name: "Bitcoin" }, ETH: { id: "ethereum", name: "Ethereum" },
  SOL: { id: "solana", name: "Solana" }, XRP: { id: "ripple", name: "XRP" },
  ADA: { id: "cardano", name: "Cardano" }, DOGE: { id: "dogecoin", name: "Dogecoin" },
  AVAX: { id: "avalanche-2", name: "Avalanche" }, DOT: { id: "polkadot", name: "Polkadot" },
  LINK: { id: "chainlink", name: "Chainlink" }, MATIC: { id: "matic-network", name: "Polygon" },
};

let clock: () => number = () => new Date().getTime();
/** Test seam for every time-based decision in this module. */
export const now = () => clock();
export const setClockForTest = (source?: () => number) => { clock = source ?? (() => new Date().getTime()); };

export function records(ctx: Ctx): UserRecords {
  if (!ctx.session.records) {
    const zone = safeZone(ctx.from?.language_code);
    ctx.session.records = { telegramId: ctx.from?.id ?? 0, timezone: zone, quietStart: "00:00", quietEnd: "08:00", summaryTime: "08:15", optInStatus: false, metricsConsent: false, watchlist: [], alerts: [], alertSequence: 0 };
  }
  return ctx.session.records;
}
function safeZone(language?: string): string {
  // Telegram does not provide a timezone. UTC is transparent until the user chooses one.
  return language ? "UTC" : "UTC";
}
export function knownCoin(input: string) { return COINS[input.trim().toUpperCase()]; }
export function coinOptions(r: UserRecords) { return r.watchlist.slice(0, 8); }
export function isQuiet(r: UserRecords, at = now()): boolean {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: r.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(at));
    const time = `${parts.find(p => p.type === "hour")?.value}:${parts.find(p => p.type === "minute")?.value}`;
    const value = toMinutes(time), start = toMinutes(r.quietStart), end = toMinutes(r.quietEnd);
    return start === end ? false : start < end ? value >= start && value < end : value >= start || value < end;
  } catch { return false; }
}
function toMinutes(value: string) { const [h, m] = value.split(":").map(Number); return h * 60 + m; }
export function validTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function formatMoney(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 6 : 2 }).format(value); }

export interface Quote { price: number; change: number; }
export async function quotes(entries: { coinId: string }[]): Promise<Record<string, Quote>> {
  const ids = [...new Set(entries.map(e => e.coinId))];
  if (!ids.length) return {};
  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=usd&include_24hr_change=true`);
  if (!response.ok) throw new Error("feed unavailable");
  const raw = await response.json() as Record<string, { usd?: number; usd_24h_change?: number }>;
  const out: Record<string, Quote> = {};
  for (const id of ids) if (typeof raw[id]?.usd === "number") out[id] = { price: raw[id].usd!, change: raw[id].usd_24h_change ?? 0 };
  return out;
}
export function alertTriggered(rule: AlertRule, quote: Quote): boolean {
  if (!rule.enabled || (rule.cooldownUntil ?? 0) > now()) return false;
  return rule.type === "threshold" ? quote.price >= rule.value : Math.abs(((quote.price - (rule.baseline ?? quote.price)) / (rule.baseline ?? quote.price)) * 100) >= rule.value;
}
export function cooldownMs(fireCount: number) { return Math.min(24 * 60 * 60_000, 60 * 60_000 * Math.max(1, 2 ** Math.min(fireCount, 5))); }
