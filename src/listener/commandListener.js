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
  constructor(client) {
    this.commands = [
      new CreatorMentionedCommand(), // ...
      new LinkFilterCommand(), // top priority, intercepts
      new RelayMessageCommand(), // high priority, intercepts
      new GptlCommand(), // intercepts
      new DeeplCommand(), // intercepts
      new GptCommand(), // intercepts
      new ModerateCommand(), // doesn't intercept
      new CatchPoemCommand(), // intercepts
      new StreakCommand(), // doesn't intercept
      new BotMentionedCommand(), // 35%, intercepts
      new PekCommand(), // 30% intercepts
      new SameReactCommand(), // 1% intercepts
      new ReactCommand(), // 0.5% intercepts
      new HaikuCommand(), // 2%
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
        console.log(`${processData.reason}`);
        if (processData.result) {
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
