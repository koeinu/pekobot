import { AbstractCommand } from "../abstractCommand.js";
import {
  MIKO_ALLOWED_RNG_GPT,
  PEKO_ALLOWED_RNG,
} from "../../utils/ids/channels.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";

export class SameReactCommand extends AbstractCommand {
  constructor(settings) {
    super(settings);
    this.name = "sameReact";

    this.probability = 0.01;
    this.allowedChannels = [...PEKO_ALLOWED_RNG, ...MIKO_ALLOWED_RNG_GPT];
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
    this.intercept = true;
  }
  async execute(msg) {
    if (this.settings.inactive) {
      console.log("inactive mode, doing nothing");
      return Promise.resolve();
    }
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
