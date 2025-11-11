import { AbstractCommand } from "../abstractCommand.js";
import extractUrls from "extract-urls";
import { moderateMessage } from "../../utils/langchain/moderation.js";
import { PEKO_MOD } from "../../utils/ids/channels.js";

import { PEKO_SERVER } from "../../utils/ids/guilds.js";
import { sendToChannels } from "../../utils/discordUtils.js";
import { gatherModerateMessageInfo } from "../../utils/stringUtils.js";

export class ModerateCommand extends AbstractCommand {
  constructor(settings) {
    super(settings);
    this.name = "moderate";
    this.allowedGuilds = [PEKO_SERVER];
    this.channelsToSend = [PEKO_MOD];
  }
  async execute(msg, discordClient) {
    return moderateMessage(msg)
      .then(() => {
        return Promise.resolve();
      })
      .catch((e) => {
        if (e.message.indexOf("violates OpenAI") >= 0) {
          return sendToChannels(
            discordClient,
            gatherModerateMessageInfo(msg),
            this.channelsToSend
          );
        }
      });
  }
  async commandMatch(msg) {
    const text = msg.content;
    const emojiPattern = /^<:\w+:\d+>$/;
    const urls = extractUrls(text);
    return (
      (!urls || urls.length === 0 || urls[0].length !== text.trim().length) &&
      !emojiPattern.test(text)
    );
  }
}
