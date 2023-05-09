import { formatMSToHMS, getMsgInfo } from "../utils/stringUtils.js";

import { S_MS } from "../utils/constants.js";

import { sleep } from "../utils/discordUtils.js";
import { AlertUserMode, CustomRateLimiter } from "../utils/rateLimiter.js";

export class AbstractCommand {
  constructor() {
    this.name = undefined;

    this.rateLimiter = undefined;
    this.triggerer = undefined;

    this.prohibitedChannels = undefined;
    this.allowedChannels = undefined;
    this.triggerChannels = undefined;

    this.probability = undefined;

    this.intercept = false;

    this.triggerUsers = undefined;
    this.prohibitedUsers = undefined;
    this.bannedUsers = undefined;

    this.allowedGuilds = undefined;
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
        [],
        AlertUserMode.Silent
      );
    }
    const trigger = this.triggerer.take(
      customHandle ? customHandle : msg.author.id
    );
    console.log(`Trigger check for ${getMsgInfo(msg)}: ${trigger.result}`);
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
      if (this.rateLimiter.ignoreChannels) {
        if (
          this.rateLimiter.ignoreChannels.some(
            (okChannel) => msg.channel.id === okChannel
          )
        ) {
          return true;
        }
      }
      const limited = this.rateLimiter.take(
        customHandle ? customHandle : msg.author.id
      );
      console.log(`Limit check for ${getMsgInfo(msg)}: ${limited.result}`);
      if (limited.result) {
        console.debug(
          `Limit hit for ${this.rateLimiter.commandName}, cd ${formatMSToHMS(
            limited.ts
          )}, info: ${getMsgInfo(msg)}`
        );
        if (this.rateLimiter.alertUser !== AlertUserMode.Silent) {
          await msg.react("<:PekoDerp:709152458978492477>").catch((e) => {
            console.error(`Couldn't derp-react: ${e}`);
          });
          if (this.rateLimiter.alertUser === AlertUserMode.Normal) {
            await sleep(() => {}, S_MS);
            await msg.author
              .send(
                `${
                  this.rateLimiter.commandName
                } user rate limit reached.. Try again after ${formatMSToHMS(
                  limited.ts
                )}!`
              )
              .catch((e) => {
                console.error(
                  `Couldn't alert the rate limit to the user: ${e}`
                );
              });
          }
        }
        return false;
      }
    }

    return true;
  }

  shouldProcessMsg(msg) {
    // do not respond to system messages and to other bots
    if (msg.system || msg.author.bot) {
      return {
        result: false,
        reason: `${this.name}, ignoring bot/system msg (${getMsgInfo(msg)})`,
      };
    }

    // will trigger from these users ignoring everything else
    if (this.triggerUsers) {
      if (this.triggerUsers.some((el) => el === msg.author.id)) {
        return {
          result: true,
          reason: `${this.name}, triggered by user ${
            msg.author.username
          } (${getMsgInfo(msg)})`,
        };
      }
    }

    // won't trigger from these users
    if (this.prohibitedUsers) {
      if (this.prohibitedUsers.some((el) => el === msg.author.id)) {
        return {
          result: false,
          reason: `${this.name}, ignoring prohibited user ${
            msg.author.username
          } (${getMsgInfo(msg)})`,
        };
      }
    }
    if (this.bannedUsers) {
      if (this.bannedUsers.some((el) => el === msg.author.id)) {
        return {
          result: false,
          reason: `${this.name}, ignoring banned user ${
            msg.author.username
          } (${getMsgInfo(msg)})`,
        };
      }
    }

    if (this.allowedGuilds) {
      const result = this.allowedGuilds.some((g) => {
        return `${msg.guild.id}` === `${g}`;
      });
      if (!result) {
        return {
          result: false,
          reason: `${this.name}, guild filtered: ${
            this.allowedGuilds
          } (${getMsgInfo(msg)})`,
        };
      }
    }
    if (this.allowedChannels) {
      const result = this.allowedChannels.some((g) => {
        return `${msg.channel.id}` === `${g}`;
      });
      if (!result) {
        return {
          result: false,
          reason: `${this.name}, channel filtered: ${
            this.allowedChannels
          } (${getMsgInfo(msg)})`,
        };
      }
    }
    if (this.prohibitedChannels) {
      const result = this.prohibitedChannels.some((ch) => {
        return `${msg.channel.id}` === `${ch}`;
      });
      if (result) {
        return {
          result: false,
          reason: `${this.name} -> prohibited channel filtered: ${
            this.prohibitedChannels
          } (${getMsgInfo(msg)})`,
        };
      }
    }

    // ALWAYS triggering in these channels
    if (this.triggerChannels) {
      const result = this.triggerChannels.some((ch) => {
        return `${msg.channel.id}` === `${ch}`;
      });
      if (result) {
        return {
          result: true,
          reason: `${this.name}, channel OK: ${
            this.triggerChannels
          } (${getMsgInfo(msg)})`,
        };
      }
    }

    // not matched in always-triggered channels, may be triggered by probability
    if (this.probability !== undefined) {
      const value = Math.random();
      const result = value <= this.probability;

      return {
        result,
        reason: `${this.name}, ${value}/${this.probability} (${getMsgInfo(
          msg
        )})`,
      };
    }

    // if no guilds, channels or probability is set, the name is allowed to be executed by default
    return {
      result: true,
      reason: `${this.name}, default (${getMsgInfo(msg)})`,
    };
  }
}
