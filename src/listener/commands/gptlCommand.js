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
import {
  DDF_SERVER,
  PEKO_SERVER,
  TEST_SERVER,
} from "../../utils/ids/guilds.js";
import { botName } from "../../utils/openaiUtils.js";

export class GptlCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "gptl";
    this.allowedGuilds = [TEST_SERVER, PEKO_SERVER, DDF_SERVER];
    this.rateLimiter = new CustomRateLimiter(
      "GPT translations",
      1,
      S_MS * H_M_S,
      ["Mod", botName],
      [],
      AlertUserMode.Normal
    );
    this.intercept = true;
  }
  async execute(msg) {
    if (!(await this.rateLimitPass(msg))) {
      return Promise.resolve();
    }
    console.warn(`${this.name} triggered, ${getMsgInfo(msg)}`);
    let data = await getTextMessageContent(msg, true, true, false);
    const parsed = data.text.split(" ");
    const isCount = parsed.includes("count");

    let replyMessage = msg;
    if (msg.type === MessageType.Reply) {
      const repliedTo = await msg.channel.messages.fetch(
        msg.reference.messageId
      );
      replyMessage = repliedTo;
      data = await getTextMessageContent(repliedTo, true, true, false);
    }

    if (isCount) {
      const count = getCounter("deepl");
      return replyEmbedMessage(replyMessage, printTLInfo(count)).catch((e) => {
        console.error(`Couldn't print OCR: ${e}`);
      });
    }

    if (data.text.length > 0) {
      msg.channel.sendTyping().catch((e) => {
        console.error(`Couldn't send typing: ${e}`);
      });

      return ApiUtils.GetTranslation(data.text, undefined, msg, true).then(
        (tlData) => {
          if (tlData.text) {
            const toSend = formatTLText(tlData.text, tlData.isGpt);
            // return reply(msg, toSend, undefined, false, false);
            return replyCustomEmbed(
              msg,
              undefined,
              toSend,
              undefined,
              undefined,
              printTLInfo(data.countObject, tlData.time, tlData.metaData)
            );
          } else {
            return replyCustomEmbed(
              msg,
              undefined,
              `Beep boop, looks like I'm overloaded with requests, peko.. Try again later!`,
              undefined,
              undefined,
              printTLInfo(data.countObject, tlData.time, tlData.metaData)
            );
          }
        }
      );
    }
  }
  async commandMatch(msg) {
    const text = msg.content;
    return text.indexOf("~gptl") === 0;
  }
}
