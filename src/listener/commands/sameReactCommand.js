import { AbstractCommand } from "../abstractCommand.js";
import {
  MIKO_TEST,
  PROHIBITED_RNG_CHANNELS,
  TESTING_2,
} from "../../utils/ids/channels.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";

export class SameReactCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "sameReact";

    this.probability = 0.5; //0.01;
    this.prohibitedChannels = PROHIBITED_RNG_CHANNELS;
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
    this.intercept = true;
    this.allowedChannels = [MIKO_TEST, TESTING_2];
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
