import { AbstractCommand } from "../abstractCommand.js";
import { detectHaiku } from "../../utils/haiku.js";
import { CustomRateLimiter } from "../../utils/rateLimiter.js";
import { H_M_S, S_MS } from "../../utils/constants.js";

import { sendCustomEmbed } from "../../utils/discordUtils.js";
import { prohibitedRNGChannels, prohibitedRNGUsers } from "./prohibitedRNG.js";

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
      "1070086039445717124",
      // btg
      "1063492591716405278",
    ];
    this.guilds = [
      // ts
      "1061909810943115337",
      // peko
      "683140640166510717",
    ];
    this.probability = 0.03;
    this.prohibitedChannels = prohibitedRNGChannels;
    this.prohibitedUsers = prohibitedRNGUsers;
  }
  async execute(msg) {
    const text = msg.content;
    const haiku = await detectHaiku(text);
    console.log(`Detected haiku: ${haiku}`);
    if (haiku) {
      if (!(await this.rateLimitPass(msg, "sharedHandle"))) {
        return;
      }
      const haikuText = `*${haiku.l1.join(" ")}*\n*${haiku.l2.join(
        " "
      )}*\n*${haiku.l3.join(" ")}*`;

      sendCustomEmbed(
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
  commandMatch() {
    return true;
  }
}
