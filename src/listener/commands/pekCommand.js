import { AbstractCommand } from "../abstractCommand.js";
import {
  CREATOR,
  MIKO_ALLOWED_RNG_GPT,
  PEKO_ALLOWED_RNG,
  PEKO_TEST,
} from "../../utils/ids/channels.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";

export class PekCommand extends AbstractCommand {
  constructor(settings) {
    super(settings);
    this.name = "pek";
    this.triggerChannels = [PEKO_TEST];
    this.probability = 0.3;
    this.allowedChannels = [...PEKO_ALLOWED_RNG, ...MIKO_ALLOWED_RNG_GPT];
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
    this.triggerUsers = [CREATOR];
    this.intercept = true;
  }
  async execute(msg) {
    return msg.react("<:pek:775493108154236938>").catch((e) => {
      console.error(`Couldn't pek: ${e}`);
    });
  }
  async commandMatch(msg) {
    const text = msg.content;
    return text.match(/\bpek\b/i);
  }
}
