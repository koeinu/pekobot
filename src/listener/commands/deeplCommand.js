import { MessageType } from "discord.js";

import { AbstractCommand } from "../abstractCommand.js";
import { ApiUtils } from "../../utils/apiUtils.js";
import { AlertUserMode, CustomRateLimiter } from "../../utils/rateLimiter.js";
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
      "DeepL",
      1,
      S_MS * H_M_S * 2,
      ["Mod", "peko-bot"],
      AlertUserMode.Normal
    );
    this.intercept = true;
    this.bannedUsers = BANNED_USERS;
  }

  async execute(msg) {
    if (!(await this.rateLimitPass(msg))) {
      return Promise.resolve();
    }
    let data = await getTextMessageContent(msg, true, true, false);
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
      data = await getTextMessageContent(repliedTo, true, true, false);
    }

    if (isCount) {
      const count = getCounter("deepl");
      return replyEmbedMessage(replyMessage, printTLInfo(count)).catch((e) => {
        console.error(`Couldn't print OCR: ${e}`);
      });
    }

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
