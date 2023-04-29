import { formatMSToHMS } from "../utils/stringUtils.js";

import { S_MS } from "../utils/constants.js";

import { sleep } from "../utils/discordUtils.js";
import { CustomRateLimiter } from "../utils/rateLimiter.js";

export class AbstractCommand {
  constructor() {
    this.rateLimiter = undefined;
    this.triggerer = undefined;
    this.channels = undefined;
    this.probability = undefined;
    this.prohibitedChannels = undefined;
    this.guilds = undefined;
    this.allowedChannels = undefined;
    this.intercept = false;
    this.prohibitedUsers = undefined;
    this.bannedUsers = undefined;
    this.triggerUsers = undefined;
  }

  async execute() {
    throw new Error("Not implemented.");
  }

  commandMatch() {
    throw new Error("Not implemented.");
  }

  resetTrigger(msg, customHandle = undefined) {
    if (this.triggerer) {
      this.triggerer.reset(customHandle ? customHandle : msg.author.id);
    }
  }

  triggerCheck(
    msg,
    triggerName,
    initValue,
    cooldown,
    customHandle = undefined
  ) {
    if (!this.triggerer) {
      this.triggerer = new CustomRateLimiter(
        triggerName,
        initValue,
        cooldown,
        [],
        false
      );
    }
    const trigger = this.triggerer.take(
      customHandle ? customHandle : msg.author.id
    );
    console.log(`Trigger check for ${msg.content}: ${trigger.result}`);
    if (trigger.result) {
      this.triggerer = undefined;
    }
    return !!trigger.result;
  }

  async rateLimitPass(msg, customHandle = undefined) {
    if (this.rateLimiter) {
      if (this.rateLimiter.ignoreRoles) {
        if (
          this.rateLimiter.ignoreRoles.some((privelegedRole) =>
            msg.member.roles.cache.find((role) => role.name === privelegedRole)
          )
        ) {
          return true;
        }
      }
      const limited = this.rateLimiter.take(
        customHandle ? customHandle : msg.author.id
      );
      console.warn(`Limit check for ${msg.content}: ${limited.result}`);
      if (limited.result) {
        if (this.rateLimiter.alertUser) {
          await msg.react("<:PekoDerp:709152458978492477>").catch((e) => {
            console.error(`Couldn't derp-react: ${e}`);
          });
          await sleep(() => {}, S_MS);
          // await msg.channel.messages.delete(msg.id);
          await msg.author
            .send(
              `${
                this.rateLimiter.commandName
              } user rate limit reached, peko.. Try again after ${formatMSToHMS(
                limited.ts
              )}!`
            )
            .catch((e) => {
              console.error(`Couldn't alert the rate limit to the user: ${e}`);
            });
        }
        return false;
      }
    }

    return true;
  }
  rateLimitCheck(msg, customHandle = undefined) {
    if (this.rateLimiter) {
      if (this.rateLimiter.ignoreRoles) {
        if (
          this.rateLimiter.ignoreRoles.some((privelegedRole) =>
            msg.member.roles.cache.find((role) => role.name === privelegedRole)
          )
        ) {
          return true;
        }
      }
      const limited = this.rateLimiter.check(
        customHandle ? customHandle : msg.author.id
      );
      if (limited.result) {
        return false;
      }
    }

    return true;
  }
}
