import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { knownCoin, records } from "../crypto.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Add coin", data: "watchlist:add", order: 20 });
registerMainMenuItem({ label: "Watchlist", data: "watchlist:show", order: 30 });
const composer = new Composer<Ctx>();
const back = inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]);

composer.callbackQuery("watchlist:add", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.flow = { kind: "add_coin" };
  await ctx.reply("Send a ticker such as BTC, ETH, or SOL.");
});
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.flow?.kind !== "add_coin") return next();
  const ticker = ctx.message.text.trim().toUpperCase();
  const coin = knownCoin(ticker);
  if (!coin) {
    await ctx.reply("I couldn't verify that ticker. Try BTC, ETH, SOL, XRP, ADA, DOGE, AVAX, DOT, LINK, or MATIC.");
    return;
  }
  await ctx.reply(`${coin.name} (${ticker}) found. Add it to your watchlist?`, { reply_markup: inlineKeyboard([[inlineButton("Add coin", `watchlist:confirm:${ticker}`), inlineButton("Cancel", "watchlist:cancel")]]) });
});
composer.callbackQuery(/^watchlist:confirm:([A-Z]{2,10})$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const coin = knownCoin(ctx.match[1]); const user = records(ctx);
  if (!coin) { await ctx.reply("That ticker is no longer available. Try adding it again."); return; }
  if (!user.watchlist.some(entry => entry.ticker === ctx.match[1])) user.watchlist.push({ ticker: ctx.match[1], displayName: coin.name, coinId: coin.id });
  ctx.session.flow = undefined;
  await ctx.editMessageText(`${coin.name} is on your watchlist.`, { reply_markup: inlineKeyboard([[inlineButton("View prices", "price:show"), inlineButton("Create alert", "alert:create")], [inlineButton("Back to menu", "menu:main")]]) });
});
composer.callbackQuery("watchlist:cancel", async (ctx) => { await ctx.answerCallbackQuery(); ctx.session.flow = undefined; await ctx.editMessageText("Adding a coin was cancelled.", { reply_markup: back }); });
composer.callbackQuery("watchlist:show", async (ctx) => {
  await ctx.answerCallbackQuery(); const user = records(ctx);
  const text = user.watchlist.length ? `Your watchlist:\n${user.watchlist.map(c => `${c.ticker} — ${c.displayName}`).join("\n")}` : "No coins yet — tap Add coin to build your watchlist.";
  await ctx.editMessageText(text, { reply_markup: inlineKeyboard([[inlineButton("Add coin", "watchlist:add")], [inlineButton("Back to menu", "menu:main")]]) });
});
export default composer;
