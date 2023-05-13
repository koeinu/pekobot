import { Application } from "./application.js";
import {
  originalConsoleDebug,
  originalConsoleError,
  originalConsoleLog,
  originalConsoleWarn,
  TelegramBotWrapper,
} from "./telegramLogger.js";
import { cronTask } from "./resetCounterCronJob.js";

import dotenv from "dotenv";
import express from "express";
import aboutRoute from "ics-service/about.js";
import feedRoute from "ics-service/feed.js";
import { CALENDAR_METADATA, getCalendar } from "./utils/calendarUtils.js";

dotenv.config();

const bot = new TelegramBotWrapper();
console.log("Telegram bot started");

console.log = (...args) => {
  originalConsoleLog(...args);
};
console.error = (...args) => {
  bot.sendError(...args);
  originalConsoleError(...args);
};
console.warn = (...args) => {
  bot.sendWarning(...args);
  originalConsoleWarn(...args);
};
console.debug = (...args) => {
  bot.sendDebug(...args);
  originalConsoleDebug(...args);
};
console.error("Logging override complete (a restart happened?)");

const expressApp = express();
const init = async () => {
  try {
    const pekoBot = new Application("peko-bot");
    const mikoBot = new Application("Mikodanye");
  } catch (e) {
    console.error(`Couldn't initialize discord bots:`, e);
  }
  try {
    for (let meta of CALENDAR_METADATA) {
      expressApp.use(
        "/ics/" + meta.handle + "/feed",
        feedRoute(async (feedUrl) => {
          return getCalendar(feedUrl, meta.handle, meta.id);
        })
      );
      expressApp.use(
        "/ics/" + meta.handle,
        aboutRoute(meta.handle, "/ics/" + meta.handle + "/feed")
      );
    }

    expressApp.listen(3000);
  } catch (e) {
    console.error(`Couldn't create calendar:`, e);
  }
};

init().catch((e) => {
  console.error(`Couldn't initialize application:`, e);
});
