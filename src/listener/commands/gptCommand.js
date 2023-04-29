import { AbstractCommand } from "../abstractCommand.js";

import {
  gpt,
  messageContextArray,
  serverRules,
} from "../../utils/openaiUtils.js";
import { MessageType } from "discord.js";
import {
  getTextMessageContent,
  formChainGPTPrompt,
} from "../../utils/stringUtils.js";
import { reply } from "../../utils/discordUtils.js";
import { H_M_S, S_MS } from "../../utils/constants.js";
import { CustomRateLimiter } from "../../utils/rateLimiter.js";
import {
  DDF_CONSULTING,
  TEST_ASSISTANT,
  TEST_RP,
} from "../../utils/ids/channels.js";
import {
  DDF_SERVER,
  PEKO_SERVER,
  TEST_SERVER, TEST_SERVER_2
} from "../../utils/ids/guilds.js";

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

const formatMessagesAsChat = async (msgChain, canOCR) => {
  const list = msgChain.reverse();
  return Promise.all(
    list.map(async (el) => ({
      msg: (await getTextMessageContent(el, canOCR)).text,
      username: el.author.username,
    }))
  );
};

export class GptCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "gpt";
    this.rateLimiter = new CustomRateLimiter(
      "GPT",
      1,
      S_MS * H_M_S * 4,
      ["Mod"],
      false
    );
    this.guilds = [
      // ts
      TEST_SERVER,
      TEST_SERVER_2,
      PEKO_SERVER,
      DDF_SERVER,
      // MIKO_SERVER,
    ];
    this.consultingChanels = [TEST_RP, TEST_ASSISTANT, DDF_CONSULTING];
    this.intercept = true;
  }
  async execute(msg) {
    if (!(await this.rateLimitPass(msg, "gptSharedHandle"))) {
      return;
    }
    const canOCR = this.rateLimitCheck(msg);

    const replyChain = await getReplyChain(msg);
    const msgList = await formatMessagesAsChat(replyChain, canOCR);

    const gptPrompt = await formChainGPTPrompt(
      msgList,
      msg.guild.id === TEST_SERVER && msg.channel.id !== TEST_ASSISTANT
    );

    if (gptPrompt.length > 0) {
      msg.channel.sendTyping().catch((e) => {
        console.error(`Couldn't send typing: ${e}`);
      });

      return gpt(
        [messageContextArray(msg), serverRules(msg), gptPrompt].join("\n"),
        ""
      )
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
  async commandMatch(msg) {
    const repliedToMessage = msg.reference
      ? await msg.channel.messages.fetch(msg.reference.messageId)
      : undefined;
    if (repliedToMessage && repliedToMessage.author.username === "peko-bot") {
      return true;
    }
    if (
      msg.content.indexOf("~gpt") === 0 ||
      this.consultingChanels.some((ch) => {
        return `${msg.channel.id}` === `${ch}`;
      })
    ) {
      return true;
    }
    return false;
  }
}
