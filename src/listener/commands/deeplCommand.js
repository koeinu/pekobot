import { MessageType } from "discord.js";

import { AbstractCommand } from "../abstractCommand.js";
import { ApiUtils } from "../../utils/apiUtils.js";
import { CustomRateLimiter } from "../../utils/rateLimiter.js";
import {
  formatTLText,
  parseAttachmentUrl,
  printTLInfo,
} from "../../utils/stringUtils.js";

import {
  canIncreaseCounter,
  getCounter,
  increaseCounter,
} from "../../model/counter.js";

import {
  replyCustomEmbed,
  replyEmbedMessage,
} from "../../utils/discordUtils.js";

import { H_M_S, LANGUAGES, S_MS } from "../../utils/constants.js";
import { bannedUsers } from "./prohibitedRNG.js";
import { getTextMessageContent } from "../../utils/stringUtils.js";

export class DeeplCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "deepl";
    // 1 request per 10 min
    this.rateLimiter = new CustomRateLimiter(
      "Optical Image Recognition",
      1,
      S_MS * H_M_S * 2,
      ["Mod"]
    );
    this.intercept = true;
    this.bannedUsers = bannedUsers;
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
    const deeplLanguage = sourceLanguage
      ? sourceLanguage.toUpperCase()
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

    let tlData = await ApiUtils.GetTranslation(text, deeplLanguage);
    replyCustomEmbed(
      replyMessage,
      undefined,
      formatTLText(tlData.text),
      undefined,
      undefined,
      printTLInfo(countObject, tlData.time)
    ).catch((e) => {
      console.error(`Couldn't send the translation: ${e}`);
    });
  }
  commandMatch(text) {
    return text.indexOf("~deepl") === 0;
  }
}
