import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { cooldownMs, knownCoin, records } from "../crypto.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Create alert", data: "alert:create", order: 40 });
const composer = new Composer<Ctx>();
const menu = () => inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]);
composer.callbackQuery("alert:create", async (ctx) => {
  await ctx.answerCallbackQuery(); const user = records(ctx);
  if (!user.watchlist.length) { await ctx.reply("Add a coin before creating an alert.", { reply_markup: inlineKeyboard([[inlineButton("Add coin", "watchlist:add")], [inlineButton("Back to menu", "menu:main")]]) }); return; }
  await ctx.reply("Choose a coin for this alert.", { reply_markup: inlineKeyboard([...user.watchlist.slice(0, 8).map(c => [inlineButton(`${c.ticker} — ${c.displayName}`, `alert:coin:${c.ticker}`)]), [inlineButton("Cancel", "alert:cancel")]]) });
});
composer.callbackQuery(/^alert:coin:([A-Z]{2,10})$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!knownCoin(ctx.match[1])) { await ctx.reply("That coin is unavailable. Start again from Create alert."); return; }
  ctx.session.flow = { kind: "alert_value", alertTicker: ctx.match[1] };
  await ctx.reply(`Choose an alert type for ${ctx.match[1]}.`, { reply_markup: inlineKeyboard([[inlineButton("Price threshold", "alert:type:threshold"), inlineButton("Percentage move", "alert:type:percent")], [inlineButton("Cancel", "alert:cancel")]]) });
});
composer.callbackQuery(/^alert:type:(threshold|percent)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (ctx.session.flow?.kind !== "alert_value") { await ctx.reply("Start by choosing Create alert."); return; }
  ctx.session.flow.alertType = ctx.match[1] as "threshold" | "percent";
  await ctx.reply(ctx.match[1] === "threshold" ? "Send the USD price that should trigger this alert." : "Send the percentage move that should trigger this alert. The lookback is one hour.");
});
composer.on("message:text", async (ctx, next) => {
  const flow = ctx.session.flow;
  if (flow?.kind !== "alert_value" || !flow.alertType) return next();
  const value = Number(ctx.message.text.trim().replace(/[$,%]/g, ""));
  if (!Number.isFinite(value) || value <= 0) { await ctx.reply("Send a positive number, such as 65000 or 5."); return; }
  const coin = knownCoin(flow.alertTicker ?? "");
  if (!coin) { ctx.session.flow = undefined; await ctx.reply("That coin is unavailable. Start again from Create alert."); return; }
  await ctx.reply(`${coin.name}: ${flow.alertType === "threshold" ? `alert at $${value}` : `alert after a ${value}% move`}. Alerts pause during quiet hours and start with a one-hour cooldown.`, { reply_markup: inlineKeyboard([[inlineButton("Confirm alert", `alert:confirm:${value}`), inlineButton("Cancel", "alert:cancel")]]) });
});
composer.callbackQuery(/^alert:confirm:([0-9]+(?:\.[0-9]+)?)$/, async (ctx) => {
  await ctx.answerCallbackQuery(); const flow = ctx.session.flow; const coin = knownCoin(flow?.alertTicker ?? ""); const user = records(ctx);
  if (flow?.kind !== "alert_value" || !flow.alertType || !coin) { await ctx.reply("This alert setup expired. Start again from Create alert."); return; }
  const value = Number(ctx.match[1]); const id = `a${++user.alertSequence}`;
  user.alerts.push({ id, ticker: flow.alertTicker!, coinId: coin.id, type: flow.alertType, value, enabled: true, fireCount: 0 });
  ctx.session.flow = undefined;
  await ctx.editMessageText(`Your ${flow.alertTicker} alert is active. It pauses during quiet hours.`, { reply_markup: inlineKeyboard([[inlineButton("View alerts", "alert:list")], [inlineButton("Back to menu", "menu:main")]]) });
});
composer.callbackQuery("alert:list", async (ctx) => { await ctx.answerCallbackQuery(); const alerts = records(ctx).alerts; await ctx.editMessageText(alerts.length ? alerts.map(a => `${a.ticker}: ${a.type === "threshold" ? `$${a.value}` : `${a.value}%`} — ${a.enabled ? "active" : "paused"}`).join("\n") : "No alerts yet — tap Create alert to add one.", { reply_markup: menu() }); });
composer.callbackQuery("alert:cancel", async (ctx) => { await ctx.answerCallbackQuery(); ctx.session.flow = undefined; await ctx.editMessageText("Alert setup was cancelled.", { reply_markup: menu() }); });
// Exported helpers make scheduled workers able to evaluate rules without duplicating cooldown logic.
export { cooldownMs };
export default composer;
