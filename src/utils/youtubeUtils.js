import axios from "axios";
import dotenv from "dotenv";
import { H_M_S, S_MS } from "./constants.js";

dotenv.config();
const API_KEY = process.env.API_KEY;

const PREDICTED_DURATION = { hours: 2 };

export const parseVideoId = (url) => {
  let regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
  let match = url.match(regExp);
  return match && match.length >= 3 ? match[2] : false;
};

const config = {
  headers: {
    "Content-Type": "application/json",
  },
};

export const getYoutubeLiveDetails = async (channelId) => {
  return await axios
    .get(
      `https://youtube.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`,
      config
    )
    .then((resp) => {
      console.log("data:", resp.data);
      return resp.data.items["0"].contentDetails.relatedPlaylists.uploads;
    })
    .then((uploadsId) => {
      return axios.get(
        `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&key=${API_KEY}`
      );
    })
    .then((resp) => {
      return resp.data.items.map((el) => el.snippet.resourceId.videoId);
    })
    .then((ids) => getYoutubeLiveDetailsByVideoIds(ids));
};

export const getYoutubeLiveDetailsByVideoIds = (ids) => {
  const idString = ids.join(",");
  return axios
    .get(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,contentDetails&id=${idString}&key=${API_KEY}`,
      config
    )
    .then((resp) => {
      const items = resp.data.items;
      return items
        .map((video) => {
          let duration = undefined;
          const lsd = video.liveStreamingDetails;
          const startTime =
            lsd?.actualStartTime ||
            lsd?.scheduledStartTime ||
            video.snippet.publishedAt;
          if (!startTime) {
            return undefined;
          }
          if (video.contentDetails.duration) {
            duration = parseDurationStringAsObject(
              video.contentDetails.duration
            );
          }
          if (!duration && lsd) {
            const endTime =
              lsd.actualEndTime ||
              (lsd.actualStartTime
                ? new Date().getTime() + H_M_S * H_M_S * S_MS
                : undefined);
            const durationDate =
              startTime && endTime
                ? new Date(new Date(endTime) - new Date(startTime))
                : undefined;
            if (durationDate) {
              duration = {
                hours: durationDate.getUTCHours(),
                minutes: durationDate.getUTCMinutes(),
                seconds: durationDate.getUTCSeconds(),
              };
            }
          }

          duration = duration || PREDICTED_DURATION;

          const uid = video.id;
          const url = `https://www.youtube.com/watch?v=${uid}`;
          const title = video.snippet.title;
          const description = `${url}\n\n---Description---\n\n${video.snippet.description}`;
          const start = startTime
            .match(/\d+/g)
            .map((el) => Number.parseInt(el));
          return {
            description,
            duration,
            start,
            title,
            url,
            uid,
          };
        })
        .filter((el) => el !== undefined);
    });
};

export const getYoutubeVideoInfo = async (videoIdOrUrl) => {
  console.log("parsing video url:", videoIdOrUrl);
  const videoId = parseVideoId(videoIdOrUrl) || videoIdOrUrl;
  console.log("video id:", videoId);
  return await axios
    .get(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${videoId}&key=${API_KEY}`,
      config
    )
    .then((resp) => resp.data)
    .then((data) => {
      const items = data.items;
      const video = items[0];
      const snippet = video?.snippet;
      if (snippet) {
        return [
          `${snippet.title}`,
          `${snippet.description.split("\n\n")[0]}`,
        ].join("\n---\n");
      }
      return undefined;
    });
};
export const getYoutubeChannelId = async (videoIdOrUrl) => {
  console.log("parsing video url:", videoIdOrUrl);
  const videoId = parseVideoId(videoIdOrUrl);
  console.log("video id:", videoId);
  return await axios
    .get(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${API_KEY}`,
      config
    )
    .then((resp) => resp.data)
    .then((data) => {
      const items = data.items;
      const video = items[0];
      const toReturn = video?.snippet?.channelId;
      console.log(
        "parsed channel: ",
        video?.snippet.channelTitle,
        "->",
        video?.snippet.title
      );
      return toReturn;
    });
};
const parseDurationString = (durationString) => {
  const { hours, minutes, seconds } =
    parseDurationStringAsObject(durationString);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
};
const parseDurationStringAsObject = (durationString) => {
  let hours = 0,
    minutes = 0,
    seconds = 0;
  const formatRegex = /^PT((\d+)H)?((\d+)M)?((\d+)S)?$/;
  const matches = durationString.match(formatRegex);
  if (!matches) {
    return undefined;
  }

  if (matches[2]) {
    hours = parseInt(matches[2], 10);
  }
  if (matches[4]) {
    minutes = parseInt(matches[4], 10);
  }
  if (matches[6]) {
    seconds = parseInt(matches[6], 10);
  }

  return { hours, minutes, seconds };
};
export const getYoutubeStartTimestamp = async (videoIdOrUrl) => {
  console.log("parsing video url:", videoIdOrUrl);
  const videoId = parseVideoId(videoIdOrUrl);
  console.log("video id:", videoId);
  return await axios
    .get(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${API_KEY}`,
      config
    )
    .then((resp) => resp.data)
    .then((data) => {
      const items = data.items;
      const video = items[0];
      const duration = video?.contentDetails?.duration;
      const publishedAt = video?.snippet?.publishedAt;
      if (duration !== undefined && publishedAt) {
        const durationDate = parseDurationString(duration);
        const publishedDate = new Date(publishedAt);
        const streamStartedAt = new Date(
          publishedDate.getTime() - durationDate
        );
        return streamStartedAt.getTime();
      }
      return undefined;
    });
};
