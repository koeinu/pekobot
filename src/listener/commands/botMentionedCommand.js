import { AbstractCommand } from "../abstractCommand.js";
import { prohibitedRNGChannels, prohibitedRNGUsers } from "./prohibitedRNG.js";
import { ReactCommand } from "./reactCommand.js";

export class BotMentionedCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "react";
    this.guilds = [
      // ts
      "1061909810943115337",
      // peko
      "683140640166510717",
    ];
    this.prohibitedChannels = prohibitedRNGChannels;
    this.prohibitedUsers = prohibitedRNGUsers;
    this.channels = ["1070086039445717124"];
    this.intercept = true;
    this.probability = 0.3;
  }
  async execute(msg) {
    console.log(
      `Bot mentioned! ${msg.content} at ${msg.channel.name}, ${msg.guild.name}`
    );

    const reactCommand = new ReactCommand();
    if (reactCommand.commandMatch(msg.content)) {
      await reactCommand.execute(msg, undefined, true);
    }
  }
  commandMatch(text) {
    return (
      text &&
      (text.toLowerCase().includes("peko-bot") ||
        text.toLowerCase().includes("peko bot") ||
        text.toLowerCase().includes("pekobot") ||
        text.toLowerCase().includes("this bot"))
    );
  }
}
