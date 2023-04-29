import { Application } from "./application.js";
import {
  originalConsoleError,
  originalConsoleLog,
  originalConsoleWarn,
  TelegramBotWrapper,
} from "./telegramLogger.js";

const app = new Application();
const bot = new TelegramBotWrapper();

console.log = (...args) => {
  bot.sendLog(...args);
  originalConsoleLog(args.map((arg) => JSON.stringify(arg, null, 4)));
};
console.error = (...args) => {
  bot.sendError(args.map((arg) => JSON.stringify(arg, null, 4)));
  originalConsoleError(args.map((arg) => JSON.stringify(arg, null, 4)));
};
console.warn = (...args) => {
  bot.sendWarning(args.map((arg) => JSON.stringify(arg, null, 4)));
  originalConsoleWarn(args.map((arg) => JSON.stringify(arg, null, 4)));
};
// const cron = require("./resetCounterCronJob");

// const testInterval = require("./testLimiterCronJob");
