import axios from "axios";
import dotenv from "dotenv";
import generateIcs from "ics-service/generate-ics.js";
import { getYoutubeLiveDetails } from "./youtubeUtils.js";

export const CALENDAR_TITLE = "Custom Hololive Feed";

dotenv.config();
const API_KEY = process.env.API_KEY;

export const channelId = "UC6eWCld0KwmyHFbAqK3V-Rw";

export const getYoutubeChannelId = async (channelId) => {
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
        getYoutubeLiveDetails("Koyo", el.id.videoId)
      );
      return Promise.all(promises);
    });
};

export const getCalendar = async (feedUrl) => {
  let data = await getYoutubeChannelId(channelId);
  return generateIcs(TITLE, data, feedUrl);
};
