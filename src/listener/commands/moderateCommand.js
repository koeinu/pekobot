import { AbstractCommand } from "../abstractCommand.js";
import extractUrls from "extract-urls";
import { MOD_THRESHOLDS, moderateMessage } from "../../utils/openaiUtils.js";
import { PEKO_MOD } from "../../utils/ids/channels.js";

import { PEKO_SERVER } from "../../utils/ids/guilds.js";

const sendToChannels = async (discordClient, text, channels) => {
  const foundChannels = channels
    .reduce((array, channelToSend) => {
      const fc = discordClient.channels.cache.filter(
        (el) => el.id === channelToSend
      );
      array.push(...fc);
      return array;
    }, [])
    .map((el) => el[1]);

  foundChannels.forEach((channel) => {
    channel
      .send(text)
      .then((msg) => {
        console.log("ok!");
        msg.react("☑️").catch((e) => {
          console.error(`Couldn't react: ${e}`);
        });
      })
      .catch((e) => {
        console.error(`Couldn't send text to ${channel.name}, ${e}`);
      });
  });
};

const gatherMessageInfo = (msg, triggerData) => {
  const parts = [];
  parts.push(`${msg.url}`);
  parts.push(
    `Reasons: ${Object.entries(triggerData.categories)
      .filter((el) => el[1])
      .map((el) => {
        const category = el[0];
        return `${category}: ${triggerData.category_scores[category]} > ${MOD_THRESHOLDS[category]}`;
      })
      .join(", ")}`
  );
  parts.push(`Content: ${msg.content}`);
  return parts.join("\n");
};

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
            gatherMessageInfo(msg, triggerData),
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
