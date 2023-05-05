import dotenv from "dotenv";
import generateIcs from "ics-service/generate-ics.js";
import { getYoutubeLiveDetails } from "./youtubeUtils.js";
import { H_M_S, S_MS } from "./constants.js";

dotenv.config();
const ICS_DATA = process.env.ICS_DATA;

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
let rateLimited = false;

export const setRateLimited = (value) => {
  rateLimited = value;
};

export const logFunction = () => (rateLimited ? console.error : console.debug);
export const errorFunction = () =>
  rateLimited ? console.debug : console.error;

export const prepareCalendarDataFromChannelId = async (
  vtuberHandle,
  channelId
) => {
  if (channelCache[channelId]) {
    logFunction()(`Serving cached data for ${vtuberHandle}_${channelId}`);
    return channelCache[channelId];
  }
  return getYoutubeLiveDetails(channelId)
    .then((resp) => {
      setRateLimited(false);
      channelCache[channelId] = resp.data.items;
      logFunction()(
        `Successfully updated and cached stream data for ${vtuberHandle}_${channelId}`
      );
      setTimeout(() => {
        logFunction()(`Cleaning cache for ${vtuberHandle}_${channelId}`);
        channelCache[channelId] = undefined;
      }, CACHE_TIMEOUT);
      return channelCache[channelId];
    })
    .catch((e) => {
      console.log(e);
      setRateLimited(true);
      errorFunction()(`Couldn't get calendar,`, e);
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
