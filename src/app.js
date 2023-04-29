import { Application } from "./application.js";
import { TelegramBotWrapper } from "./telegramLogger.js";

const app = new Application();
const bot = new TelegramBotWrapper();

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  bot.sendLog(...args);
  originalConsoleLog(...args);
};
console.error = (...args) => {
  bot.sendError(...args);
  originalConsoleError(...args);
};
// const cron = require("./resetCounterCronJob");

// const testInterval = require("./testLimiterCronJob");
