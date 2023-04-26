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
      new ModerateCommand(), // toppest priority, doesn't intercept
      new LinkFilterCommand(), // top priority, intercepts
      new RelayMessageCommand(), // high priority, intercepts
      new GptlCommand(), // intercepts
      new GptCommand(), // doesn't intercept
      new DeeplCommand(), // intercepts
      new CatchPoemCommand(), // intercepts
      new StreakCommand(), // doesn't intercept
      new BotMentionedCommand(), // 30%, intercepts
      new PekCommand(), // 30% intercepts
      new SameReactCommand(), // 4% intercepts
      new ReactCommand(), // 1% intercepts
      new HaikuCommand(), // 3%
    ];
    this.client = client;
  }
  async processMessage(msg) {
    let commandIntercepted = false;
    this.commands.forEach((command) => {
      if (commandIntercepted) {
        return;
      }
      if (
        command.commandMatch(msg.content) &&
        this.shouldProcessMsg(msg, command)
      ) {
        console.log(
          `Executing command ${command.name} for ${this.getMessage(msg)} in ${
            msg.channel.name
          }, ${msg.guild.name}`
        );
        commandIntercepted = commandIntercepted || command.intercept;
        command.execute(msg, this.client).catch((e) => {
          console.error(
            `Couldn't execute command ${command.name} (${this.getMsgInfo(
              msg
            )}): ${e}`
          );
        });
      }
    });
  }
  async processMessageUpdate(oldMsg, newMsg) {
    this.commands.some((command) => {
      if (
        command.commandMatch(oldMsg.content) &&
        this.shouldProcessMsg(oldMsg, command) &&
        command.executeUpdate
      ) {
        console.log(
          `Executing update ${command.name} for ${this.getMessage(oldMsg)} in ${
            oldMsg.channel.name
          }, ${oldMsg.guild.name}`
        );
        command.executeUpdate(oldMsg, newMsg, this.client).catch((e) => {
          console.error(
            `Couldn't execute update command ${command.name} (${this.getMsgInfo(
              oldMsg
            )}): ${e}`
          );
        });
      }
    });
  }
  async processMessageDelete(msg) {
    this.commands.forEach((command) => {
      if (
        command.commandMatch(msg.content) &&
        this.shouldProcessMsg(msg, command) &&
        command.executeDelete
      ) {
        console.log(
          `Executing delete ${command.name} for ${this.getMessage(msg)} in ${
            msg.channel.name
          }, ${msg.guild.name}`
        );
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
    });
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
    }`;
  }

  shouldProcessMsg(msg, command) {
    // do not respond to system messages and to other bots
    if (msg.system || msg.author.bot) {
      console.log(
        `${command.name}, ignoring bot/system msg (${this.getMsgInfo(msg)})`
      );

      return false;
    }

    if (command.triggerUsers) {
      if (command.triggerUsers.some((el) => el === msg.author.id)) {
        console.log(
          `${command.name}, triggered by user ${
            msg.author.username
          } (${this.getMsgInfo(msg)})`
        );
        return true;
      }
    }

    // check if user can trigger a command
    if (command.prohibitedUsers) {
      if (command.prohibitedUsers.some((el) => el === msg.author.id)) {
        console.log(
          `${command.name}, ignoring prohibited user ${
            msg.author.username
          } (${this.getMsgInfo(msg)})`
        );
        return false;
      }
    }
    if (command.bannedUsers) {
      if (command.bannedUsers.some((el) => el === msg.author.id)) {
        console.log(
          `${command.name}, ignoring banned user ${
            msg.author.username
          } (${this.getMsgInfo(msg)})`
        );
        msg.react("<:PekoFAQ:839873776488284160>").catch((e) => {
          console.error(`Couldn't FAQ: ${e}`);
        });
        return false;
      }
    }
    // check if guild is allowed
    if (command.guilds) {
      const result = command.guilds.some((g) => {
        return `${msg.guild.id}` === `${g}`;
      });
      if (!result) {
        console.log(
          `${command.name}, guild filtered: ${
            command.guilds
          } (${this.getMsgInfo(msg)})`
        );

        return false;
      }
    }
    // check if channel is phohibited
    if (command.prohibitedChannels) {
      const result = command.prohibitedChannels.some((ch) => {
        return `${msg.channel.id}` === `${ch}`;
      });
      if (result) {
        console.log(
          `${command.name} -> prohibited channel filtered: ${
            command.prohibitedChannels
          } (${this.getMsgInfo(msg)})`
        );
        return false;
      }
    }
    // check if channel is allowed
    if (command.allowedChannels) {
      const result = command.allowedChannels.some((g) => {
        return `${msg.channel.id}` === `${g}`;
      });
      if (!result) {
        console.log(
          `${command.name}, channel filtered: ${
            command.allowedChannels
          } (${this.getMsgInfo(msg)})`
        );

        return false;
      }
    }

    // ALWAYS triggering in these channels
    if (command.channels) {
      const result = command.channels.some((ch) => {
        return `${msg.channel.id}` === `${ch}`;
      });
      if (result) {
        console.log(
          `${command.name}, channel OK: ${command.channels} (${this.getMsgInfo(
            msg
          )})`
        );
        return true;
      }
    }

    // not matched in always-triggered channels, may be triggered by probability
    if (command.probability !== undefined) {
      const value = Math.random();
      const result = value <= command.probability;

      if (!result) {
        console.log(
          `${command.name}, % filtered: ${value} (${this.getMsgInfo(msg)})`
        );
      }

      return result;
    }

    // if no guilds, channels or probability is set, the command is allowed to be executed by default
    return true;
  }
}
