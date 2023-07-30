import axios from "axios";
import dotenv from "dotenv";
import { H_M_S, S_MS } from "./constants.js";
import ical from "ical";

dotenv.config();
const API_KEY = process.env.API_KEY;
const ASMR_CHANNELS = process.env.ASMR_CHANNELS
  ? process.env.ASMR_CHANNELS.split(";")
  : [];

const PREDICTED_DURATION = { hours: 2 };

export const parseVideoId = (url) => {
  // noinspection RegExpRedundantEscape
  // eslint-disable-next-line no-useless-escape
  let regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
  let match = url.match(regExp);
  return match && match.length >= 3 ? match[2] : false;
};

const config = {
  headers: {
    "Content-Type": "application/json",
  },
};

const getChannelVideoIds = async (channelId, filterKeyword = undefined) => {
  return axios
    .get(
      `https://youtube.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`,
      config
    )
    .then((resp) => {
      return resp.data.items["0"].contentDetails.relatedPlaylists.uploads;
    })
    .then((uploadsId) => {
      return axios.get(
        `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&key=${API_KEY}`
      );
    })
    .then((resp) => {
      return resp.data.items
        .filter(
          (el) =>
            !filterKeyword ||
            el.snippet.title.toLowerCase().includes(filterKeyword)
        )
        .map((el) => el.snippet.resourceId.videoId);
    });
};

export const getYoutubeLiveDetails = async (channelId, additionalIds) => {
  if (channelId === "custom") {
    return getYoutubeLiveDetailsByVideoIds(additionalIds);
  }
  if (channelId === "asmr") {
    const knownAsmrIds = (
      await Promise.all(
        ASMR_CHANNELS.map(async (el) => await getChannelVideoIds(el, "asmr"))
      )
    ).flat();
    return await axios
      .get("https://sarisia.cc/holodule-ics/holodule-all.ics", config)
      .then((resp) => {
        const cal = resp.data;
        const data = ical.parseICS(cal);
        const ids = Object.values(data)
          .filter((calendarData) => {
            return (
              calendarData.summary &&
              calendarData.summary.toLowerCase().includes(channelId)
            );
          })
          .map((calendarData) => {
            return calendarData.uid;
          });
        return getYoutubeLiveDetailsByVideoIds([
          ...new Set([...ids, ...additionalIds, ...knownAsmrIds]),
        ]);
      });
  }
  return await getChannelVideoIds(channelId).then((ids) =>
    getYoutubeLiveDetailsByVideoIds([...new Set([...ids, ...additionalIds])])
  );
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
          let parsedDuration = undefined;
          const lsd = video.liveStreamingDetails;
          const startTime =
            lsd?.actualStartTime ||
            lsd?.scheduledStartTime ||
            video.snippet.publishedAt;
          if (!startTime) {
            return undefined;
          }
          if (video.contentDetails.duration) {
            parsedDuration = parseDurationStringAsObject(
              video.contentDetails.duration
            );
          }
          if (!parsedDuration && lsd) {
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
              parsedDuration = {
                hours: durationDate.getUTCHours(),
                minutes: durationDate.getUTCMinutes(),
                seconds: durationDate.getUTCSeconds(),
              };
            }
          }

          const duration = parsedDuration || PREDICTED_DURATION;

          const uid = video.id;
          const url = `https://www.youtube.com/watch?v=${uid}`;
          const title = video.snippet.title;
          const description = `${url}\n\n---Description---\n\n${video.snippet.description}`;
          const start = startTime
            .match(/\d+/g)
            .map((el) => Number.parseInt(el));
          return {
            actualEndTime: lsd?.actualEndTime,
            isLive: lsd !== undefined,
            parsedDuration,
            calendarData: {
              description,
              duration,
              start,
              title,
              url,
              uid,
            },
          };
        })
        .filter((el) => el !== undefined);
    });
};

export const getYoutubeVideoInfo = async (videoIdOrUrl, isTranslating) => {
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
        if (isTranslating) {
          return [
            "---Video Title---",
            `${snippet.title}`,
            "---Video Description---",
            `${snippet.description.split("\n\n")[0]}`,
          ].join("\n");
        } else {
          return [
            `{Video title:} '${snippet.title}'.`,
            `{Video description:} '${snippet.description.split("\n\n")[0]}'.`,
          ].join("\n");
        }
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
export const parseIntoIcsDate = (dateObj) => {
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth() + 1;
  const day = dateObj.getUTCDate();
  const hours = dateObj.getUTCHours();
  const minutes = dateObj.getUTCMinutes();
  const seconds = dateObj.getUTCSeconds();

  return [year, month, day, hours, minutes, seconds];
};
export const parseDurationStringAsObject = (durationString) => {
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
