import { AbstractCommand } from "../abstractCommand.js";
import { gptMood, gptReaction } from "../../utils/openaiUtils.js";
import extractUrls from "extract-urls";
import { PEKO_SERVER, TEST_SERVER } from "../../utils/ids/guilds.js";
import { PROHIBITED_RNG_CHANNELS } from "../../utils/ids/channels.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";

export const messageMoods = {
  joke: [
    "<:PekoWheeze:1085512844541440000>",
    "<:PekoPrankStare:892820347232067615>",
  ],
  smug: [
    "<:PekomonNousagiDoya:890383978828271648>",
    "<:PekoPrankStare:892820347232067615>",
    "<:PekoHehSmug:1008006386451497080>",
  ],
  happy: [
    "<:PekoYaySupport:1015010669709492254>",
    "<:PekoYayCheer:683470634806018089>",
  ],
  anger: ["<:PekoPout:722170844473982986>", "<:PekoDerp:709152458978492477>"],
  shock: ["<:pek:775493108154236938>", "<:PekoDerp:709152458978492477>"],
  sad: ["<:PekoSad:745275854304837632>", "<:PekoDerp:709152458978492477>"],
  disappoint: ["<:PekoDerp:709152458978492477>"],
  scare: ["<:PekoScaryStare:683467489925267472>"],
  love: ["<:PekoKyaaa:749644030962565171>"],
};
export const moodsReacts = {
  laugh: [
    "<:PekoWheeze:1085512844541440000>",
    "<:PekoPrankStare:892820347232067615>",
  ],
  smug: [
    "<:PekomonNousagiDoya:890383978828271648>",
    "<:PekoPrankStare:892820347232067615>",
    "<:PekoHehSmug:1008006386451497080>",
  ],
  happy: [
    "<:PekoYaySupport:1015010669709492254>",
    "<:PekoYayCheer:683470634806018089>",
  ],
  anger: ["<:PekoPout:722170844473982986>", "<:PekoDerp:709152458978492477>"],
  shock: ["<:pek:775493108154236938>", "<:PekoDerp:709152458978492477>"],
  sad: ["<:PekoSad:745275854304837632>", "<:PekoDerp:709152458978492477>"],
  disappointed: ["<:PekoDerp:709152458978492477>"],
  scared: ["<:PekoScaryStare:683467489925267472>"],
  blush: ["<:PekoKyaaa:749644030962565171>"],
  love: ["<:PekoKyaaa:749644030962565171>"],
};
export const actionsReacts = {
  "wake up": [
    "<:PekoTiredSleepy:790657629902209076>",
    "<:PekoAwake:730919165740974141>",
    "<:PekoAwakeDokiDoki:922668515390025798>",
  ],
  sleep: [
    "<:PekoSleepZzz1:899468713508610098>",
    "<:PekoSleepZzz2:899468728666845214>",
  ],
  ok: ["<:PekoCoolOkay:717826022808092874>"],
  no: ["<:PekoNo:1084473460572561418>"],
  hi: ["<:PekoGreetKonichiwa:826481264466329630>"],
  shrug: ["<:PekoShrug:819720198692798484>"],
};

export class ReactCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "react";
    this.guilds = [TEST_SERVER, PEKO_SERVER];
    this.probability = 0.005;
    this.prohibitedChannels = PROHIBITED_RNG_CHANNELS;
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
    // this.channels = ["1070086039445717124", "1063492591716405278"];
  }
  async execute(msg, discordClient, reactMood = false) {
    const reacts = moodsReacts;
    const actions = actionsReacts;
    const reactData = Object.entries(reacts || {});
    const actionsData = Object.entries(actions || {});
    const moodsData = Object.entries(messageMoods || {});

    return gptReaction(
      msg.content,
      (reactMood ? reactData : moodsData).map((el) => el[0]),
      reactMood
    )
      .then((result) => {
        const text = result?.text;
        console.log(`Action result: ${text}`);
        if (text && !text.toLowerCase().includes("other")) {
          actionsData.some(([mood, emotes]) => {
            if (text && text.toLowerCase().includes(mood)) {
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
        } else {
          return gptMood(
            msg.content,
            reactData.map((el) => el[0]),
            reactMood
          ).then((result) => {
            console.log(`Mood result: ${result?.text}`);
            reactData.some(([mood, emotes]) => {
              if (result?.text && result?.text.toLowerCase().includes(mood)) {
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
          });
        }
      })
      .catch((e) => {
        console.error(`Couldn't determine the message mood: ${e}`);
      });
  }
  async commandMatch(msg) {
    const reacts = moodsReacts[msg.guild.id];
    const actions = actionsReacts[msg.guild.id];
    if (!reacts && !actions) {
      return false;
    }
    const text = msg.content;
    const urls = extractUrls(text);
    return (!urls || urls.length === 0) && text.indexOf("~") !== 0;
  }
}
