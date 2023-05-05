import dotenv from "dotenv";
import generateIcs from "ics-service/generate-ics.js";
import { getYoutubeLiveDetails } from "./youtubeUtils.js";
import { H_M_S, S_MS } from "./constants.js";

dotenv.config();
const ICS_DATA = process.env.ICS_DATA;
const ICS_CACHE = process.env.ICS_CACHE;

export const CALENDAR_METADATA = ICS_DATA
  ? ICS_DATA.split(";").map((el) => {
      const data = el.split(":");
      return {
        handle: data[0],
        id: data[1],
      };
    })
  : [];

const CACHE_TIMEOUT = H_M_S * H_M_S * S_MS;
const channelCache = {};

export const prepareCalendarDataFromChannelId = async (
  vtuberHandle,
  channelId
) => {
  if (ICS_CACHE && channelCache[channelId]) {
    console.debug(`Serving cached data for ${vtuberHandle}_${channelId}`);
    return channelCache[channelId];
  }
  return getYoutubeLiveDetails(channelId)
    .then((items) => {
      if (ICS_CACHE) {
        console.debug(
          `Successfully updated and cached stream data for ${vtuberHandle}_${channelId}`
        );
        channelCache[channelId] = items;
        setTimeout(() => {
          console.debug(`Cleaning cache for ${vtuberHandle}_${channelId}`);
          channelCache[channelId] = undefined;
        }, CACHE_TIMEOUT);
      } else {
        console.debug(
          `Successfully updated and cached stream data for ${vtuberHandle}_${channelId}`
        );
      }
      return items;
    })
    .catch((e) => {
      console.error(`Couldn't get calendar,`, e);
    });
};

export const getCalendar = async (feedUrl, vtuberHandle, channelId) => {
  console.debug(
    `Calendar requested! ${feedUrl}, ${vtuberHandle}, ${channelId}`
  );
  let data = await prepareCalendarDataFromChannelId(vtuberHandle, channelId);
  if (!data) {
    throw `Calendar can't be formed`;
  }
  return generateIcs(vtuberHandle, data, feedUrl);
};
