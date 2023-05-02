import { Application } from "./application.js";
import {
  originalConsoleError,
  originalConsoleLog,
  originalConsoleWarn,
  TelegramBotWrapper,
} from "./telegramLogger.js";

import cron from "./resetCounterCronJob";

const app = new Application();
const bot = new TelegramBotWrapper();

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
// const testInterval = require("./testLimiterCronJob");
