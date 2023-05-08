import { AbstractCommand } from "../abstractCommand.js";
import {
  CREATOR,
  PEKO_TEST,
  PROHIBITED_RNG_CHANNELS,
} from "../../utils/ids/channels.js";
import { PEKO_SERVER, TEST_SERVER } from "../../utils/ids/guilds.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";

export class PekCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "pek";
    this.triggerChannels = [PEKO_TEST];
    this.allowedGuilds = [TEST_SERVER, PEKO_SERVER];
    this.probability = 0.3;
    this.prohibitedChannels = PROHIBITED_RNG_CHANNELS;
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
