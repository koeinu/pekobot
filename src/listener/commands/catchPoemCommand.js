import { AbstractCommand } from "../abstractCommand.js";
import { catchTweets } from "../../utils/twitterUtils.js";
import { PEKO_STREAM, TEST_MAIN } from "../../utils/ids/channels.js";

export class CatchPoemCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "poem";
    this.channels = [PEKO_STREAM, TEST_MAIN];
    this.intercept = true;
  }
  async execute(msg) {
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
