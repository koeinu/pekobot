import { AbstractCommand } from "../abstractCommand.js";
import { prohibitedRNGChannels, prohibitedRNGUsers } from "./prohibitedRNG.js";
import { gptMood } from "../../utils/openaiUtils.js";
import extractUrls from "extract-urls";

const moodsReacts = {
  "1061909810943115337": {
    funny: [
      "<:PekoWheeze:1085512844541440000>",
      "<:PekomonNousagiDoya:890383978828271648>",
      "<:PekoPrankStare:892820347232067615>",
    ],
    smug: [
      "<:PekoPrankStare:892820347232067615>",
      "<:PekoHehSmug:1008006386451497080>",
    ],
    happy: [
      "<:PekoYaySupport:1015010669709492254>",
      "<:PekoYayCheer:683470634806018089>",
    ],
    irritated: ["<:PekoPout:722170844473982986>"],
    shock: ["<:pek:775493108154236938>"],
    sad: ["<:PekoSad:745275854304837632>"],
    disappointed: ["<:PekoDerp:709152458978492477>"],
    scared: ["<:PekoScaryStare:683467489925267472>"],
    ironic: [
      "<:PekomonNousagiDoya:890383978828271648>",
      "<:PekoPrankStare:892820347232067615>",
    ],
  },
};

export class ReactCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "react";
    this.guilds = [
      // ts
      "1061909810943115337",
      // peko
      "683140640166510717",
    ];
    this.probability = 0.01;
    this.prohibitedChannels = prohibitedRNGChannels;
    this.prohibitedUsers = prohibitedRNGUsers;
    this.channels = ["1070086039445717124"];
  }
  async execute(msg, discordClient, reactMood = false) {
    console.log(
      `Reacting! ${msg.content} in ${msg.channel.name}, ${msg.guild.name}`
    );
    const reacts = moodsReacts[msg.guild.id];
    if (!reacts) {
      return;
    }
    const reactData = Object.entries(reacts);
    gptMood(
      msg.content,
      reactData.map((el) => el[0]),
      reactMood
    )
      .then((result) => {
        console.log(`Mood result: ${result.text}`);
        reactData.some(([mood, emotes]) => {
          if (
            result &&
            result.text &&
            result.text.toLowerCase().includes(mood)
          ) {
            const randomEmote =
              emotes[Math.floor(Math.random() * emotes.length)];
            if (randomEmote) {
              msg.react(randomEmote).catch(async (e) => {
                console.error(`Couldn't React: ${e}`);
              });
            }
            return true;
          } else {
            return false;
          }
        });
      })
      .catch((e) => {
        console.error(`Couldn't determine the message mood: ${e}`);
      });
  }
  commandMatch(text) {
    const urls = extractUrls(text);
    return !urls || urls.length === 0;
  }
}
