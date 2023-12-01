import fs from "node:fs";
import path from "node:path";
import { Client, Collection, Events, GatewayIntentBits } from "discord.js";

import { fillMessage, replyEmbedMessage } from "./utils/discordUtils.js";

import _path from "path";
import { fileURLToPath } from "url";
import { getBotSettings } from "./model/botSettings.js";
import { gatherSlashCommandInfo } from "./utils/stringUtils.js";

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
        await (command.default ? command.default : command).execute(
          interaction,
          this.client
        );
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

  async onReady() {
    this.ready = true;
  }

  async onMessage(msg) {
    if (!this.ready) {
      return;
    }

    await fillMessage(msg);
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
  }
  async onMessageDelete(msg) {
    if (!this.ready) {
      return;
    }

    await fillMessage(msg);
  }
}
