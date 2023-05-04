import { AbstractCommand } from "../abstractCommand.js";
import {
  MIKO_SERVER,
  PEKO_SERVER,
  SNAXXX_SERVER,
  TEST_SERVER,
} from "../../utils/ids/guilds.js";
import { getMsgInfo } from "../../utils/stringUtils.js";

export class CreatorMentionedCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "creatorMentioned";
    this.guilds = [TEST_SERVER, PEKO_SERVER, SNAXXX_SERVER, MIKO_SERVER];
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
