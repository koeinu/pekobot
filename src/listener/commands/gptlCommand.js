import { AbstractCommand } from "../abstractCommand.js";

import {
  replyCustomEmbed,
  replyEmbedMessage,
} from "../../utils/discordUtils.js";
import {
  formatTLText,
  getMsgInfo,
  getTextMessageContent,
  printTLInfo,
} from "../../utils/stringUtils.js";
import { H_M_S, S_MS } from "../../utils/constants.js";
import { MessageType } from "discord.js";
import { getCounter } from "../../model/counter.js";
import { ApiUtils } from "../../utils/apiUtils.js";
import { AlertUserMode, CustomRateLimiter } from "../../utils/rateLimiter.js";
import { BANNED_USERS } from "../../utils/ids/users.js";

export class GptlCommand extends AbstractCommand {
  constructor(settings) {
    super(settings);
    this.name = "gptl";
    this.isGpt4 = false;
    // this.allowedGuilds = [TEST_SERVER, PEKO_SERVER, DDF_SERVER, MIKO_SERVER];
    this.rateLimiter = new CustomRateLimiter(
      "GPT translations",
      1,
      S_MS * H_M_S,
      ["Mod", this.settings.name],
      [],
      AlertUserMode.Normal
    );
    this.intercept = true;
    this.bannedUsers = BANNED_USERS;
  }
  async execute(msg) {
    console.warn(`${this.name} triggered, ${getMsgInfo(msg)}`);
    if (!(await this.rateLimitCheck(msg, undefined, false))) {
      return Promise.resolve();
    }
    let data = await getTextMessageContent(msg, true, true, false);
    const parsed = data.text.split(" ");
    const isCount = parsed.includes("count");

    let replyMessage = msg;
    if (msg.type === MessageType.Reply) {
      const repliedTo = await msg.channel.messages
        .fetch(msg.reference.messageId)
        .catch((e) => {
          console.error(
            `Couldn't fetch reply message for ${getMsgInfo(msg)}:`,
            e
          );
        });
      replyMessage = repliedTo;
      data = await getTextMessageContent(repliedTo, true, true, false);
    }

    if (isCount) {
      const count = getCounter("deepl");
      return replyEmbedMessage(replyMessage, printTLInfo(count)).catch((e) => {
        console.error(`Couldn't print OCR: ${e}`);
      });
    }

    if (
      data.text.length > 0 &&
      !data.text.match(/^[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~\d]*$/g)
    ) {
      msg.channel.sendTyping().catch((e) => {
        console.error(`Couldn't send typing: ${e}`);
      });

      return ApiUtils.GetTranslation(
        data.text,
        undefined,
        msg,
        this.settings,
        true,
        false,
        this.isGpt4
      ).then(async (tlData) => {
        if (tlData.text) {
          const toSend = formatTLText(tlData.text, tlData.isGpt);
          // return reply(msg, toSend, undefined, false, false);
          if (this.settings.inactive) {
            console.log("gptl inactive mode, doing nothing", toSend);
            return Promise.resolve();
          }
          if (!(await this.rateLimitPass(msg))) {
            return Promise.resolve();
          }
          return replyCustomEmbed(
            msg,
            undefined,
            toSend,
            undefined,
            undefined,
            printTLInfo(data.countObject, tlData.time, tlData.metaData)
          );
        } else {
          if (this.settings.inactive) {
            console.log("inactive mode, doing nothing");
            return Promise.resolve();
          }
          return replyCustomEmbed(
            msg,
            undefined,
            `Beep boop, looks like I'm overloaded with requests.. Try again later!`,
            undefined,
            undefined,
            printTLInfo(data.countObject, tlData.time, tlData.metaData)
          );
        }
      });
    }
  }
  async commandMatch(msg) {
    const text = msg.content;
    return text.indexOf("~gptl") === 0;
  }
}
