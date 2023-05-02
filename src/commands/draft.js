import {
  checkPermissions,
  getOptions,
  replyEmbedMessage,
} from "../utils/discordUtils.js";

import {
  ModalBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { StringSelectMenuOptionBuilder } from "@discordjs/builders";

export default {
  data: new SlashCommandBuilder()
    .setName("draft")
    .setDefaultMemberPermissions(16)
    .setDescription("Revise and send messages on behalf of peko-bot")
    .addSubcommand((sc) =>
      sc
        .setName("revise")
        .setDescription("Provides a window to edit bot's message")
        .addStringOption((option) =>
          option
            .setName("message_id")
            .setDescription("Message ID to edit")
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("send")
        .setDescription("Sends bot's message to a channel provides")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to send message to")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    checkPermissions(interaction);
    const subCommand = interaction.options._subcommand;

    switch (subCommand) {
      case "revise": {
        const options = getOptions(interaction);
        const id = options[0].value;
        const ch = await interaction.client.channels.cache.get(
          interaction.channelId
        );
        const msg = await ch.messages.cache.get(id);
        if (!msg) {
          return await replyEmbedMessage(
            interaction,
            `There is no message with id ${id} in this channel cached since bot is running.`
          );
        }

        const modal = new ModalBuilder()
          .setCustomId("editModal")
          .setTitle("Edit Bot Message");

        const stringOptions = new StringSelectMenuOptionBuilder()
          .setLabel("Message id")
          .setValue(id)
          .setDefault(true);
        const messageId = new StringSelectMenuBuilder()
          .setCustomId("messageId")
          .setOptions(stringOptions)
          .setDisabled();

        const messageInput = new TextInputBuilder()
          .setCustomId("messageText")
          .setLabel("What's some of your favorite hobbies?")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(msg.content);
        modal.addComponents(messageId, messageInput);

        return interaction.showModal(modal);
      }
      case "send": {
        return await replyEmbedMessage(interaction, `test!`);
      }
      default: {
        await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
        return undefined;
      }
    }
  },
};
