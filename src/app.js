import { Application } from "./application.js";

import dotenv from "dotenv";
import express from "express";
import { createUploadSettingsRoute } from "./model/botSettings.js";

dotenv.config();

const INACTIVE = process.env.INACTIVE;

if (!INACTIVE) {
  const expressApp = express();
  const init = async () => {
    try {
      new Application("jigsaw-bot");
    } catch (e) {
      console.error(`Couldn't initialize discord bots:`, e);
    }
    try {
      expressApp.put("/upload", createUploadSettingsRoute);
      expressApp.put("/uploadCalendars", createUploadSettingsRoute);

      expressApp.listen(3001);
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
