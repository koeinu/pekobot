import { AbstractCommand } from "../abstractCommand.js";
import { prohibitedRNGChannels, prohibitedRNGUsers } from "./prohibitedRNG.js";

export class SameReactCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "same_react";
    this.guilds = [
      // ts
      "1061909810943115337",
      // peko
      "683140640166510717",
    ];
    this.channels = [
      "1101619891037016126", // RNG debug channel
    ];
    this.probability = 0.04;
    this.prohibitedChannels = prohibitedRNGChannels;
    this.prohibitedUsers = prohibitedRNGUsers;
    this.intercept = true;
  }
  async execute(msg) {
    console.log(
      `Same Reacting! ${msg.content} in ${msg.channel.name}, ${msg.guild.name}`
    );
    return msg.react(msg.content).catch(async (e) => {
      console.error(`Couldn't React: ${e}`);
    });
  }
  async commandMatch(msg) {
    const text = msg.content;
    const emojiPattern = /^<:\w+:\d+>$/;
    return emojiPattern.test(text);
  }
}
