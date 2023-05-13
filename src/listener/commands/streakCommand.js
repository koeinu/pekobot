import { AbstractCommand } from "../abstractCommand.js";

import { AlertUserMode, CustomRateLimiter } from "../../utils/rateLimiter.js";

import { H_M_S, S_MS } from "../../utils/constants.js";
import {
  MIKO_ALLOWED_RNG_GPT,
  PEKO_ALLOWED_RNG,
} from "../../utils/ids/channels.js";
import { getMsgInfo } from "../../utils/stringUtils.js";

const STREAK_TIMEOUT = 2000; //ms

const pickRandomTriggerValue = () => Math.round(Math.random() * 3 + 4);

export class StreakCommand extends AbstractCommand {
  constructor(settings) {
    super(settings);
    this.name = "streak";

    // cooldown
    this.rateLimiter = new CustomRateLimiter(
      "streak_limiter",
      1,
      S_MS * H_M_S * 15,
      [],
      [],
      AlertUserMode.Silent
    );

    this.allowedChannels = [...PEKO_ALLOWED_RNG, ...MIKO_ALLOWED_RNG_GPT];
  }
  async execute(msg) {
    const text = msg.content.trim();
    const streakData = this.settings["streakData"];
    if (!streakData) {
      return Promise.resolve();
    }

    const chosenTrigger = streakData.triggers[0];

    const reactionData = streakData.find((data) =>
      data.triggers.find((trigger) => text.toLowerCase().includes(trigger))
    );

    const trigger = this.triggerCheck(
      msg,
      "streak_triggerer",
      pickRandomTriggerValue(),
      S_MS * H_M_S * 2,
      chosenTrigger
    );
    if (trigger) {
      if (!(await this.rateLimitPass(msg, "streakSharedHandle"))) {
        return Promise.resolve();
      }
      this.resetTrigger(msg, chosenTrigger);

      console.warn(`${this.name} triggered, ${getMsgInfo(msg)}`);

      return msg.channel
        .sendTyping()
        .catch((e) => {
          console.error(`Couldn't send typing: ${e}`);
        })
        .finally(() => {
          setTimeout(() => {
            const toSend = reactionData ? reactionData.reaction : text;
            if (this.settings.inactive) {
              console.log("streak inactive mode, doing nothing");
              return Promise.resolve();
            }
            return msg.channel.send(toSend).catch((e) => {
              console.error(
                `Couldn't send a streak message ${msg.content} in ${msg.channel}: ${e}`
              );
            });
          }, STREAK_TIMEOUT);
        });
    }
  }
  async commandMatch(msg) {
    const streakData = this.settings["streakData"];
    const text = msg.content;
    const emojiPattern = /^<:\w+:\d+>$/;
    return (
      emojiPattern.test(text) ||
      streakData.some((data) =>
        data.triggers.some((trigger) => text.toLowerCase().includes(trigger))
      )
    );
  }
}
