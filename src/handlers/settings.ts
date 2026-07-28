import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { records, validTime } from "../crypto.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Settings", data: "settings:show", order: 50 });
const composer = new Composer<Ctx>();
const keyboard = () => inlineKeyboard([[inlineButton("Toggle summary", "settings:summary")], [inlineButton("Set quiet hours", "settings:quiet")], [inlineButton("Set timezone", "settings:timezone")], [inlineButton("Back to menu", "menu:main")]]);
composer.callbackQuery("settings:show", async ctx => { await ctx.answerCallbackQuery(); const u = records(ctx); await ctx.editMessageText(`Summary: ${u.optInStatus ? "on" : "off"} at ${u.summaryTime}\nQuiet hours: ${u.quietStart}–${u.quietEnd}\nTimezone: ${u.timezone}`, { reply_markup: keyboard() }); });
composer.callbackQuery("settings:summary", async ctx => { await ctx.answerCallbackQuery(); const u = records(ctx); u.optInStatus = !u.optInStatus; await ctx.editMessageText(`Morning summaries are ${u.optInStatus ? "enabled" : "disabled"}.`, { reply_markup: keyboard() }); });
composer.callbackQuery("settings:quiet", async ctx => { await ctx.answerCallbackQuery(); ctx.session.flow = { kind: "quiet" }; await ctx.reply("Send quiet hours as HH:MM-HH:MM, for example 00:00-08:00."); });
composer.callbackQuery("settings:timezone", async ctx => { await ctx.answerCallbackQuery(); ctx.session.flow = { kind: "timezone" }; await ctx.reply("Send an IANA timezone, for example Europe/London or America/New_York."); });
composer.on("message:text", async (ctx, next) => { const kind = ctx.session.flow?.kind; if (kind === "quiet") { const [start, end] = ctx.message.text.trim().split("-"); if (!validTime(start ?? "") || !validTime(end ?? "")) { await ctx.reply("Use HH:MM-HH:MM, for example 00:00-08:00."); return; } const u = records(ctx); u.quietStart = start; u.quietEnd = end; ctx.session.flow = undefined; await ctx.reply(`Quiet hours are set to ${start}–${end}.`); return; } if (kind === "timezone") { const zone = ctx.message.text.trim(); try { new Intl.DateTimeFormat("en-US", { timeZone: zone }); records(ctx).timezone = zone; ctx.session.flow = undefined; await ctx.reply(`Timezone is set to ${zone}.`); } catch { await ctx.reply("That timezone isn't valid. Try Europe/London or America/New_York."); } return; } return next(); });
export default composer;
