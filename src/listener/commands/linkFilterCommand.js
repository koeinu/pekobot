import { AbstractCommand } from "../abstractCommand.js";
import extractUrls from "extract-urls";
import { replyEmbedMessage } from "../../utils/discordUtils.js";

import { listBans } from "../../model/youtube.js";

import { getYoutubeChannelId } from "../../utils/youtubeUtils.js";
import { PEKO_SERVER } from "../../utils/ids/guilds.js";
import { getMsgInfo } from "../../utils/stringUtils.js";

const DELETE_MESSAGE_TIMEOUT = 2000; //ms

export class LinkFilterCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "linkFilter";
    this.allowedGuilds = [PEKO_SERVER];
    this.intercept = false;
  }
  async execute(msg) {
    const text = msg.content;
    const urlsToCheck = extractUrls(text);
    const bans = listBans();
    for (let i = 0; i < urlsToCheck.length; i++) {
      const url = urlsToCheck[i];
      if (url.includes("youtube") || url.includes("youtu.be")) {
        const channelId = await getYoutubeChannelId(url);
        const bannedKey = Object.keys(bans).find((el) => el === channelId);
        if (bannedKey) {
          console.error(`${this.name} triggered, ${getMsgInfo(msg)}`);
          if (this.settings.inactive) {
            console.log("linkFilter inactive mode, doing nothing");
            return Promise.resolve();
          }
          return replyEmbedMessage(
            msg,
            `This link is not allowed on this server.\n\nReason: ${bans[bannedKey]}`
          )
            .catch((e) => {
              console.error(`Couldn't reply with link filter: ${e}`);
            })
            .finally(() => {
              setTimeout(() => {
                msg.delete().catch((e) => {
                  console.error(`Couldn't delete a filtered link: ${e}`);
                });
              }, DELETE_MESSAGE_TIMEOUT);
            });
        }
      }
    }
  }
  async commandMatch(msg) {
    const text = msg.content;
    const urls = extractUrls(text);
    return urls ? urls.length > 0 : false;
  }
}
