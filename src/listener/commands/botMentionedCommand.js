import { AbstractCommand } from "../abstractCommand.js";
import { ReactCommand } from "./reactCommand.js";
import { CREATOR, PROHIBITED_RNG_CHANNELS } from "../../utils/ids/channels.js";
import { PEKO_SERVER, TEST_SERVER } from "../../utils/ids/guilds.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";
import { botName } from "../../utils/openaiUtils.js";

export class BotMentionedCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "botMentioned";
    this.allowedGuilds = [TEST_SERVER, PEKO_SERVER];
    this.prohibitedChannels = PROHIBITED_RNG_CHANNELS;
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
    this.intercept = true;
    this.probability = 0.35;
    this.triggerUsers = [
      CREATOR, // Hermit
    ];
  }
  async execute(msg) {
    console.error(
      `Bot mentioned! ${msg.content} at ${msg.channel.name}, ${msg.guild.name}`
    );

    const reactCommand = new ReactCommand();
    const match = await reactCommand.commandMatch(msg);
    if (match) {
      return reactCommand.execute(msg, undefined, true);
    }
  }
  async commandMatch(msg) {
    const text = msg.content;
    const nameVariations = [
      botName,
      botName.replaceAll("-", " "),
      botName.replaceAll("-", ""),
      botName.replaceAll(" ", ""),
      "this bot",
      "that bot",
      "good bot",
      "bad bot",
      "damn bot",
    ];
    return (
      text &&
      nameVariations.some((variation) => text.toLowerCase().includes(variation))
    );
  }
}
