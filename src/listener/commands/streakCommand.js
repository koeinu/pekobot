import { AbstractCommand } from "../abstractCommand.js";

import { CustomRateLimiter } from "../../utils/rateLimiter.js";

import { H_M_S, S_MS } from "../../utils/constants.js";
import { prohibitedRNGChannels } from "./prohibitedRNG.js";

const STREAK_TIMEOUT = 2000; //ms

const pickRandomTriggerValue = () => Math.round(Math.random() * 3 + 4);

export class StreakCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "streak";

    this.rateLimiter = new CustomRateLimiter(
      "streak_limiter",
      1,
      S_MS * H_M_S * 15,
      [],
      false
    );
    this.guilds = [
      // ts
      "1061909810943115337",
      // peko
      "683140640166510717",
    ];
    this.prohibitedChannels = prohibitedRNGChannels;
  }
  async execute(msg) {
    const text = msg.content.trim();
    const trigger = this.triggerCheck(
      msg,
      "streak_triggerer",
      pickRandomTriggerValue(),
      S_MS * H_M_S * 2,
      text
    );
    if (trigger) {
      if (!(await this.rateLimitPass(msg, "streakSharedHandle"))) {
        return;
      }
      this.resetTrigger(msg, text);

      return msg.channel
        .sendTyping()
        .catch((e) => {
          console.error(`Couldn't send typing: ${e}`);
        })
        .finally(() => {
          setTimeout(() => {
            const toSend = text.includes("にーん")
              ? "にーん…"
              : text.includes("おつぺこ") ||
                text.toLowerCase().includes("otsupeko")
              ? "おつぺこ〜"
              : text;
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
    const text = msg.content;
    const emojiPattern = /^<:\w+:\d+>$/;
    return (
      emojiPattern.test(text) ||
      text.includes("にーん") ||
      text.includes("おつぺこ") ||
      text.toLowerCase().includes("otsupeko")
    );
  }
}
