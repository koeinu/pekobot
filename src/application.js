import fs from "node:fs";
import path from "node:path";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  ShardEvents,
} from "discord.js";

import {
  fetchMessage,
  fillMessage,
  replyEmbedMessage,
} from "./utils/discordUtils.js";

import { CommandListener } from "./listener/commandListener.js";

import { generateCommands } from "./generateCommands.js";
import {
  makeCompoundBetCommands,
  makeSimpleBetCommands,
} from "./commands/commandGenerators/bet.js";
import { loadRelays } from "./model/relay.js";
import _path from "path";
import { fileURLToPath } from "url";
import { JSON_FILE_NAME, convertJsonToParsed } from "./model/bets.js";
import { loadFile } from "./utils/fileUtils.js";
import { getBotSettings } from "./model/botSettings.js";
import { gatherSlashCommandInfo } from "./utils/stringUtils.js";
import { loadAllPremiumData, loadPremiumData } from "./model/premium.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = _path.dirname(__filename);

export class Application {
  constructor(botName) {
    this.settings = getBotSettings(botName);

    this.ready = false;
    const intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
    ];
    if (botName === "peko-bot") {
      intents.push(GatewayIntentBits.GuildMembers);
    }
    this.client = new Client({
      intents,
    });

    this.client.commands = new Collection();
    this.listener = new CommandListener(this.client, this.settings);

