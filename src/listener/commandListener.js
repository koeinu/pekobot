import { DeeplCommand } from "./commands/deeplCommand.js";
import { PekCommand } from "./commands/pekCommand.js";
import { LinkFilterCommand } from "./commands/linkFilterCommand.js";
import { RelayMessageCommand } from "./commands/relayMessageCommand.js";
import { HaikuCommand } from "./commands/haikuCommand.js";
import { ReactCommand } from "./commands/reactCommand.js";
import { StreakCommand } from "./commands/streakCommand.js";
import { CatchPoemCommand } from "./commands/catchPoemCommand.js";
import { GptCommand } from "./commands/gptCommand.js";
import { GptlCommand } from "./commands/gptlCommand.js";
import { SameReactCommand } from "./commands/sameReactCommand.js";
import { BotMentionedCommand } from "./commands/botMentionedCommand.js";
import { ModerateCommand } from "./commands/moderateCommand.js";
import { formatTLText, getMsgInfo } from "../utils/stringUtils.js";
import { CreatorMentionedCommand } from "./commands/creatorMentionedCommand.js";
import { ApiUtils } from "../utils/apiUtils.js";
import { sendToChannels, sleep } from "../utils/discordUtils.js";
import extractUrls from "extract-urls";
import {
  catchingPoem,
  stopCatchingTweets,
  TWITTER_RELAY_DATA,
} from "../utils/twitterUtils.js";

const obtainedMessages = [];

export class CommandListener {
  constructor(client, settings) {
    this.settings = settings;
    this.commands = [
      new CreatorMentionedCommand(settings), // ...
      new LinkFilterCommand(settings), // top priority, intercepts
      new RelayMessageCommand(settings), // high priority, intercepts
      new GptlCommand(settings), // intercepts
      new DeeplCommand(settings), // intercepts
      new GptCommand(settings), // intercepts
      new ModerateCommand(settings), // doesn't intercept
      new CatchPoemCommand(settings), // intercepts
      new StreakCommand(settings), // doesn't intercept
      new BotMentionedCommand(settings), // 35%, intercepts
      new PekCommand(settings), // 30% intercepts
      new SameReactCommand(settings), // 1% intercepts
      new ReactCommand(settings), // 0.5% intercepts
      new HaikuCommand(settings), // 2%
    ];
    this.client = client;
  }
  async processMessage(msg) {
    if (msg.system || msg.author.bot) {
      if (obtainedMessages.includes(msg.id)) {
        return Promise.resolve();
      }
      obtainedMessages.push(msg.id);
      const urls = (extractUrls(msg.content) || []).filter((el) =>
        el.includes("twitter.com")
      );
      console.log(urls);
      if (urls.length > 0) {
        let url = urls[0].split(")")[0];
        // let's translate this tweet
        const userIds = url.match(
          /(?<=twitter.com\/)([a-zA-Z0-9]*)(?=\/status)/g
        );
        if (userIds && userIds[0]) {
          const relayData = TWITTER_RELAY_DATA.find(
            (el) => el.src === userIds[0]
          );
          if (relayData) {
            const isCatchingPoem = catchingPoem;
            let updatedMsg = msg;
            let i = 0;
            while (updatedMsg.embeds.length === 0 && i++ < 10) {
              await sleep(() => {}, 1000);
              updatedMsg = await updatedMsg.channel.messages.fetch(
                updatedMsg.id
              );
            }
            const parts = [];

            const embedContent = updatedMsg.embeds[0].description;
            if (embedContent && embedContent.length > 0) {
              parts.push(embedContent);
            }

            const textToTranslate =
              parts.length > 0 ? parts.join("\n") : updatedMsg.content;

            return ApiUtils.GetTranslation(
              textToTranslate,
              undefined,
              msg,
              this.settings,
              true
            ).then(async (tlData) => {
              if (tlData.translated && tlData.text) {
                const toSend = formatTLText(tlData.text, tlData.isGpt);
                await sendToChannels(
                  this.client,
                  `${relayData.src} tweeted!\n${url}\n${toSend}`,
                  relayData.feedIds
                );
                if (isCatchingPoem && relayData.poemIds.length > 0) {
                  stopCatchingTweets();
                  await sendToChannels(
                    this.client,
                    `${relayData.src} wrote a poem!\n${url}\n${toSend}`,
                    relayData.poemIds
                  );
                }
              }
              return Promise.resolve();
            });
          }
        }
      }
      return Promise.resolve();
    }

    let commandIntercepted = false;
    for (let command of this.commands) {
      if (commandIntercepted) {
        continue;
      }
      const match = await command.commandMatch(msg);
      if (match) {
        const processData = command.shouldProcessMsg(msg);
        if (processData.result) {
          if (!processData.silent) {
            console.log(`executing ${processData.reason}`);
          }
          commandIntercepted = commandIntercepted || command.intercept;
          await command.execute(msg, this.client).catch((e) => {
            console.error(
              `Couldn't execute command ${command.name} (${getMsgInfo(
                msg
              )}): ${e}`
            );
          });
        }
      }
    }
  }
  async processMessageUpdate(oldMsg, newMsg) {
    const msg = oldMsg;
    if (msg.system || msg.author.bot) {
      return Promise.resolve();
    }

    for (let command of this.commands) {
      const match = await command.commandMatch(msg);
      if (match) {
        const processData = command.shouldProcessMsg(msg);
        if (processData.result && command.executeUpdate) {
          console.log(`updating ${processData.reason}`);
          command.executeUpdate(oldMsg, newMsg, this.client).catch((e) => {
            console.error(
              `Couldn't execute update command ${command.name} (${getMsgInfo(
                msg
              )}): ${e}`
            );
          });
        }
      }
    }
  }
  async processMessageDelete(msg) {
    if (msg.system || msg.author.bot) {
      return Promise.resolve();
    }

    for (let command of this.commands) {
      const match = await command.commandMatch(msg);
      if (match) {
        const processData = command.shouldProcessMsg(msg);
        if (processData.result && command.executeDelete) {
          console.log(`deleting ${processData.reason}`);
          command.executeDelete(msg, this.client).catch((e) => {
            console.error(
              `Couldn't execute delete command ${command.name} for ${getMsgInfo(
                msg
              )}: ${e}`
            );
          });
        }
      }
    }
  }
}
