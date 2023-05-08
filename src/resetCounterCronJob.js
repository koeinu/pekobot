import cron from "node-cron";
import { resetCounters } from "./model/counter.js";

cron.schedule("0 0 1 * *", () => {
  resetCounters();
});

export const cronTask = cron;
