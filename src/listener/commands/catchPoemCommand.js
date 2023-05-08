import { AbstractCommand } from "../abstractCommand.js";
import { catchTweets } from "../../utils/twitterUtils.js";
import { getMsgInfo } from "../../utils/stringUtils.js";

export class CatchPoemCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "poem";
    this.triggerChannels = [];
    this.intercept = true;
  }
  async execute(msg) {
    console.warn(`${this.name} triggered, ${getMsgInfo(msg)}`);
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
