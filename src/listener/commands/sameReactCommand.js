import { AbstractCommand } from "../abstractCommand.js";
import { PROHIBITED_RNG_CHANNELS } from "../../utils/ids/channels.js";
import { PEKO_SERVER, TEST_SERVER } from "../../utils/ids/guilds.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";

export class SameReactCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "sameReact";
    this.allowedGuilds = [
      // ts
      TEST_SERVER,
      // peko
      PEKO_SERVER,
    ];

    this.probability = 0.01;
    this.prohibitedChannels = PROHIBITED_RNG_CHANNELS;
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
    this.intercept = true;
  }
  async execute(msg) {
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
