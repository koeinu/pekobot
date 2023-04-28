import { AbstractCommand } from "../abstractCommand.js";
import { prohibitedRNGChannels, prohibitedRNGUsers } from "./prohibitedRNG.js";

export class PekCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "pek";
    // 5 requests per 30s
    // this.rateLimiter = new RateLimiter("pek", 1, S_MS * H_M_S * 10);
    this.channels = [
      // peko, test channel
      "1063492591716405278",
      // test server, test channel
      "1070086039445717124",
    ];
    this.guilds = [
      // ts
      "1061909810943115337",
      // peko
      "683140640166510717",
    ];
    this.probability = 0.4;
    this.prohibitedChannels = prohibitedRNGChannels;
    this.prohibitedUsers = prohibitedRNGUsers;
    this.triggerUsers = [
      "184334990614593537", // Hermit
    ];
    this.intercept = true;
  }
  async execute(msg) {
    // if (!(await this.rateLimitPass(msg))) {
    //   return;
    // }
    // increaseCounter("pek");
    return msg.react("<:pek:775493108154236938>").catch((e) => {
      console.error(`Couldn't pek: ${e}`);
    });
  }
  async commandMatch(msg) {
    const text = msg.content;
    return text.match(/\bpek\b/i);
  }
}
