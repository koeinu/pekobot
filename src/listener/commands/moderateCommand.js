import { AbstractCommand } from "../abstractCommand.js";
import extractUrls from "extract-urls";
import { moderateMessage } from "../../utils/openaiUtils.js";
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
      .then((triggerData) => {
        if (triggerData && triggerData.flagged) {
          if (this.settings.inactive) {
            console.log("moderate inactive mode, doing nothing");
            return Promise.resolve();
          }
          return sendToChannels(
            discordClient,
            gatherModerateMessageInfo(msg, triggerData),
            this.channelsToSend
          );
        }
      })
      .catch((e) => {
        console.debug(`Couldn't moderate message ${msg.content}: ${e}`);
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
