import { Application } from "./application.js";
import {
  originalConsoleError,
  originalConsoleLog,
  originalConsoleWarn,
  TelegramBotWrapper,
} from "./telegramLogger.js";
import { cronTask } from "./resetCounterCronJob.js";

import dotenv from "dotenv";
dotenv.config();
const inactive = process.env.INACTIVE;

if (!inactive) {
  console.log("Cron task started:", cronTask);

  const app = new Application();
  console.log("Application started:", app);
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
  // const testInterval = require("./testLimiterCronJob");
} else {
  console.log("Inactive mode.");
}
