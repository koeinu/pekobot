import { Application } from "./application.js";
import {
  originalConsoleError,
  originalConsoleWarn,
  TelegramBotWrapper,
} from "./telegramLogger.js";

const app = new Application();
const bot = new TelegramBotWrapper();
function printObject(...obj) {
  let output = "";
  for (let i = 0; i < obj.length; i++) {
    for (let key in obj[i]) {
      if (typeof obj[i][key] === "object") {
        output += key + ": { ";
        for (let innerKey in obj[i][key]) {
          output +=
            innerKey +
            ": " +
            String(obj[i][key][innerKey]).replace(/\n/g, "\\n") +
            ", ";
        }
        output = output.slice(0, -2);
        output += " }\n";
      } else {
        output += key + ": " + String(obj[i][key]).replace(/\n/g, "\\n") + "\n";
      }
    }
  }
  return output;
}
// console.log = (...args) => {
//   bot.sendLog(...args);
//   originalConsoleLog(...args);
// };
console.error = (...args) => {
  bot.sendError(printObject(...args));
  originalConsoleError(printObject(...args));
};
console.warn = (...args) => {
  bot.sendWarning(printObject(...args));
  originalConsoleWarn(printObject(...args));
};
// const cron = require("./resetCounterCronJob");

// const testInterval = require("./testLimiterCronJob");