    const commandsPath = path.join(__dirname, "commands");
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      if (process.platform === "win32") {
        const filePath = "file:///" + path.join(commandsPath, file);
        import(filePath).then((command) => {
          this.client.commands.set(command.default.data.name, command);
        });
      } else {
        const filePath = path.join(commandsPath, file);
        import(filePath).then((command) => {
          this.client.commands.set(command.default.data.name, command);
        });
      }
    }

    const betsStorage = loadFile(JSON_FILE_NAME);
    if (betsStorage) {
      betsStorage.forEach((betsData) => {
        if (betsData.data.betType === 0) {
          const simpleBetCommands = makeSimpleBetCommands();
          this.client.commands.set(
            `${betsData.guildId}__${simpleBetCommands.data.name}`,
            simpleBetCommands
          );
        } else if (betsData.data.betType === 1) {
          const data = convertJsonToParsed(JSON_FILE_NAME, betsData.guildId);
          const commands = makeCompoundBetCommands(data.data);
          this.client.commands.set(
            `${betsData.guildId}__${commands.data.name}`,
            commands
          );
        }
      });
    }

    this.client.on(Events.Error, (e) => {
      console.error(e);
    });
    this.client.on(Events.Warn, (e) => {
      console.warn(e);
    });
    this.client.on(Events.Debug, (e) => {
      console.log(e);
    });

    this.client.once(Events.ClientReady, (c) => {
      console.error(`Logged in as ${c.user.tag}`);

      if (c.user.tag.includes("peko-bot")) {
        setInterval(() => {
          const premiumData = loadAllPremiumData();
          Object.entries(premiumData).forEach(async ([guildId, data]) => {
            const guild = this.client.guilds.cache.get(guildId);
            const customRoleUsers = data.userData;
            for (let i = 0; i < customRoleUsers.length; i++) {
              const foundUser = await guild.members
                .fetch(customRoleUsers[i].userId)
                .catch((e) => {});
              const foundRole = await guild.roles.fetch(
                customRoleUsers[i].roleId
              );
              if (!foundUser) {
                continue;
              }
              const isDignitary = !!foundUser.roles.cache.find(
                (el) => el.id === premiumData[guildId].premiumRoleId
              );
              const hasCustomRole = !!foundUser.roles.cache.find(
                (el) => el.id === customRoleUsers[i].roleId
              );

              if (hasCustomRole && !isDignitary) {
                console.error(
                  `Removing role ${foundRole.name} from ${
                    foundUser.nickname || foundUser.user.username
                  }`
                );
                await foundUser.roles.remove(foundRole);
              } else if (!hasCustomRole && isDignitary) {
                console.error(
                  `Assigning role ${foundRole.name} to ${
                    foundUser.nickname || foundUser.user.username
                  }`
                );
                await foundUser.roles.add(foundRole);
              }
            }
          });
        }, 1000 * 60 * 60 * 6);
      }
    });
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isModalSubmit()) {
        return;
      }
      try {
        const customId = interaction.customId;
        const channelToSendId = customId.split("-")[1];
        const channelToSend = channelToSendId
          ? interaction.client.channels.cache.get(channelToSendId)
          : undefined;
        const data = interaction.fields.fields.first();
        const editedMessage = data.value;
        const msgId = data.customId;
        const ch = interaction.client.channels.cache.get(interaction.channelId);
        const msg = ch.messages.cache.get(msgId);
        msg
          .edit(editedMessage)
          .then(() => {
            if (channelToSend) {
              channelToSend.send(editedMessage);
            }
          })
          .then(() => {
            return replyEmbedMessage(
              interaction,
              channelToSend
                ? `Successfully edited and sent.`
                : `Successfully edited.`
            );
          })
          .catch((e) => {
            console.error(e);
            return replyEmbedMessage(interaction, `Error when editing: ` + e);
          });
      } catch (e) {
        console.error("Critical modal error:", e);
      }
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) {
        return;
      }

      if (!this.ready) {
        return;
      }

      const commandName =
        interaction.commandName === "bet"
          ? `${interaction.guild.id}__${interaction.commandName}`
          : interaction.commandName;

      const command = interaction.client.commands.get(commandName);

      if (!command) {
        console.error(`No command matching ${command} was found.`);
        return;
      }

      try {
        console.warn(...gatherSlashCommandInfo(interaction));
        const result = await (command.default
          ? command.default
          : command
        ).execute(interaction, this.client);
        if (result) {
          const data = result.data;
          if (result.create === true) {
            if (data.length > 0) {
              const commands = makeCompoundBetCommands(data);
              this.client.commands.set(
                `${interaction.guild.id}__${commands.data.name}`,
                commands
              );
              const commandsToGenerate =
                this.getCommandsToGenerate(interaction);
              await generateCommands(
                this.settings,
                commandsToGenerate.map((el) =>
                  el.default ? el.default.data.toJSON() : el.data.toJSON()
                ),
                [interaction.guild.id]
              );
            } else {
              const commands = makeSimpleBetCommands();
              this.client.commands.set(
                `${interaction.guild.id}__${commands.data.name}`,
                commands
              );
              const commandsToGenerate =
                this.getCommandsToGenerate(interaction);
              await generateCommands(
                this.settings,
                commandsToGenerate.map((el) =>
                  el.default ? el.default.data.toJSON() : el.data.toJSON()
                ),
                [interaction.guild.id]
              );
            }
          } else if (result.create === false) {
            const commands = makeSimpleBetCommands();
            this.client.commands.delete(
              `${interaction.guild.id}__${commands.data.name}`
            );
            const commandsToGenerate = this.getCommandsToGenerate(interaction);
            await generateCommands(
              this.settings,
              commandsToGenerate.map((el) =>
                el.default ? el.default.data.toJSON() : el.data.toJSON()
              ),
              [interaction.guild.id]
            );
          }
        }
      } catch (error) {
        console.error(
          `Execute error for ${commandName}:`,
          error.message || error
        );
        if (error.message) {
          replyEmbedMessage(
            interaction,
            `Oh no, I have an error! Please contact my creator Hermit! ${
              error.message ? "Show him this! '" + error.message + "'" : ""
            }`
          ).catch((e) => {
            console.error(`Critical error! ${e}`);
          });
        } else {
          replyEmbedMessage(interaction, error).catch((e) => {
            console.error(`Critical error! ${e}`);
          });
        }
      }
    });
    this.client.on(Events.MessageCreate, (msg) => this.onMessage(msg));
    this.client.on(Events.MessageUpdate, (oldMsg, newMsg) =>
      this.onMessageEdit(oldMsg, newMsg)
    );
    this.client.on(Events.MessageDelete, (msg) => this.onMessageDelete(msg));
    this.client.on(Events.ClientReady, () => this.onReady());

    this.client.login(this.settings.token);
  }

  getCommandsToGenerate(interaction) {
    return Array.from(this.client.commands)
      .filter(
        (el) => !el[0].includes("__bet") || el[0].includes(interaction.guild.id)
      )
      .map((el) => el[1]);
  }

  async onReady() {
    const relaysFile = loadRelays();
    const uniqueRelays = relaysFile.relays.reduce((arr, curr) => {
      if (arr.find((el) => el.sourceId === curr.sourceId)) {
        return arr;
      }
      arr.push(curr);
      return arr;
    }, []);

    this.ready = true;

    for (let i = 0; i < uniqueRelays.length; i++) {
      await fetchMessage(this.client, uniqueRelays[i].source);
    }
  }

  async onMessage(msg) {
    if (!this.ready) {
      return;
    }

    msg = await fillMessage(msg);
    if (!msg) {
      return;
    }

    this.listener.processMessage(msg).catch((e) => {
      console.error(`onMessage error: ${msg.content}, ${e}`);
    });
  }

  async onMessageEdit(oldMessage, newMessage) {
    if (!this.ready) {
      return;
    }

    oldMessage = await fillMessage(oldMessage);
    if (!oldMessage) {
      return;
    }

    newMessage = await fillMessage(newMessage);
    if (!newMessage) {
      return;
    }

    this.listener.processMessageUpdate(oldMessage, newMessage).catch((e) => {
      console.error(`onUpdateMessage error: ${oldMessage.content}, ${e}`);
    });
  }
  async onMessageDelete(msg) {
    if (!this.ready) {
      return;
    }

    msg = await fillMessage(msg);
    if (!msg) {
      return;
    }

    this.listener.processMessageDelete(msg).catch((e) => {
      console.error(`onMessage error: ${msg.content}, ${e}`);
    });
  }
}
