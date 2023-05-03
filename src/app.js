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
  // const testInterval = require("./testLimiterCronJob");
} else {
  console.log("Inactive mode.");
}
