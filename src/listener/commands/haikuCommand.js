import { AbstractCommand } from "../abstractCommand.js";
import { detectHaiku } from "../../utils/haikuUtils.js";
import { CustomRateLimiter } from "../../utils/rateLimiter.js";
import { H_M_S, S_MS } from "../../utils/constants.js";

import { sendCustomEmbed } from "../../utils/discordUtils.js";
import {
  PEKO_TEST,
  PROHIBITED_RNG_CHANNELS,
  TEST_MAIN,
} from "../../utils/ids/channels.js";
import { PEKO_SERVER, TEST_SERVER } from "../../utils/ids/guilds.js";
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
      false
    );
    this.channels = [
      // ts
      TEST_MAIN,
      // btg
      PEKO_TEST,
    ];
    this.guilds = [
      // ts
      TEST_SERVER,
      // peko
      PEKO_SERVER,
    ];
    this.probability = 0.03;
    this.prohibitedChannels = PROHIBITED_RNG_CHANNELS;
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
  }
  async execute(msg) {
    const text = msg.content;
    const haiku = await detectHaiku(text);
    if (haiku) {
      console.warn(`Detected haiku:`, haiku);

      if (!(await this.rateLimitPass(msg, "haikuSharedHandle"))) {
        return;
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
        "I tried to make some haiku, peko. Do you like it~?"
      ).catch((e) => {
        console.error(`Couldn't write a haiku: ${e}`);
      });
    }
  }
  async commandMatch() {
    return true;
  }
}
