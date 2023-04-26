const cron = require("node-cron");
const { resetCounters } = require("./model/counter");

cron.schedule("0 0 1 * *", () => {
  resetCounters();
});

module.exports = {};
