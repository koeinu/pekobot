import { AbstractCommand } from "../abstractCommand.js";

import {
  botName,
  gpt,
  messageContextArray,
  serverRules,
} from "../../utils/openaiUtils.js";
import { MessageType } from "discord.js";
import {
  getTextMessageContent,
  formChainGPTPrompt,
} from "../../utils/stringUtils.js";
import { fetchMessages, reply } from "../../utils/discordUtils.js";
import { H_M_S, S_MS } from "../../utils/constants.js";
import { CustomRateLimiter } from "../../utils/rateLimiter.js";
import {
  DDF_CONSULTING,
  PEKO_STREAM,
  RP_CHANNELS,
  TEST_ANOTHER_TEST_CHANNEL,
  TEST_ASSISTANT,
  TEST_USUAL_PEKO_GPT,
} from "../../utils/ids/channels.js";
import {
  DDF_SERVER,
  PEKO_SERVER,
  TEST_SERVER,
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

const splitMessages = (msgChain) => {
  const result = [];
  msgChain.some((msg) => {
    if (msg.content === "---") {
      return true;
    } else {
      if (msg.content !== "~") {
        result.push(msg);
      }
      return false;
    }
  });
  return result;
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
      TEST_SERVER,
      // TEST_SERVER_2,
      PEKO_SERVER,
      DDF_SERVER,
      // MIKO_SERVER,
    ];
    this.consultingChanels = [
      ...RP_CHANNELS,
      TEST_ASSISTANT,
      DDF_CONSULTING,
      TEST_USUAL_PEKO_GPT,
    ];
    this.prohibitedChannels = [PEKO_STREAM, TEST_ANOTHER_TEST_CHANNEL];
    this.intercept = true;
  }
  async execute(msg) {
    const rpMode = RP_CHANNELS.includes(msg.channel.id);
    if (rpMode) {
      if (msg.content === "---") {
        return Promise.resolve();
      } else if (msg.content === "~") {
        const lastMessages = await msg.channel.messages.fetch({ limit: 2 });
        lastMessages
          .first()
          .delete()
          .catch((e) => {
            console.error(
              `Couldn't delete ${lastMessages.first().content}, ${e}`
            );
          });
        msg = lastMessages.last();
      } else if (msg.content === "<") {
        const lastMessages = await msg.channel.messages.fetch({ limit: 2 });
        lastMessages.forEach((m) => {
          m.delete().catch((e) => {
            console.error(`Couldn't delete ${m.content}, ${e}`);
          });
        });
        return Promise.resolve();
      }
      if (!(await this.rateLimitPass(msg, "gptSharedHandle"))) {
        return Promise.resolve();
      }
    }
    const canOCR = this.rateLimitCheck(msg);

    const replyChain = rpMode
      ? splitMessages(
          (await fetchMessages(msg.channel, undefined, undefined, 50)).reverse()
        )
      : await getReplyChain(msg);
    const msgList = await formatMessagesAsChat(replyChain, canOCR);

    const gptPrompt = await formChainGPTPrompt(msgList, rpMode);

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
    if (repliedToMessage && repliedToMessage.author.username === botName) {
      return true;
    }
    return (
      msg.content.indexOf("~gpt") === 0 ||
      this.consultingChanels.some((ch) => {
        return `${msg.channel.id}` === `${ch}`;
      })
    );
  }
}
