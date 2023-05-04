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
      `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&type=video&key=${API_KEY}&order=date`,
      config
    )
    .then((resp) => {
      setRateLimited(false);
      const items = resp.data.items;
      if (items.length > 0) {
        const data = getYoutubeLiveDetails(
          vtuberHandle,
          resp.data.items.map((el) => el.id.videoId).join(",")
        );
        channelCache[channelId] = Promise.resolve(data);
      } else {
        channelCache[channelId] = Promise.resolve([]);
      }
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
      console.log(e);
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
