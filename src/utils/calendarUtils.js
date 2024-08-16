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
          return (
            (cacheTimeout !== undefined
              ? Number.parseInt(el.ts) + Number.parseInt(cacheTimeout) <
                currentTs
              : true) &&
            (!el.actualEndTime || !el.parsedDuration)
          );
        })
        .map((el) => el.data.uid)
    );
  }

  // console.error(`IDs to update for ${vtuberHandle}: ${idsToUpdate.join(", ")}`);

  if (idsToUpdate.length > 50) {
    idsToUpdate = idsToUpdate.slice(0, 50);
  }

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
    throw `Calendar ${feedUrl} can't be formed`;
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
