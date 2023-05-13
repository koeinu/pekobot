import { AbstractCommand } from "../abstractCommand.js";
import { catchTweets } from "../../utils/twitterUtils.js";
import { PEKO_STREAM, TEST_MAIN } from "../../utils/ids/channels.js";
import { getMsgInfo } from "../../utils/stringUtils.js";

export class CatchPoemCommand extends AbstractCommand {
  constructor(settings) {
    super(settings);
    this.name = "poem";
    this.triggerChannels = [PEKO_STREAM, TEST_MAIN];
    this.intercept = true;
  }
  async execute(msg) {
    console.warn(`${this.name} triggered, ${getMsgInfo(msg)}`);
    if (this.settings.inactive) {
      console.log("inactive mode, doing nothing", "pekohai");
      return Promise.resolve();
    }
    msg.react("<:pekohai:1007996906821128242>").catch((e) => {
      console.error(`Couldn't react: ${e}`);
    });
    catchTweets();
  }
  async commandMatch(msg) {
    const text = msg.content;
    return text.indexOf("~poem") === 0;
  }
}
