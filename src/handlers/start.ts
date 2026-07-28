import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, mainMenuKeyboard } from "../toolkit/index.js";
import { records } from "../crypto.js";

// The /start handler renders the bot's MAIN MENU — the primary way users operate
// a button-first bot. A feature adds its own button by calling
// `registerMainMenuItem(...)` in its own `src/handlers/<slug>.ts`; this handler
// renders whatever is registered (plus a Help button), so you do NOT edit this
// file to add a feature. Send ONE message — no placeholder line above the menu.
const composer = new Composer<Ctx>();

const WELCOME = "CryptoWatch is ready. Choose an action below.";

composer.command("start", async (ctx) => {
  const user = records(ctx);
  if (!user.optInStatus) {
    await ctx.reply("Your quiet hours are set to 00:00–08:00 UTC. Choose whether to receive a morning summary.", {
      reply_markup: inlineKeyboard([[inlineButton("Enable summary", "setup:summary:on"), inlineButton("Skip summary", "setup:summary:off")], [inlineButton("Open menu", "menu:main")]]),
    });
    return;
  }
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery(/^setup:summary:(on|off)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const user = records(ctx); user.optInStatus = ctx.match[1] === "on"; user.metricsConsent = true;
  await ctx.editMessageText(ctx.match[1] === "on" ? "Morning summaries are enabled for 08:15 UTC." : "Morning summaries are off. You can enable them in Settings.", { reply_markup: mainMenuKeyboard() });
});

// "Back to menu" — re-render the main menu in place from any sub-view.
composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
