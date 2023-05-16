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
      } else {
        this.entities[entityId] = { count: 0, ts: new Date().getTime() };
      }
      setTimeout(() => {
        this.entities[entityId] = undefined;
      }, this.interval);
      return { result: false };
    } else {
      if (this.entities[entityId].count === this.amount) {
        return {
          result: true,
          ts: this.entities[entityId].ts + this.interval - new Date().getTime(),
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
