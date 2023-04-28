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
      console.warn(`rate++ ${entityId}: 0 / ${this.amount}`);
      this.entities[entityId] = { count: 1, ts: new Date().getTime() };
      setTimeout(() => {
        this.entities[entityId] = undefined;
      }, this.interval);
      return { result: false };
    } else {
      console.warn(
        `rate++ ${entityId}: ${this.entities[entityId].count} / ${this.amount}`
      );
      if (this.entities[entityId].count === this.amount) {
        console.warn(`rate hit!`);
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
