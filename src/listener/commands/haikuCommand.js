import { AbstractCommand } from "../abstractCommand.js";
import { detectHaiku } from "../../utils/haikuUtils.js";
import { AlertUserMode, CustomRateLimiter } from "../../utils/rateLimiter.js";
import { H_M_S, S_MS } from "../../utils/constants.js";

import { sendCustomEmbed } from "../../utils/discordUtils.js";
import {
  MIKO_TEST,
  PROHIBITED_RNG_CHANNELS,
  TESTING_2,
} from "../../utils/ids/channels.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";

export class HaikuCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "haiku";
    this.rateLimiter = new CustomRateLimiter(
      "Haiku",
      1,
      S_MS * H_M_S * 5,
      [],
      AlertUserMode.Silent
    );
    this.probability = 1; // 0.02;
    this.prohibitedChannels = PROHIBITED_RNG_CHANNELS;
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
    this.allowedChannels = [MIKO_TEST, TESTING_2];
  }
  async execute(msg) {
    const text = msg.content;
    const haiku = detectHaiku(text);
    if (haiku) {
      console.debug(`Detected haiku:`, haiku);

      if (!(await this.rateLimitPass(msg, "haikuSharedHandle"))) {
        return Promise.resolve();
      }
      let haikuText = `*${haiku.l1.join(" ")}*\n*${haiku.l2.join(
        " "
      )}*\n*${haiku.l3.join(" ")}*`;

      const emojiCodes = haikuText.match(/<(\d+)>/g); // <123>
      const initialEmojis = text.match(/<([^\s]*):(\d+)>/g); // <emojiname:123>

      if (emojiCodes && initialEmojis) {
        emojiCodes.forEach((code) => {
          const digits = code.match(/\d+/g);
          const initialEmoji = initialEmojis.find((el) =>
            el.includes(digits[0])
          );
          haikuText = haikuText.replaceAll(code, initialEmoji);
        });
      }

      return sendCustomEmbed(
        msg.channel,
        undefined,
        undefined,
        haikuText,
        undefined,
        undefined,
        "I tried to make some haiku, nye~. Do you like it~?"
      ).catch((e) => {
        console.error(`Couldn't write a haiku: ${e}`);
      });
    }
  }
  async commandMatch() {
    return true;
  }
}
