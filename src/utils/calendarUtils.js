import axios from "axios";
import dotenv from "dotenv";
import generateIcs from "ics-service/generate-ics.js";
import { getYoutubeLiveDetails } from "./youtubeUtils.js";
import { H_M_S, S_MS } from "./constants.js";

dotenv.config();
const API_KEY = process.env.API_KEY;
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
    logFunction()(`Cached channel info: ${vtuberHandle}, ${channelId}`);
    return channelCache[channelId];
  }
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  return await axios
    .get(
      `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&eventType=upcoming&type=video&key=${API_KEY}`,
      config
    )
    .then((resp) => {
      setRateLimited(false);
      const promises = resp.data.items.map((el) =>
        getYoutubeLiveDetails(vtuberHandle, el.id.videoId)
      );
      channelCache[channelId] = Promise.all(promises);
      logFunction()(
        `Obtaining and caching channel info: ${vtuberHandle}, ${channelId}`
      );
      setTimeout(() => {
        logFunction()(
          `Cleaning cache channel info: ${vtuberHandle}, ${channelId}`
        );
        channelCache[channelId] = undefined;
      }, CACHE_TIMEOUT);
      return channelCache[channelId];
    })
    .catch((e) => {
      console.log("status is 403:", e?.status === 403);
      setRateLimited(true);
      errorFunction()(`Couldn't get calendar: `, e);
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
