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

export class CommandListener {
  constructor(client) {
    this.commands = [
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
    let commandIntercepted = false;
    for (let command of this.commands) {
      if (commandIntercepted) {
        continue;
      }
      const match = await command.commandMatch(msg);
      if (match) {
        const processData = this.shouldProcessMsg(msg, command);
        console.log(`${processData.reason}`);
        if (processData.result) {
          commandIntercepted = commandIntercepted || command.intercept;
          await command.execute(msg, this.client).catch((e) => {
            console.error(
              `Couldn't execute command ${command.name} (${this.getMsgInfo(
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
    for (let command of this.commands) {
      const match = await command.commandMatch(msg);
      if (match) {
        const processData = this.shouldProcessMsg(msg, command);
        if (processData.result && command.executeUpdate) {
          console.log(`updating ${processData.reason}`);
          command.executeUpdate(oldMsg, newMsg, this.client).catch((e) => {
            console.error(
              `Couldn't execute update command ${
                command.name
              } (${this.getMsgInfo(msg)}): ${e}`
            );
          });
        }
      }
    }
  }
  async processMessageDelete(msg) {
    for (let command of this.commands) {
      const match = await command.commandMatch(msg);
      if (match) {
        const processData = this.shouldProcessMsg(msg, command);
        if (processData.result && command.executeDelete) {
          console.log(`deleting ${processData.reason}`);
          command.executeDelete(msg, this.client).catch((e) => {
            console.error(
              `Couldn't execute delete command ${
                command.name
              } for ${this.getMessage(msg)} in ${msg.channel.name}, ${
                msg.guild.name
              }: ${e}`
            );
          });
        }
      }
    }
  }

  getMessage(msg) {
    if (msg.content && msg.content.length > 0) {
      return msg.content;
    }
    if (msg.embeds.length > 0) {
      return msg.embeds[0].data.description;
    }
    return "<empty>";
  }

  getMsgInfo(msg) {
    return `msg: ${this.getMessage(msg)} in ${msg.channel.name}, ${
      msg.guild.name
    } (${msg.url})`;
  }

  shouldProcessMsg(msg, command) {
    // do not respond to system messages and to other bots
    if (msg.system || msg.author.bot) {
      return {
        result: false,
        reason: `${command.name}, ignoring bot/system msg (${this.getMsgInfo(
          msg
        )})`,
      };
    }

    if (command.triggerUsers) {
      if (command.triggerUsers.some((el) => el === msg.author.id)) {
        return {
          result: true,
          reason: `${command.name}, triggered by user ${
            msg.author.username
          } (${this.getMsgInfo(msg)})`,
        };
      }
    }

    // check if user can trigger a command
    if (command.prohibitedUsers) {
      if (command.prohibitedUsers.some((el) => el === msg.author.id)) {
        return {
          result: false,
          reason: `${command.name}, ignoring prohibited user ${
            msg.author.username
          } (${this.getMsgInfo(msg)})`,
        };
      }
    }
    if (command.bannedUsers) {
      if (command.bannedUsers.some((el) => el === msg.author.id)) {
        return {
          result: false,
          reason: `${command.name}, ignoring banned user ${
            msg.author.username
          } (${this.getMsgInfo(msg)})`,
        };
      }
    }
    // check if guild is allowed
    if (command.guilds) {
      const result = command.guilds.some((g) => {
        return `${msg.guild.id}` === `${g}`;
      });
      if (!result) {
        return {
          result: false,
          reason: `${command.name}, guild filtered: ${
            command.guilds
          } (${this.getMsgInfo(msg)})`,
        };
      }
    }
    // check if channel is phohibited
    if (command.prohibitedChannels) {
      const result = command.prohibitedChannels.some((ch) => {
        return `${msg.channel.id}` === `${ch}`;
      });
      if (result) {
        return {
          result: false,
          reason: `${command.name} -> prohibited channel filtered: ${
            command.prohibitedChannels
          } (${this.getMsgInfo(msg)})`,
        };
      }
    }
    // check if channel is allowed
    if (command.allowedChannels) {
      const result = command.allowedChannels.some((g) => {
        return `${msg.channel.id}` === `${g}`;
      });
      if (!result) {
        return {
          result: false,
          reason: `${command.name}, channel filtered: ${
            command.allowedChannels
          } (${this.getMsgInfo(msg)})`,
        };
      }
    }

    // ALWAYS triggering in these channels
    if (command.channels) {
      const result = command.channels.some((ch) => {
        return `${msg.channel.id}` === `${ch}`;
      });
      if (result) {
        return {
          result: true,
          reason: `${command.name}, channel OK: ${
            command.channels
          } (${this.getMsgInfo(msg)})`,
        };
      }
    }

    // not matched in always-triggered channels, may be triggered by probability
    if (command.probability !== undefined) {
      const value = Math.random();
      const result = value <= command.probability;

      return {
        result,
        reason: `${command.name}, ${value}/${
          command.probability
        } (${this.getMsgInfo(msg)})`,
      };
    }

    // if no guilds, channels or probability is set, the command is allowed to be executed by default
    return {
      result: true,
      reason: `${command.name}, default (${this.getMsgInfo(msg)})`,
    };
  }
}
