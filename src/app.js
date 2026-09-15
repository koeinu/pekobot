import { Application } from "./application.js";
import { originalConsoleLog, TelegramBotWrapper } from "./telegramLogger.js";

import dotenv from "dotenv";
import express from "express";
import aboutRoute from "ics-service/about.js";
import feedRoute from "ics-service/feed.js";
import {
  CALENDAR_METADATA,
  createCalendarRoute,
  getCalendar,
} from "./utils/calendarUtils.js";
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
    bot.sendError(...args);
  };
  console.warn = (...args) => {
    if (
      IGNORED_WARNINGS.some((warning) =>
        args.some((arg) => typeof arg === "string" && arg.includes(warning))
      )
    ) {
      return;
    }
    bot.sendWarning(...args);
  };
  console.debug = (...args) => {
    bot.sendDebug(...args);
  };

  console.error("Logging override complete (a restart happened?)");

  const expressApp = express();
  const init = async () => {
    try {
      // commented out for develop
      // const pekoBot = new Application("peko-bot");
      // const mikoBot = new Application("Mikodanye");

      const pekoBot2026 = new Application("peko-bot2026");
      const mikoBot2026 = new Application("Mikodanye2026");

      // for develop only
      // const developBot = new Application("developer-bot");
    } catch (e) {
      console.error(`Couldn't initialize discord bots:`, e);
    }
    try {
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
      expressApp.use("/cal", createCalendarRoute());
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
