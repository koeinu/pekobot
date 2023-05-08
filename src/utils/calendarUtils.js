import dotenv from "dotenv";
import generateIcs from "ics-service/generate-ics.js";
import {
  getYoutubeLiveDetails,
  parseIntoIcsDate,
  parseDurationStringAsObject,
} from "./youtubeUtils.js";
import { getCalendarData, updateCalendarData } from "../model/calendars.js";
import axios from "axios";
import ical from "ical";

dotenv.config();
const ICS_DATA = process.env.ICS_DATA;
const ICS_TIMEOUT = process.env.ICS_TIMEOUT;

const config = {
  headers: {
    "Content-Type": "application/json",
  },
};

export const CALENDAR_METADATA = ICS_DATA
  ? ICS_DATA.split(";").map((el) => {
      const data = el.split(":");
      return {
        handle: data[0],
        id: data[1],
      };
    })
  : [];

export const prepareCalendarDataFromChannelId = async (
  vtuberHandle,
  channelId,
  cacheTimeout
) => {
  const cachedCalendarData = getCalendarData(channelId);
  const idsToUpdate = [];
  if (cachedCalendarData) {
    const currentTs = new Date().getTime();
    idsToUpdate.push(
      ...cachedCalendarData
        .filter(
          (el) =>
            (cacheTimeout !== undefined
              ? el.ts + cacheTimeout < currentTs
              : true) &&
            (!el.actualEndTime || !el.parsedDuration)
        )
        .map((el) => el.data.uid)
    );
  }

  return getYoutubeLiveDetails(channelId, idsToUpdate)
    .then((items) => {
      const toReturn = updateCalendarData(channelId, items);
      console.debug(
        `Update complete for ${vtuberHandle}_${channelId} with update ids [${idsToUpdate}]`
      );
      return toReturn;
    })
    .catch((e) => {
      console.error(`Couldn't get calendar,`, e);
    });
};

export const getCalendar = async (feedUrl, vtuberHandle, channelId) => {
  let data = await prepareCalendarDataFromChannelId(
    vtuberHandle,
    channelId,
    ICS_TIMEOUT
  );
  if (!data) {
    throw `Calendar can't be formed`;
  }
  console.debug(
    `Serving ${data.length} entries for ${vtuberHandle}_${channelId}`
  );
  return generateIcs(
    vtuberHandle,
    data.map((el) => el.data),
    feedUrl
  );
};
