import cron from "node-cron";

import { resetCounters } from "./model/counter";

cron.schedule("0 0 1 * *", () => {
  resetCounters();
});

module.exports = {};
