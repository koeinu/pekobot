import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const API_KEY = process.env.API_KEY;

export const parseVideoId = (url) => {
  let regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
  let match = url.match(regExp);
  return match && match.length >= 3 ? match[2] : false;
};
export const getYoutubeLiveDetails = async (vtuberName, videoIdOrUrl) => {
  const videoId = parseVideoId(videoIdOrUrl) || videoIdOrUrl;
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  return await axios
    .get(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${API_KEY}`,
      config
    )
    .then((resp) => resp.data)
    .then((data) => {
      const items = data.items;
      const video = items[0];
      return {
        description: `${video.snippet.title}\nhttps://www.youtube.com/watch?v=${video.id}`,
        duration: { hours: 2 },
        start: video.liveStreamingDetails.scheduledStartTime
          .match(/\d+/g)
          .map((el) => Number.parseInt(el)),
        title: `${vtuberName}: ${video.snippet.title}`,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        uid: video.id,
      };
    });
};
export const getYoutubeVideoInfo = async (videoIdOrUrl) => {
  console.log("parsing video url:", videoIdOrUrl);
  const videoId = parseVideoId(videoIdOrUrl) || videoIdOrUrl;
  console.log("video id:", videoId);
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };
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
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };
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
  let hours = 0,
    minutes = 0,
    seconds = 0;
  const formatRegex = /^PT((\d+)H)?((\d+)M)?((\d+)S)?$/;
  const matches = durationString.match(formatRegex);

  if (matches[2]) {
    hours = parseInt(matches[2], 10);
  }
  if (matches[4]) {
    minutes = parseInt(matches[4], 10);
  }
  if (matches[6]) {
    seconds = parseInt(matches[6], 10);
  }

  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
};
export const getYoutubeStartTimestamp = async (videoIdOrUrl) => {
  console.log("parsing video url:", videoIdOrUrl);
  const videoId = parseVideoId(videoIdOrUrl);
  console.log("video id:", videoId);
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };
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
