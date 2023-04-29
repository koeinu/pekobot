import { AbstractCommand } from "../abstractCommand.js";
import { ReactCommand } from "./reactCommand.js";
import {
  CREATOR,
  PROHIBITED_RNG_CHANNELS,
  TEST_MAIN,
} from "../../utils/ids/channels.js";
import { PEKO_SERVER, TEST_SERVER } from "../../utils/ids/guilds.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";
import { botName } from "../../utils/openaiUtils.js";

export class BotMentionedCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "react";
    this.guilds = [TEST_SERVER, PEKO_SERVER];
    this.prohibitedChannels = PROHIBITED_RNG_CHANNELS;
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
    this.channels = [TEST_MAIN];
    this.intercept = true;
    this.probability = 0.5;
    this.triggerUsers = [
      CREATOR, // Hermit
    ];
  }
  async execute(msg) {
    console.warn(
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
    return (
      text &&
      (text.toLowerCase().includes("peko-bot") ||
        text.toLowerCase().includes("peko bot") ||
        text.toLowerCase().includes("pekobot") ||
        text.toLowerCase().includes("this bot") ||
        text.toLowerCase().includes("damn bot") ||
        text.toLowerCase().includes(botName))
    );
  }
}
