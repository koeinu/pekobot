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
import feedRoute from "ics-service/feed.js";
import aboutRoute from "ics-service/about.js";
import { CALENDAR_TITLE, getCalendar } from "./utils/calendarUtils.js";
dotenv.config();
const inactive = process.env.INACTIVE;

if (!inactive) {
  console.log("Cron tasks started:", cronTask.getTasks().entries());
  const bot = new TelegramBotWrapper();
  console.log("Bot started:", bot);

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
    expressApp.use("/feed", feedRoute(getCalendar));
    expressApp.use("/", aboutRoute(CALENDAR_TITLE));
    expressApp.listen(3000);
  };

  init().catch((e) => {
    console.error(`Couldn't create calendar:`, e);
  });

  // const testInterval = require("./testLimiterCronJob");
} else {
  console.log("Inactive mode.");
}
