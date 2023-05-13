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
import { getMessage, getMsgInfo } from "../utils/stringUtils.js";
import { CreatorMentionedCommand } from "./commands/creatorMentionedCommand.js";

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
          console.log(`executing ${processData.reason}`);
          commandIntercepted = commandIntercepted || command.intercept;
          if (this.settings.inactive) {
            console.log("inactive mode, doing nothing");
            continue;
          }
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
          if (this.settings.inactive) {
            console.log("inactive mode, doing nothing");
            continue;
          }
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
          if (this.settings.inactive) {
            console.log("inactive mode, doing nothing");
            continue;
          }
          command.executeDelete(msg, this.client).catch((e) => {
            console.error(
              `Couldn't execute delete command ${command.name} for ${getMessage(
                msg
              )} in ${msg.channel.name}, ${msg.guild.name}: ${e}`
            );
          });
        }
      }
    }
  }
}
