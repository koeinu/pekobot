import { loadFile, saveFile } from "../utils/fileUtils.js";

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

export const saveCalendarData = (channelId, calendarData) => {
  const calendars = loadCalendarData(JSON_FILE_NAME);
  if (!Object.keys(calendars).includes(channelId)) {
    calendars[channelId] = calendarData.map((el) => {
      return {
        ts: new Date().getTime(),
        channelId,
        data: el,
      };
    });
  }
  saveFile(JSON_FILE_NAME, calendars);
  return calendars[channelId];
};

export const updateCalendarData = (channelId, updatedEntries) => {
  const calendars = loadCalendarData(JSON_FILE_NAME);
  if (!Object.keys(calendars).includes(channelId)) {
    return saveCalendarData(channelId, updatedEntries);
  } else {
    const toUpdateEntries = calendars[channelId];
    for (let entry of updatedEntries) {
      const toUpdateEntry = toUpdateEntries.find(
        (el) => el.data.uid === entry.uid
      );
      if (toUpdateEntry) {
        toUpdateEntry.ts = new Date().getTime();
        toUpdateEntry.data = entry;
      } else {
        calendars[channelId].push({
          ts: new Date().getTime(),
          channelId,
          data: entry,
        });
      }
    }
  }
  saveFile(JSON_FILE_NAME, calendars);
  // console.debug(`Successfully updated entries in`, channelId);
  return calendars[channelId];
};

export const getCalendarData = (channelId) => {
  const calendars = loadCalendarData(JSON_FILE_NAME);
  return calendars[channelId];
};
