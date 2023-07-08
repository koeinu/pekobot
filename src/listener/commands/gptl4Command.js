import { MessageType } from "discord.js";
import { GptlCommand } from "./gptlCommand.js";
import { TEST_SERVER } from "../../utils/ids/guilds.js";

export class Gptl4Command extends GptlCommand {
  constructor(settings) {
    super(settings);
    this.name = "gptl4";
    this.isGpt4 = true;
    this.allowedGuilds = [TEST_SERVER];
    this.intercept = true;
  }
  async commandMatch(msg) {
    const text = msg.content;
    return text.indexOf("~gptl4") === 0;
  }
}
