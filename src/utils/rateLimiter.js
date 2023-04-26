export class CustomRateLimiter {
  constructor(commandName, amount, interval, ignoreRoles, alertUser = true) {
    this.ignoreRoles = ignoreRoles;
    this.commandName = commandName;
    this.interval = interval;
    this.amount = amount;
    this.entities = {};
    this.alertUser = alertUser;
  }

  take(entityId) {
    if (this.entities[entityId] === undefined) {
      console.log("ts 1:", new Date().getTime());
      this.entities[entityId] = { count: 1, ts: new Date().getTime() };
      setTimeout(() => {
        this.entities[entityId] = undefined;
      }, this.interval);
      return { result: false };
    } else {
      console.warn(
        `Trying to increase for ${entityId}: currently ${this.entities[entityId].count} out of ${this.amount}`
      );
      if (this.entities[entityId].count === this.amount) {
        console.log("ts 2:", new Date().getTime());
        return {
          result: true,
          ts: this.entities[entityId].ts + this.interval - new Date().getTime(),
        };
      } else {
        this.entities[entityId].count += 1;
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
