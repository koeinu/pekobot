import { MessageType } from "discord.js";
import { GptlCommand } from "./gptlCommand.js";
import { PEKO_SERVER, TEST_SERVER } from "../../utils/ids/guilds.js";
import { AlertUserMode, CustomRateLimiter } from "../../utils/rateLimiter.js";
import { H_M_S, S_MS } from "../../utils/constants.js";
import { ADMINS } from "../../utils/ids/users.js";

export class Gptl4Command extends GptlCommand {
  constructor(settings) {
    super(settings);
    this.name = "gptl4";
    this.isGpt4 = true;
    this.allowedGuilds = [TEST_SERVER, PEKO_SERVER];
    this.rateLimiter = new CustomRateLimiter(
      "GPT4 translations",
      1,
      S_MS * H_M_S * 5,
      ["Mod", this.settings.name],
      [],
      AlertUserMode.Normal
    );
    this.intercept = true;
    this.triggerUsers = ADMINS;
  }
  async commandMatch(msg) {
    const text = msg.content;
    return text.indexOf("~gptl4") === 0;
  }
}
