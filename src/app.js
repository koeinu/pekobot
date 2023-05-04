import { Application } from "./application.js";
import {
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
const inactive = process.env.INACTIVE;

if (!inactive) {
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
  console.log("Logging override complete");

  const app = new Application();

  const expressApp = express();
  const init = async () => {
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
  };

  init().catch((e) => {
    console.error(`Couldn't create calendar:`, e);
  });

  // const testInterval = require("./testLimiterCronJob");
} else {
  console.log("Inactive mode.");
}
