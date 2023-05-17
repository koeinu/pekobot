import { AbstractCommand } from "../abstractCommand.js";
import { ReactCommand } from "./reactCommand.js";
import {
  CREATOR,
  MIKO_ALLOWED_RNG_GPT,
  PEKO_ALLOWED_RNG,
} from "../../utils/ids/channels.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";
import { getMsgInfo } from "../../utils/stringUtils.js";

export class BotMentionedCommand extends AbstractCommand {
  constructor(settings) {
    super(settings);
    this.name = "botMentioned";
    this.allowedChannels = [...PEKO_ALLOWED_RNG, ...MIKO_ALLOWED_RNG_GPT];
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
    this.intercept = true;
    this.probability = 0.35;
    this.triggerUsers = [
      CREATOR, // Hermit
    ];
  }
  async execute(msg) {
    console.error(`${this.name} triggered, ${getMsgInfo(msg)}`);

    const reactCommand = new ReactCommand(this.settings);
    const match = await reactCommand.commandMatch(msg);
    if (match) {
      return reactCommand.execute(msg, undefined, true);
    }
  }
  async commandMatch(msg) {
    const text = msg.content;
    const botNameLowercase = this.settings.name.toLowerCase();
    const nameVariations = [
      botNameLowercase,
      botNameLowercase.replaceAll("-", " "),
      botNameLowercase.replaceAll("-", ""),
      botNameLowercase.replaceAll(" ", ""),
      "this bot",
      "that bot",
      "good bot",
      "bad bot",
      "damn bot",
    ];
    const emojiPattern = new RegExp(
      "<:([a-zA-Z_]*" + botNameLowercase + "[a-zA-Z_]*):(\\d+)>"
    );
    return (
      text &&
      !emojiPattern.test(text.trim()) &&
      nameVariations.some((variation) => text.toLowerCase().includes(variation))
    );
  }
}
