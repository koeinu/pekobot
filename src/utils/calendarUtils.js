import dotenv from "dotenv";
import generateIcs from "ics-service/generate-ics.js";
import { getYoutubeLiveDetails } from "./youtubeUtils.js";
import { getCalendarData, updateCalendarData } from "../model/calendars.js";

dotenv.config();
const ICS_DATA = process.env.ICS_DATA;
const ICS_TIMEOUT = process.env.ICS_TIMEOUT;

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
  cacheTimeout
) => {
  const cachedCalendarData = getCalendarData(channelId);
  const idsToUpdate = [];
  if (cachedCalendarData) {
    const currentTs = new Date().getTime();
    idsToUpdate.push(
      ...cachedCalendarData
        .filter((el) => {
          const result =
            (cacheTimeout !== undefined
              ? Number.parseInt(el.ts) + Number.parseInt(cacheTimeout) <
                currentTs
              : true) &&
            (!el.actualEndTime || !el.parsedDuration);
          console.log(
            `${el.data.title}: ${
              Number.parseInt(el.ts) + Number.parseInt(cacheTimeout)
            } < ${currentTs}, ${el.actualEndTime}, ${
              el.parsedDuration
            }: ${result}`
          );
          return result;
        })
        .map((el) => el.data.uid)
    );
  }

  console.log(`IDs to update: ${idsToUpdate.join(", ")}`);

  return getYoutubeLiveDetails(channelId, idsToUpdate)
    .then((items) => {
      return updateCalendarData(channelId, items);
    })
    .catch((e) => {
      console.error(`Couldn't get calendar,`, e);
    });
};

export const getCalendar = async (feedUrl, vtuberHandle, channelId) => {
  let data = await prepareCalendarDataFromChannelId(
    vtuberHandle,
    channelId,
    ICS_TIMEOUT
  );
  if (!data) {
    throw `Calendar can't be formed`;
  }
  console.debug(
    `Serving [${data
      .map((el) =>
        [el.data.title, JSON.stringify(el.data.duration)].join(" | ")
      )
      .join(", ")}] entries for ${vtuberHandle}_${channelId}`
  );
  return generateIcs(
    vtuberHandle,
    data.map((el) => el.data),
    feedUrl
  );
};
