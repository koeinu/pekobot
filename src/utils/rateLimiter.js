import { formatMSToHMS, getMsgInfo } from "./stringUtils.js";

export const AlertUserMode = { Silent: 0, Normal: 1, Emote: 2 };
export class CustomRateLimiter {
  constructor(
    commandName,
    amount,
    interval,
    ignoreRoles,
    ignoreChannels,
    alertUser
  ) {
    this.ignoreRoles = ignoreRoles;
    this.ignoreChannels = ignoreChannels;
    this.commandName = commandName;
    this.interval = interval;
    this.amount = amount;
    this.entities = {};
    this.alertUser = alertUser;
  }

  take(entityId, doIncrease = true) {
    if (this.entities[entityId] === undefined) {
      if (doIncrease) {
        this.entities[entityId] = { count: 1, ts: new Date().getTime() };
        // console.debug(
        //   `rate start for ${this.commandName}, entityId: ${entityId}, cd ${this.interval}`
        // );
        setTimeout(() => {
          this.entities[entityId] = undefined;
        }, this.interval);
      }
      return { result: false };
    } else {
      if (this.entities[entityId].count === this.amount) {
        const cooldown =
          this.entities[entityId].ts + this.interval - new Date().getTime();
        console.debug(
          `rate hit for ${this.commandName}, entityId: ${entityId}, cd ${cooldown}`
        );
        return {
          result: true,
          ts: cooldown,
        };
      } else {
        if (doIncrease) {
          this.entities[entityId].count += 1;
        }
        return { result: false };
      }
    }
  }

  reset(entityId) {
    if (this.entities[entityId] !== undefined) {
      this.entities[entityId].count = 0;
    }
  }
}
