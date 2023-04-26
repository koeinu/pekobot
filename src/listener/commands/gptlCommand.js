import { AbstractCommand } from "../abstractCommand.js";

import { GPTL_SYSTEM_MESSAGE } from "../../utils/openaiUtils.js";
import {
  replyCustomEmbed,
  replyEmbedMessage,
} from "../../utils/discordUtils.js";
import {
  formatTLText,
  getTextMessageContent,
  parseAttachmentUrl,
  printTLInfo,
} from "../../utils/stringUtils.js";
import { H_M_S, LANGUAGES, S_MS } from "../../utils/constants.js";
import { MessageType } from "discord.js";
import {
  canIncreaseCounter,
  getCounter,
  increaseCounter,
} from "../../model/counter.js";
import { ApiUtils } from "../../utils/apiUtils.js";
import { CustomRateLimiter } from "../../utils/rateLimiter.js";

export class GptlCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "gptl";
    this.guilds = [
      // ts
      "1061909810943115337",
      // peko
      "683140640166510717",
      // miko
      "584977240358518784",
      // DD
      "533314828308054016",
    ];
    // this.allowedChannels = [
    //   "1098366878382031000", // ts, peko consulting,
    //   "1070086039445717124", // ts, testing ground
    //   "1063492591716405278", // peko testing ground
    //   "1098929695724146819", // miko ticket
    //   "1098913878445920306", // dd, gpt channel
    //   "921428703865630800", // dd, redacted
    //   "1098786610167939092", // peko test feed
    // ];
    this.rateLimiter = new CustomRateLimiter(
      "Optical Image Recognition + GPT3.5",
      1,
      S_MS * H_M_S * 5,
      ["Mod"]
    );
    this.intercept = true;
  }
  async execute(msg) {
    let text = getTextMessageContent(msg);
    const parsed = text.split(" ");
    const sourceLanguage = LANGUAGES.find((el) =>
      parsed.map((el) => el.toUpperCase()).includes(el)
    );
    const googleOCRlanguage = sourceLanguage
      ? sourceLanguage.toLowerCase()
      : undefined;
    const isText = parsed.includes("text");
    const isCount = parsed.includes("count");

    let url;
    let replyMessage = msg;
    if (msg.type === MessageType.Reply) {
      const repliedTo = await msg.channel.messages.fetch(
        msg.reference.messageId
      );
      replyMessage = repliedTo;
      text = getTextMessageContent(repliedTo);
    }

    url = parseAttachmentUrl(replyMessage);

    if (!text && !url) {
      return;
    }

    if (isCount) {
      const count = getCounter("deepl");
      replyEmbedMessage(replyMessage, printTLInfo(count)).catch((e) => {
        console.error(`Couldn't print OCR: ${e}`);
      });
      return;
    }

    console.log(`translating ${text || "image"}`);

    let countObject = undefined;

    if (url !== undefined) {
      try {
        if (!canIncreaseCounter("deepl")) {
          throw "Monthly command limit exceeded";
        }
        if (!(await this.rateLimitPass(msg))) {
          return;
        }

        msg.channel.sendTyping().catch((e) => {
          console.error(`Couldn't send typing: ${e}`);
        });

        text = await ApiUtils.OCRRequest(url, googleOCRlanguage, isText);
        console.log("parsed OCR text: ", text);
        countObject = increaseCounter("deepl");
      } catch (errMsg) {
        console.error(errMsg);
      }
    } else {
      msg.channel.sendTyping().catch((e) => {
        console.error(`Couldn't send typing: ${e}`);
      });
    }

    console.log(`SYSTEM_MESSAGE:`, GPTL_SYSTEM_MESSAGE());

    if (text.length > 0) {
      msg.channel.sendTyping().catch((e) => {
        console.error(`Couldn't send typing: ${e}`);
      });

      ApiUtils.GetTranslation(text, undefined, msg, true)
        .then((tlData) => {
          if (tlData.text) {
            const toSend = formatTLText(tlData.text, tlData.isGpt);
            // return reply(msg, toSend, undefined, false, false);
            return replyCustomEmbed(
              msg,
              undefined,
              toSend,
              undefined,
              undefined,
              printTLInfo(countObject, tlData.time, tlData.metaData)
            );
          } else {
            return replyCustomEmbed(
              msg,
              undefined,
              `Beep boop, looks like I'm overloaded with requests, peko.. Try again later!`,
              undefined,
              undefined,
              printTLInfo(countObject, tlData.time, tlData.metaData)
            );
          }
        })
        .catch((e) => {
          console.error(`Couldn't GPTL ${msg.content} in ${msg.channel}: ${e}`);
        });
    }
  }
  commandMatch(text) {
    return text.indexOf("~gptl") === 0;
  }
}
