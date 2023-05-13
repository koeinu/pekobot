import { AbstractCommand } from "../abstractCommand.js";
import { gptMood, gptReaction } from "../../utils/openaiUtils.js";
import extractUrls from "extract-urls";
import { PEKO_SERVER } from "../../utils/ids/guilds.js";
import {
  MIKO_ALLOWED_RNG_GPT,
  PEKO_ALLOWED_RNG,
} from "../../utils/ids/channels.js";
import { PROHIBITED_RNG_USERS } from "../../utils/ids/users.js";
import { getMsgInfo } from "../../utils/stringUtils.js";
import { MOODS_DATA } from "../../utils/moodsData.js";

export class ReactCommand extends AbstractCommand {
  constructor(settings) {
    super(settings);
    this.name = "react";
    this.allowedChannels = [...PEKO_ALLOWED_RNG, ...MIKO_ALLOWED_RNG_GPT];
    this.probability = 0.005;
    this.prohibitedUsers = PROHIBITED_RNG_USERS;
  }
  async execute(msg, discordClient, reactMood = false) {
    const guildId = msg.guild.id;
    const guildMoodData = MOODS_DATA[guildId] || MOODS_DATA[PEKO_SERVER];
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
      this.settings,
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
              if (this.settings.inactive) {
                console.log("react action inactive mode, doing nothing");
                return true;
              }
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
            this.settings,
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
                if (this.settings.inactive) {
                  console.log("react mood inactive mode, doing nothing");
                  return true;
                }
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
