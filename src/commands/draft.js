import {
  checkPermissions,
  getOptions,
  replyEmbedMessage,
} from "../utils/discordUtils.js";

import {
  ActionRowBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { MOD_PERMS } from "../utils/constants.js";

export default {
  data: new SlashCommandBuilder()
    .setName("gptdraft")
    .setDefaultMemberPermissions(MOD_PERMS)
    .setDescription("Revise and send messages on behalf of bot")
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
        .addChannelOption((option) =>
          option.setName("channel_to_send").setDescription("Channel to send")
        )
    ),
  async execute(interaction) {
    checkPermissions(interaction);
    const subCommand = interaction.options._subcommand;

    switch (subCommand) {
      case "revise": {
        const options = getOptions(interaction);
        const id = options[0].value;
        const ch = interaction.client.channels.cache.get(interaction.channelId);
        const channelId = options.length > 1 ? options[1].value : undefined;
        console.warn(
          `gptdraft at `,
          interaction.guild.name,
          ":",
          id,
          ", send to ",
          ch?.name
        );
        const sendCh =
          channelId !== undefined
            ? interaction.client.channels.cache.get(channelId)
            : undefined;
        const msg = await ch.messages.cache.get(id);
        if (!msg) {
          return await replyEmbedMessage(
            interaction,
            `There is no message with id ${id} in this channel cached since bot is running.`
          );
        }

        const modalId = sendCh ? `editModal-${sendCh.id}` : "editModal";
        const modalTitle = sendCh
          ? `Edit message and send it to #${sendCh.name}`
          : `Edit message`;
        const modal = new ModalBuilder()
          .setCustomId(modalId)
          .setTitle(modalTitle);

        const messageInput = new TextInputBuilder()
          .setCustomId(msg.id)
          .setLabel("Message to edit")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(msg.content)
          .setRequired(true);

        try {
          const secondActionRow = new ActionRowBuilder().addComponents(
            messageInput
          );
          modal.addComponents(secondActionRow);

          await interaction.showModal(modal);
        } catch (e) {
          console.log(e);
        }
        break;
      }
      default: {
        await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
        return undefined;
      }
    }
  },
};
