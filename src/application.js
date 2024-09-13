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
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) {
        return;
      }

      if (!this.ready) {
        return;
      }

      const command = interaction.client.commands.get(interaction.commandName);

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
          `Execute error for ${interaction.commandName}:`,
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
