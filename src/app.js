import dotenv from "dotenv";
import express from "express";
import aboutRoute from "ics-service/about.js";
import feedRoute from "ics-service/feed.js";
import {
  CALENDAR_METADATA,
  createCalendarRoute,
  getCalendar,
} from "./utils/calendarUtils.js";
dotenv.config();

const INACTIVE = process.env.INACTIVE;

const IGNORED_WARNINGS = [
  "ExperimentalWarning: buffer.Blob is an experimental feature",
  "The Fetch API is an experimental feature",
];

if (!INACTIVE) {
  const expressApp = express();
  const init = async () => {
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

      expressApp.listen(8166);
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
