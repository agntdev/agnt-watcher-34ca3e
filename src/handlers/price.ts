import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { formatMoney, knownCoin, quotes, records } from "../crypto.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "View prices", data: "price:show", order: 10 });
const composer = new Composer<Ctx>();
async function showPrices(ctx: Ctx, ticker?: string) {
  const user = records(ctx);
  const entries = ticker ? (() => { const c = knownCoin(ticker); return c ? [{ ticker: ticker.toUpperCase(), displayName: c.name, coinId: c.id }] : []; })() : user.watchlist;
  if (!entries.length) { await ctx.reply(ticker ? "I couldn't verify that ticker. Try BTC, ETH, or SOL." : "No coins yet — tap Add coin to build your watchlist."); return; }
  try {
    const data = await quotes(entries);
    const lines = entries.map(c => { const q = data[c.coinId]; return q ? `${c.ticker} ${formatMoney(q.price)} (${q.change >= 0 ? "+" : ""}${q.change.toFixed(2)}% today)` : `${c.ticker} is temporarily unavailable`; });
    await ctx.reply(lines.join("\n"));
  } catch { await ctx.reply("Price data is temporarily unavailable. Try again in a moment."); }
}
composer.command("price", async (ctx) => { const input = ctx.message?.text?.split(/\s+/, 2)[1]; await showPrices(ctx, input); });
composer.callbackQuery("price:show", async (ctx) => { await ctx.answerCallbackQuery(); await showPrices(ctx); });
composer.callbackQuery("price:pick", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.reply("Send /price followed by a ticker, for example /price BTC.", { reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]) }); });
export default composer;
