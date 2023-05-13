import { AbstractCommand } from "../abstractCommand.js";
import { getMsgInfo } from "../../utils/stringUtils.js";

export class CreatorMentionedCommand extends AbstractCommand {
  constructor(settings) {
    super(settings);
    this.name = "creatorMentioned";
  }
  async execute(msg) {
    console.error(`${this.name} triggered, ${getMsgInfo(msg)}`);
  }
  async commandMatch(msg) {
    const text = msg.content;
    return (
      text &&
      (text.toLowerCase().includes("hermit") ||
        text.toLowerCase().includes("hermy"))
    );
  }
}
