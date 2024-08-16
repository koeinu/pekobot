import dotenv from "dotenv";
import generateIcs from "ics-service/generate-ics.js";
import { getYoutubeLiveDetails } from "./youtubeUtils.js";
import {
  getAllCalendarData,
  getCalendarData,
  updateCalendarData,
} from "../model/calendars.js";

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
  let idsToUpdate = [];
  if (cachedCalendarData) {
    const currentTs = new Date().getTime();
    idsToUpdate.push(
      ...cachedCalendarData
        .filter((el) => {
          const rateLimitCheck =
            cacheTimeout !== undefined
              ? Number.parseInt(el.ts) + Number.parseInt(cacheTimeout) <
                currentTs // не обновляемся чаще чем раз в 15 минут
              : true;
          const isPending = !el.actualEndTime || !el.parsedDuration;
          const isNotExpired = el.actualStartTime
            ? el.actualStartTime + 1000 * 60 * 60 * 24 * 7 > currentTs
            : true;
          if (vtuberHandle === "sui") {
            // debugging
            console.log(
              `id: ${el.data.uid}, timeout: ${cacheTimeout}, ts: ${
                el.ts
              }, actualStart: ${el.actualStartTime}, actualEnd: ${
                el.actualEndTime
              }, duration: ${JSON.stringify(
                el.parsedDuration
              )}, rl: ${rateLimitCheck}, pend: ${isPending}, ex: ${isNotExpired}`
            );
          }
          return rateLimitCheck && isPending && isNotExpired;
        })
        .map((el) => el.data.uid)
    );
  }

  console.error(`IDs to update for ${vtuberHandle}: ${idsToUpdate.join(", ")}`);

  return getYoutubeLiveDetails(channelId, idsToUpdate)
    .then((items) => {
      return updateCalendarData(channelId, items);
    })
    .catch((e) => {
      console.error(`Couldn't get calendar ${vtuberHandle},`, e);
    });
};

export const getCalendar = async (feedUrl, vtuberHandle, channelId) => {
  let data = await prepareCalendarDataFromChannelId(
    vtuberHandle,
    channelId,
    ICS_TIMEOUT
  );
  if (!data) {
    throw `Calendar ${vtuberHandle} can't be formed`;
  }
  // console.log(
  //   `Serving ${data.length} entries for ${vtuberHandle}_${channelId}`
  // );
  return generateIcs(
    vtuberHandle,
    data.map((el) => el.data),
    feedUrl
  );
};

export const createCalendarRoute = () => {
  const calendarData = getAllCalendarData();
  const aboutRoute = (req, res) => {
    const body = `
<!DOCTYPE html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
${JSON.stringify(calendarData)}
</body>
</html>
`;

    res.writeHead(200, "ok", { "content-type": "text/html" });
    res.end(body);
  };
  return aboutRoute;
};
