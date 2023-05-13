import { AbstractCommand } from "../abstractCommand.js";
import { detectHaiku } from "../../utils/haikuUtils.js";
import { AlertUserMode, CustomRateLimiter } from "../../utils/rateLimiter.js";
import { H_M_S, S_MS } from "../../utils/constants.js";

import { sendCustomEmbed } from "../../utils/discordUtils.js";
import {
  MIKO_ALLOWED_RNG_GPT,
  PEKO_ALLOWED_RNG,
} from "../../utils/ids/channels.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";

export class HaikuCommand extends AbstractCommand {
  constructor(settings) {
    super(settings);
    this.name = "haiku";
    this.rateLimiter = new CustomRateLimiter(
      "Haiku",
      1,
      S_MS * H_M_S * 5,
      [],
      [],
      AlertUserMode.Silent
    );
    this.allowedChannels = [...PEKO_ALLOWED_RNG, ...MIKO_ALLOWED_RNG_GPT];
    this.probability = 0.02;
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
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
        "I tried to make some haiku. Do you like it~?"
      ).catch((e) => {
        console.error(`Couldn't write a haiku: ${e}`);
      });
    }
  }
  async commandMatch() {
    return true;
  }
}
