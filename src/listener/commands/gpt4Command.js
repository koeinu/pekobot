import { MessageType } from "discord.js";
import { isFormattedTl } from "../../utils/stringUtils.js";
import {
  RP_CHANNELS,
  TEST_ASSISTANT,
  TEST_ENABLED_CHANNELS,
} from "../../utils/ids/channels.js";
import { GptCommand } from "./gptCommand.js";
import { ADMINS } from "../../utils/ids/users.js";
import { AlertUserMode, CustomRateLimiter } from "../../utils/rateLimiter.js";
import { H_M_S, S_MS } from "../../utils/constants.js";

export class Gpt4Command extends GptCommand {
  constructor(settings) {
    super(settings);
    this.completionSettings = { model: "gpt-4-1106-preview" };
    this.name = "gpt4";
    this.allowedChannels = [
      ...TEST_ENABLED_CHANNELS,
      ...RP_CHANNELS,
      TEST_ASSISTANT,
    ];
    this.rateLimiter = new CustomRateLimiter(
      "GPT4",
      1,
      S_MS * H_M_S * 5,
      ["Mod", this.settings.name],
      [],
      AlertUserMode.Emote
    );
    this.consultingChanels = [...RP_CHANNELS];
    this.triggerUsers = ADMINS;
    this.intercept = true;
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
      msg.content.indexOf("~gpt4") === 0 ||
      this.consultingChanels.some((ch) => {
        return `${msg.channel.id}` === `${ch}`;
      })
    );
  }
}
