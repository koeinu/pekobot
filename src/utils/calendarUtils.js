import axios from "axios";
import dotenv from "dotenv";
import generateIcs from "ics-service/generate-ics.js";
import { getYoutubeLiveDetails } from "./youtubeUtils.js";

export const CALENDAR_TITLE = "Custom Hololive Feed";

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

export const getYoutubeChannelId = async (vtuberHandle, channelId) => {
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  return await axios
    .get(
      `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&eventType=upcoming&type=video&key=${API_KEY}&maxResults=50`,
      config
    )
    .then((resp) => resp.data)
    .then((data) => {
      const promises = data.items.map((el) =>
        getYoutubeLiveDetails(vtuberHandle, el.id.videoId)
      );
      return Promise.all(promises);
    });
};

export const getCalendar = async (feedUrl, vtuberHandle, channelId) => {
  console.error(
    `Calendar requested! ${feedUrl}, ${vtuberHandle}, ${channelId}`
  );
  let data = await getYoutubeChannelId(vtuberHandle, channelId);
  return generateIcs(vtuberHandle, data, feedUrl);
};
