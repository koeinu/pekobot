import { AbstractCommand } from "../abstractCommand.js";

import { gpt } from "../../utils/openaiUtils.js";
import { MessageType } from "discord.js";
import {
  getTextMessageContent,
  formChainGPTPrompt,
} from "../../utils/stringUtils.js";
import { reply } from "../../utils/discordUtils.js";
import { GPT_SYSTEM_MESSAGE } from "../../utils/openaiUtils.js";

const getReplyChain = async (msg, msgChain = [msg]) => {
  if (msg.type === MessageType.Reply) {
    const repliedToMessage = await msg.channel.messages.fetch(
      msg.reference.messageId
    );
    msgChain.push(repliedToMessage);
    await getReplyChain(repliedToMessage, msgChain);
  }

  return msgChain;
};

const formatMessagesAsChat = (msgChain) => {
  const list = msgChain.reverse();
  return list.map((el) => ({
    msg: getTextMessageContent(el),
    username: el.author.username,
  }));
};

export class GptCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "gpt";
    // this.rateLimiter = new CustomRateLimiter(
    //   "GPT",
    //   1,
    //   S_MS * H_M_S * 15,
    //   [],
    //   false
    // );
    this.guilds = [
      // ts
      "1061909810943115337",
      // peko
      "683140640166510717",
      // DDF
      "533314828308054016",
      // miko
      "584977240358518784",
    ];
    this.allowedChannels = [
      "1098366878382031000", // ts, peko consulting,
      "1070086039445717124", // ts, testing ground
      "1063492591716405278", // peko testing ground
      "921428703865630800", // DDF redacted
      "1098913878445920306", // DDF consulting
      "1098929695724146819", // miko ticket
    ];
    this.consultingChanels = [
      "1098366878382031000", // peko consulting,
      "1098913878445920306", // DDF consulting,
    ];
  }
  async execute(msg) {
    const repliedToMessage = msg.reference
      ? await msg.channel.messages.fetch(msg.reference.messageId)
      : undefined;
    let shouldReply = false;
    if (repliedToMessage && repliedToMessage.author.username === "peko-bot") {
      shouldReply = true;
    }
    if (
      msg.content.indexOf("~gpt") === 0 ||
      this.consultingChanels.some((ch) => {
        return `${msg.channel.id}` === `${ch}`;
      })
    ) {
      shouldReply = true;
    }
    if (!shouldReply) {
      console.log(
        `gpt, ignoring (${msg.content} at ${msg.channel.name}, ${msg.guild.name})`
      );
      return;
    }
    if (!(await this.rateLimitPass(msg, "sharedHandle"))) {
      return;
    }

    const replyChain = await getReplyChain(msg);
    const msgList = formatMessagesAsChat(replyChain);

    const gptPrompt = formChainGPTPrompt(msgList);

    if (gptPrompt.length > 0) {
      msg.channel.sendTyping().catch((e) => {
        console.error(`Couldn't send typing: ${e}`);
      });

      gpt(gptPrompt, GPT_SYSTEM_MESSAGE(msg))
        .then((data) => {
          const response = data.text;
          if (response) {
            return reply(msg, response, undefined, false, false);
          }
          return Promise.resolve();
        })
        .catch((e) => {
          console.error(
            `Couldn't GPT reply ${msg.content} in ${msg.channel}: ${e}`
          );
          return reply(
            msg,
            `Beep boop, couldn't reply.. Likely my GPT capacity was overloaded! Please try again peko!`,
            undefined,
            false,
            false
          ).catch((e) => {
            console.error(`Couldn't reply with a GPT error: ${e}`);
          });
        });
    }
  }
  commandMatch() {
    return true;
  }
}
