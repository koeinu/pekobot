import dotenv from "dotenv";
import generateIcs from "ics-service/generate-ics.js";
import {
  getYoutubeLiveDetails,
  getYoutubeLiveDetailsByVideoIds,
} from "./youtubeUtils.js";
import {
  getCalendarData,
  saveCalendarData,
  updateCalendarData,
} from "../model/calendars.js";

dotenv.config();
const ICS_DATA = process.env.ICS_DATA;
const ICS_TIMEOUT = process.env.ICS_TIMEOUT;

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
  if (cachedCalendarData) {
    console.debug(`Cached calendar found for ${vtuberHandle}_${channelId}`);

    if (cacheTimeout === undefined) {
      return cachedCalendarData;
    }

    const currentTs = new Date().getTime();
    const timedOutIds = cachedCalendarData
      .filter((el) => el.ts + cacheTimeout < currentTs)
      .map((el) => el.data.uid);
    if (timedOutIds.length > 0) {
      console.debug(
        `Outdated ids for ${vtuberHandle}_${channelId}:`,
        timedOutIds.join(", ")
      );
      const updatedData = await getYoutubeLiveDetailsByVideoIds(timedOutIds);
      return updateCalendarData(channelId, updatedData);
    }

    return cachedCalendarData;
  }

  if (channelId === "custom") {
    return [];
  }

  return getYoutubeLiveDetails(channelId)
    .then((items) => {
      const toReturn = saveCalendarData(channelId, items);
      console.debug(
        `Successfully updated and cached stream data for ${vtuberHandle}_${channelId}`
      );
      return toReturn;
    })
    .catch((e) => {
      console.error(`Couldn't get calendar,`, e);
    });
};

export const getCalendar = async (feedUrl, vtuberHandle, channelId) => {
  console.debug(
    `Calendar requested! ${feedUrl}, ${vtuberHandle}, ${channelId}`
  );
  let data = await prepareCalendarDataFromChannelId(
    vtuberHandle,
    channelId,
    ICS_TIMEOUT
  );
  if (!data) {
    throw `Calendar can't be formed`;
  }
  return generateIcs(
    vtuberHandle,
    data.map((el) => el.data),
    feedUrl
  );
};
