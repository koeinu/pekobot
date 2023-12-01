import { Application } from "./application.js";
import {
  originalConsoleDebug,
  originalConsoleError,
  originalConsoleLog,
  originalConsoleWarn,
  TelegramBotWrapper,
} from "./telegramLogger.js";

import dotenv from "dotenv";
import express from "express";
import { createUploadSettingsRoute } from "./model/botSettings.js";

dotenv.config();

const INACTIVE = process.env.INACTIVE;

const IGNORED_WARNINGS = [
  "ExperimentalWarning: buffer.Blob is an experimental feature",
  "The Fetch API is an experimental feature",
];

if (!INACTIVE) {
  const bot = new TelegramBotWrapper();
  console.log("Telegram bot started");

  console.log = (...args) => {
    // writeLog(...args);
    originalConsoleLog(...args);
  };
  console.error = (...args) => {
    if (
      IGNORED_WARNINGS.some((warning) =>
        args.some((arg) => typeof arg === "string" && arg.includes(warning))
      )
    ) {
      return;
    }
    // writeError(...args);
    bot.sendError(...args);
    originalConsoleError(...args);
  };
  console.warn = (...args) => {
    if (
      IGNORED_WARNINGS.some((warning) =>
        args.some((arg) => typeof arg === "string" && arg.includes(warning))
      )
    ) {
      return;
    }
    // writeWarning(...args);
    bot.sendWarning(...args);
    originalConsoleWarn(...args);
  };
  console.debug = (...args) => {
    // writeDebug(...args);
    bot.sendDebug(...args);
    originalConsoleDebug(...args);
  };
  console.error("Logging override complete (a restart happened?)");

  const expressApp = express();
  const init = async () => {
    try {
      const bot = new Application("jigsaw-bot");
    } catch (e) {
      console.error(`Couldn't initialize discord bots:`, e);
    }
    try {
      expressApp.put("/upload", createUploadSettingsRoute);
      expressApp.put("/uploadCalendars", createUploadSettingsRoute);

      expressApp.listen(3000);
    } catch (e) {
      console.error(`Couldn't create calendar:`, e);
    }
  };

  init().catch((e) => {
    console.error(`Couldn't initialize application:`, e);
  });
} else {
  console.log("Inactive mode");
}
