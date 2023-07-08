import { MessageType } from "discord.js";
import { isFormattedTl } from "../../utils/stringUtils.js";
import {
  DDF_CONSULTING,
  RP_CHANNELS,
  TEST_ASSISTANT,
  TEST_ENABLED_CHANNELS,
} from "../../utils/ids/channels.js";
import { GptCommand } from "./gptCommand.js";

export class Gpt4Command extends GptCommand {
  constructor(settings) {
    super(settings);
    this.completionSettings = { model: "gpt-4" };
    this.name = "gpt4";
    this.allowedChannels = [
      ...TEST_ENABLED_CHANNELS,
      TEST_ASSISTANT,
      ...RP_CHANNELS,
    ];
    this.consultingChanels = [...RP_CHANNELS, TEST_ASSISTANT, DDF_CONSULTING];
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
