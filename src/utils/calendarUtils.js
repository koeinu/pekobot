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
          // shorts don't have a start timestamp. the do have duration though. and they are short.
          const isExpired =
            el.actualStartTime === undefined && el.parsedDuration !== undefined;
          // if (vtuberHandle === "sui") {
          //   // debugging
          //   console.log(
          //     `id: ${el.data.uid}, timeout: ${cacheTimeout}, ts: ${
          //       el.ts
          //     }, actualStart: ${el.actualStartTime}, actualEnd: ${
          //       el.actualEndTime
          //     }, duration: ${JSON.stringify(
          //       el.parsedDuration
          //     )}, rl: ${rateLimitCheck}, pend: ${isPending}, ex: ${isExpired}`
          //   );
          // }
          return rateLimitCheck && isPending && !isExpired;
        })
        .map((el) => el.data.uid)
    );
  }

  // console.error(
  //   `IDs to update for ${vtuberHandle}: ${idsToUpdate.join(", ")}, ${
  //     idsToUpdate.length
  //   } in total`
  // );

  if (idsToUpdate.length > 30) {
    console.error("(hotfix) trimming ids to perform a partial update");
    idsToUpdate = idsToUpdate.slice(0, 30);
  }

  return getYoutubeLiveDetails(channelId, idsToUpdate)
    .then((items) => {
      // if (channelId === "asmr") {
      //   const filteredItems = items.filter((el) =>
      //     el.channelTitle !== undefined
      //       ? !el.channelTitle.toLowerCase().includes("holostars")
      //       : true
      //   );
      //
      //   console.log(`items length: ${filteredItems.length}/${items.length}`);
      //   return updateCalendarData(channelId, filteredItems);
      // }
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
<pre>${JSON.stringify(calendarData, null, 2)}</pre>
</body>
</html>
`;

    res.writeHead(200, "ok", { "content-type": "text/html" });
    res.end(body);
  };
  return aboutRoute;
};
