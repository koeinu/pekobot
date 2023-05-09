import { AbstractCommand } from "../abstractCommand.js";
import { gptMood, gptReaction } from "../../utils/openaiUtils.js";
import extractUrls from "extract-urls";
import {
  MIKO_SERVER,
  PEKO_SERVER,
  TEST_SERVER,
  TEST_SERVER_2,
} from "../../utils/ids/guilds.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";
import { getMsgInfo } from "../../utils/stringUtils.js";
import {
  MIKO_ALLOWED_CHANNELS,
  MIKO_TEST,
  PROHIBITED_RNG_CHANNELS,
  TESTING_2,
} from "../../utils/ids/channels.js";

export const MOODS_DATA = {};
MOODS_DATA[PEKO_SERVER] = {
  moods: {
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
  },
  moodsReacts: {
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
  },
  actions: {
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
  },
};
MOODS_DATA[MIKO_SERVER] = {
  moods: {
    joke: ["<:MikoLaugh:752940509088973070>"],
    smug: ["<:CMikoSmug2:796990042894630963>"],
    happy: ["<:dMikoHappy:756202823842267337>"],
    anger: ["<:MikoStare:894980081666129951>"],
    shock: ["<:fMikoShocked:925789799619641404>"],
    sad: ["<:MikoSad:602387449263554593>"],
    disappoint: ["<:MikoDisappointed2:910551501934583918>"],
    scare: ["(<:MikoSpooked:619303815895580672>"],
    love: ["<:MikoLove:1042078964321099897>"],
  },
  moodsReacts: {
    laugh: ["<:MikoWheeze2:929026384993615874>"],
    smug: ["<:MikoProudSmug:869942608221319178>"],
    happy: ["<:MikoYAAY:842784472948408349>"],
    anger: ["<:FAQ:727196984951439380>"],
    shock: ["<:MikoWTF:840266812041461780>"],
    sad: ["<:MikoSad2:959436316888666153>"],
    disappointed: ["<:MikoDisappointed:959436345275727872>"],
    scared: ["<:MikoSpooked:619303815895580672>"],
    blush: ["<:MikooAo2:815557810929795074>"],
    love: ["<:MikooAo2:815557810929795074>"],
  },
  actions: {
    "wake up": [],
    sleep: ["<:MikoSleep:748584468331102269>"],
    ok: ["<:MikoApprob:821442006454108240>"],
    no: [],
    hi: ["<:MikoSalute:749277748777844788>"],
    shrug: [],
  },
};
MOODS_DATA[TEST_SERVER] = MOODS_DATA[PEKO_SERVER];
MOODS_DATA[TEST_SERVER_2] = MOODS_DATA[MIKO_SERVER];

export class ReactCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "react";
    this.probability = 0.005;
    this.prohibitedChannels = PROHIBITED_RNG_CHANNELS;
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
    this.allowedChannels = [MIKO_TEST, TESTING_2, ...MIKO_ALLOWED_CHANNELS];
  }
  async execute(msg, discordClient, reactMood = false) {
    const guildId = msg.guild.id;
    console.log(`data: `, MOODS_DATA);
    console.log(`guildId: `, guildId);
    const guildMoodData = MOODS_DATA[guildId] || MOODS_DATA[PEKO_SERVER];
    console.log(`found data: `, guildMoodData);
    const moodsData = Object.entries(guildMoodData.moods || {});
    const reactData = Object.entries(guildMoodData.moodsReacts || {});
    const actionsData = Object.entries(guildMoodData.actions || {});

    if (
      moodsData.length === 0 ||
      reactData.length === 0 ||
      actionsData.length === 0
    ) {
      return Promise.resolve();
    }

    return gptReaction(
      msg.content,
      actionsData.map((el) => el[0]),
      reactMood
    )
      .then((result) => {
        const text = result?.text;
        console.log(`Action result: ${text}`);
        if (text && !text.toLowerCase().includes("other")) {
          actionsData.some(([action, emotes]) => {
            if (text && text.toLowerCase().includes(action)) {
              console.warn(
                `${this.name} triggered, ${getMsgInfo(msg)}, action: ${action}`
              );
              const randomEmote =
                emotes[Math.floor(Math.random() * emotes.length)];
              console.log(`reacting with: ${randomEmote}`);
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
            (reactMood ? reactData : moodsData).map((el) => el[0]),
            reactMood
          ).then((result) => {
            console.log(`Mood result: ${result?.text}`);
            reactData.some(([mood, emotes]) => {
              if (result?.text && result?.text.toLowerCase().includes(mood)) {
                console.warn(
                  `${this.name} triggered, ${getMsgInfo(msg)}, mood: ${mood}`
                );
                const randomEmote =
                  emotes[Math.floor(Math.random() * emotes.length)];
                console.log(`reacting with: ${randomEmote}`);
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
    const text = msg.content;
    const urls = extractUrls(text);
    return (!urls || urls.length === 0) && text.indexOf("~") !== 0;
  }
}
