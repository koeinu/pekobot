import { AbstractCommand } from "../abstractCommand.js";
import extractUrls from "extract-urls";
import { MOD_THRESHOLDS, moderateMessage } from "../../utils/openaiUtils.js";

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
  constructor() {
    super();
    this.name = "moderate";
    this.guilds = [
      // "1061909810943115337", // ts
      "683140640166510717", // peko
    ];
    this.channelsToSend = ["1100568255837524079", "1100569163220652092"];
  }
  async execute(msg, discordClient) {
    console.log(
      `moderating ${msg.content} at ${msg.channel.name}, ${msg.guild.name}`
    );

    moderateMessage(msg)
      .then((triggerData) => {
        if (triggerData && triggerData.flagged) {
          sendToChannels(
            discordClient,
            gatherMessageInfo(msg, triggerData),
            this.channelsToSend
          );
        }
      })
      .catch((e) => {
        console.error(`Couldn't moderate message ${msg.content}: ${e}`);
      });
  }
  commandMatch(text) {
    const emojiPattern = /^<:\w+:\d+>$/;
    const urls = extractUrls(text);
    return (
      (!urls || urls.length === 0 || urls[0].length !== text.trim().length) &&
      !emojiPattern.test(text)
    );
  }
}
