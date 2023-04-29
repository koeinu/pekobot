import { Application } from "./application.js";
import { TelegramBotWrapper } from "./telegramLogger.js.js";

const app = new Application();
const bot = new TelegramBotWrapper();

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (message) => {
  bot.sendLog(message);
  originalConsoleLog(message);
};
console.error = (message) => {
  bot.sendError(message);
  originalConsoleError(message);
};
// const cron = require("./resetCounterCronJob");

// const testInterval = require("./testLimiterCronJob");
