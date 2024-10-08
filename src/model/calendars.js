import { formFilePath, loadFile, saveFile } from "../utils/fileUtils.js";
import fs from "node:fs";
import { sleep } from "../utils/discordUtils.js";
import { S_MS } from "../utils/constants.js";

const JSON_FILE_NAME = "calendars.json";
const INITIAL_FILE = {};

// throws IO error
const loadCalendarData = (fileName) => {
  const calendarData = loadFile(fileName);
  if (!calendarData) {
    console.log(`No calendars file ${fileName}, creating a new one`);
    initializeCalendarData(fileName);
    return INITIAL_FILE;
  }
  return calendarData;
};

// throws IO error
const initializeCalendarData = (jsonFileName) => {
  saveFile(jsonFileName, INITIAL_FILE);
};

// adds new entries, updates the existing ones
export const updateCalendarData = (channelId, updatedEntries) => {
  const calendars = loadCalendarData(JSON_FILE_NAME);
  if (!Object.keys(calendars).includes(channelId)) {
    calendars[channelId] = [];
  }
  const toUpdateEntries = calendars[channelId];
  for (let entry of updatedEntries) {
    const toUpdateEntry = toUpdateEntries.find(
      (el) => el.data.uid === entry.calendarData.uid
    );
    if (entry.calendarData.channelTitle !== undefined) {
      delete entry.calendarData.channelTitle;
    }
    if (toUpdateEntry) {
      toUpdateEntry.ts = new Date().getTime();
      toUpdateEntry.channelTitle = entry.channelTitle;
      toUpdateEntry.actualEndTime = entry.actualEndTime;
      toUpdateEntry.parsedDuration = entry.parsedDuration;
      toUpdateEntry.data = entry.calendarData;
    } else {
      calendars[channelId].push({
        ts: new Date().getTime(),
        channelId,
        channelTitle: entry.channelTitle,
        parsedDuration: entry.parsedDuration,
        actualEndTime: entry.actualEndTime,
        data: entry.calendarData,
      });
    }
  }
  saveFile(JSON_FILE_NAME, calendars);
  return calendars[channelId];
};

export const deleteCalendarData = (channelId, idsToDelete) => {
  const calendars = loadCalendarData(JSON_FILE_NAME);
  let result = false;
  if (!Object.keys(calendars).includes(channelId)) {
    return result;
  } else {
    const entries = calendars[channelId];
    for (let id of idsToDelete) {
      const foundEntry = entries.find((el) => el.data.uid === id);
      if (foundEntry) {
        const entryIndex = entries.indexOf(foundEntry);
        entries.splice(entryIndex, 1);
        result = true;
      }
    }
  }
  saveFile(JSON_FILE_NAME, calendars);
  return result;
};

export const getCalendarData = (channelId) => {
  const calendars = loadCalendarData(JSON_FILE_NAME);
  return calendars[channelId];
};
export const getAllCalendarData = () => {
  return loadCalendarData(JSON_FILE_NAME);
};

export const createUploadCalendarsRoute = (req, res, next) => {
  console.log(
    "Now uploading calendars",
    req.url,
    ": ",
    req.get("content-length"),
    "bytes"
  );
  req.pipe(fs.createWriteStream(formFilePath(JSON_FILE_NAME)));
  req.on("end", async () => {
    // Done reading!
    res.sendStatus(200);
    console.log("Uploaded!");
    next();

    await sleep(() => {}, S_MS);
    process.exit();
  });
};
