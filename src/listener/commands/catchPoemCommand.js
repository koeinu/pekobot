import { AbstractCommand } from "../abstractCommand.js";
import { catchTweets } from "../../utils/twitterUtils.js";

export class CatchPoemCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "poem";
    this.channels = [
      "1056187525753999442", // peko server, stream-chat
      "1070086039445717124", // test server, test channel
    ];
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
