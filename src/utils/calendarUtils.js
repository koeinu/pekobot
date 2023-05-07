import dotenv from "dotenv";
import generateIcs from "ics-service/generate-ics.js";
import { getYoutubeLiveDetails } from "./youtubeUtils.js";
import { getCalendarData, updateCalendarData } from "../model/calendars.js";

dotenv.config();
const ICS_DATA = process.env.ICS_DATA;
const ICS_TIMEOUT = process.env.ICS_TIMEOUT;
const ICS_TIMEOUT_2 = process.env.ICS_TIMEOUT_2;

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
  cacheTimeout,
  cacheAbsoluteTimeout
) => {
  const cachedCalendarData = getCalendarData(channelId);
  const idsToUpdate = [];
  if (cachedCalendarData) {
    console.debug(`Cached calendar found for ${vtuberHandle}_${channelId}`);

    const currentTs = new Date().getTime();
    idsToUpdate.push(
      ...cachedCalendarData
        .filter(
          (el) =>
            (cacheTimeout !== undefined
              ? el.ts + cacheTimeout < currentTs
              : true) &&
            (cacheAbsoluteTimeout !== undefined
              ? el.ts + cacheAbsoluteTimeout > currentTs
              : true)
        )
        .map((el) => el.data.uid)
    );
  }

  if (channelId === "custom" && idsToUpdate.length === 0) {
    return [];
  }

  return getYoutubeLiveDetails(channelId, idsToUpdate)
    .then((items) => {
      const toReturn = updateCalendarData(channelId, items);
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
    ICS_TIMEOUT,
    ICS_TIMEOUT_2
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
