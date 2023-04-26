import { AbstractCommand } from "../abstractCommand.js";

import { CustomRateLimiter } from "../../utils/rateLimiter.js";

import { H_M_S, S_MS } from "../../utils/constants.js";
import { prohibitedRNGChannels } from "./prohibitedRNG.js";

const STREAK_TIMEOUT = 2000; //ms

export class StreakCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "streak";
    this.triggerer = new CustomRateLimiter(
      "streak_triggerer",
      5,
      S_MS * H_M_S * 2, // 2 min
      [],
      false
    );
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
    const trigger = this.triggerCheck(msg, text);
    if (trigger) {
      if (!(await this.rateLimitPass(msg, "sharedHandle"))) {
        return;
      }
      this.resetTrigger(msg, text);

      msg.channel
        .sendTyping()
        .catch((e) => {
          console.error(`Couldn't send typing: ${e}`);
        })
        .finally(() => {
          setTimeout(() => {
            const toSend = text.includes("にーん")
              ? "にーん…"
              : text.includes("おつぺこ") || text.includes("otsupeko")
              ? "おつぺこ〜"
              : text;
            msg.channel.send(toSend).catch((e) => {
              console.error(
                `Couldn't send a streak message ${msg.content} in ${msg.channel}: ${e}`
              );
            });
          }, STREAK_TIMEOUT);
        });
    }
  }
  commandMatch(text) {
    const emojiPattern = /^<:\w+:\d+>$/;
    return (
      emojiPattern.test(text) ||
      text.includes("にーん") ||
      text.includes("おつぺこ") ||
      text.includes("otsupeko")
    );
  }
}
