import { AbstractCommand } from "../abstractCommand.js";

import {
  gpt,
  messageContextArray,
  serverRules,
} from "../../utils/openaiUtils.js";
import { MessageType } from "discord.js";
import {
  formChainGPTPrompt,
  isFormattedTl,
  getMsgInfo,
  getGptMessagesContents,
  getGptReplyChain,
  splitGptDialogues,
} from "../../utils/stringUtils.js";
import { fetchMessages, reply } from "../../utils/discordUtils.js";
import { FETCH_CHUNK, H_M_S, S_MS } from "../../utils/constants.js";
import { AlertUserMode, CustomRateLimiter } from "../../utils/rateLimiter.js";
import {
  DDF_CONSULTING,
  MIKO_ALLOWED_RNG_GPT,
  MIKO_BOT_SPAM_CHANNEL,
  MIKODANYE_CHANNEL,
  PEKO_ALLOWED_GPT,
  PEKO_GPT,
  PEKO_GPT_OK_CHANNEL,
  RP_CHANNELS,
  TEST_ASSISTANT,
  TEST_ENABLED_CHANNELS,
  TEST_GPT_OK_CHANNEL,
  TEST_USUAL_PEKO_GPT,
} from "../../utils/ids/channels.js";
import { BANNED_USERS } from "../../utils/ids/users.js";

export class GptCommand extends AbstractCommand {
  constructor(settings) {
    super(settings);
    this.completionSettings = undefined;
    this.name = "gpt";
    this.rateLimiter = new CustomRateLimiter(
      "GPT",
      1,
      S_MS * H_M_S * 3,
      ["Mod", this.settings.name],
      [PEKO_GPT_OK_CHANNEL, TEST_GPT_OK_CHANNEL, MIKODANYE_CHANNEL],
      AlertUserMode.Emote
    );
    this.allowedChannels = [
      ...MIKO_ALLOWED_RNG_GPT,
      ...PEKO_ALLOWED_GPT,
      ...TEST_ENABLED_CHANNELS,
      ...RP_CHANNELS,
      MIKO_BOT_SPAM_CHANNEL,
      MIKODANYE_CHANNEL,
    ];
    this.consultingChanels = [
      ...RP_CHANNELS,
      TEST_ASSISTANT,
      DDF_CONSULTING,
      TEST_USUAL_PEKO_GPT,
      PEKO_GPT,
    ];
    this.intercept = true;
    this.bannedUsers = BANNED_USERS;
  }
  async execute(msg) {
    const rpMode = RP_CHANNELS.includes(msg.channel.id);
    const rpSettings =
      rpMode && this.settings.extendedRp
        ? this.settings.extendedRp[msg.channel.name]
        : undefined;
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
    }
    console.warn(`${this.name} triggered, ${getMsgInfo(msg)}`);

    if (!(await this.rateLimitCheck(msg, undefined, false))) {
      return Promise.resolve();
    }

    const replyChain = rpSettings
      ? splitGptDialogues(
          (
            await fetchMessages(msg.channel, undefined, undefined, FETCH_CHUNK)
          ).reverse()
        )
      : await getGptReplyChain(msg);
    const msgList = (await getGptMessagesContents(replyChain)).filter(
      (el) => el.msg && el.msg.length > 0
    );

    const gptPrompt = await formChainGPTPrompt(
      msgList,
      this.settings,
      rpSettings
    );

    if (gptPrompt.length > 0) {
      msg.channel.sendTyping().catch((e) => {
        console.error(`Couldn't send typing: ${e}`);
      });

      return gpt(
        [
          messageContextArray(msg, this.settings),
          serverRules(msg, this.settings),
          gptPrompt,
        ].join("\n"),
        this.settings,
        "",
        this.completionSettings
      )
        .then(async (data) => {
          const response = data.text;
          if (response) {
            if (this.settings.inactive) {
              console.log("gpt inactive mode, doing nothing", response);
              return Promise.resolve();
            }
            if (!(await this.rateLimitPass(msg))) {
              return Promise.resolve();
            }
            let finalResponse = response;
            if (this.settings.name.toLowerCase().includes("mikodanye")) {
              finalResponse = response.replace(
                /(([\[:<])+)([Mm])ikostare(([\]:>])+)/g,
                "<:Mikodanye:871396980243451944>"
              );
              finalResponse = finalResponse.replace(/\bnya+\b/g, "nye");
            }
            return reply(msg, finalResponse, undefined, false, false);
          }
          return Promise.resolve();
        })
        .catch((e) => {
          console.error(
            `Couldn't GPT reply ${msg.content} in ${msg.channel}: ${e}`
          );
          if (this.settings.inactive) {
            console.log("gpt error inactive mode, doing nothing");
            return Promise.resolve();
          }
          return reply(
            msg,
            `Beep boop, couldn't reply.. Likely my GPT capacity was overloaded! Please try again!`,
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
    if (
      repliedToMessage &&
      repliedToMessage.author.username === this.settings.name
    ) {
      return !(
        // (repliedToMessage.embeds && repliedToMessage.embeds.length > 0) ||
        isFormattedTl(repliedToMessage.content)
      );
    }
    return (
      msg.content.indexOf("~gpt") === 0 ||
      this.consultingChanels.some((ch) => {
        return `${msg.channel.id}` === `${ch}`;
      })
    );
  }
}
