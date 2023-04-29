import { MessageType } from "discord.js";

import { AbstractCommand } from "../abstractCommand.js";
import { ApiUtils } from "../../utils/apiUtils.js";
import { CustomRateLimiter } from "../../utils/rateLimiter.js";
import { formatTLText, printTLInfo } from "../../utils/stringUtils.js";

import { getCounter } from "../../model/counter.js";

import {
  replyCustomEmbed,
  replyEmbedMessage,
} from "../../utils/discordUtils.js";

import { H_M_S, LANGUAGES, S_MS } from "../../utils/constants.js";
import { getTextMessageContent } from "../../utils/stringUtils.js";
import { BANNED_USERS } from "../../utils/ids/users.js";

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
    this.bannedUsers = BANNED_USERS;
  }

  async execute(msg) {
    const canOCR = this.rateLimitCheck(msg);
    let data = await getTextMessageContent(msg, canOCR, true);
    const parsed = data.text.split(" ");
    const sourceLanguage = LANGUAGES.find((el) =>
      parsed.map((el) => el.toUpperCase()).includes(el)
    );
    const deeplLanguage = sourceLanguage
      ? sourceLanguage.toUpperCase()
      : undefined;
    const isCount = parsed.includes("count");

    let replyMessage = msg;
    if (msg.type === MessageType.Reply) {
      const repliedTo = await msg.channel.messages.fetch(
        msg.reference.messageId
      );
      replyMessage = repliedTo;
      data = await getTextMessageContent(repliedTo, canOCR, true);
    }

    if (isCount) {
      const count = getCounter("deepl");
      return replyEmbedMessage(replyMessage, printTLInfo(count)).catch((e) => {
        console.error(`Couldn't print OCR: ${e}`);
      });
    }

    console.log(`translating ${data.text || "image"}`);

    let tlData = await ApiUtils.GetTranslation(data.text, deeplLanguage);
    return replyCustomEmbed(
      replyMessage,
      undefined,
      formatTLText(tlData.text),
      undefined,
      undefined,
      printTLInfo(data.countObject, tlData.time)
    ).catch((e) => {
      console.error(`Couldn't send the translation: ${e}`);
    });
  }
  async commandMatch(msg) {
    const text = msg.content;
    return text.indexOf("~deepl") === 0;
  }
}
