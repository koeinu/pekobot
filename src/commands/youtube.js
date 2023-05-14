import { getYoutubeChannelId } from "../utils/youtubeUtils.js";

import { addBan, listBans, removeBan } from "../model/youtube.js";

import {
  checkPermissions,
  getOptions,
  replyEmbedMessage,
} from "../utils/discordUtils.js";

import { SlashCommandBuilder } from "discord.js";
import { MOD_PERMS } from "../utils/constants.js";

export default {
  data: new SlashCommandBuilder()
    .setName("message_filters")
    .setDefaultMemberPermissions(MOD_PERMS)
    .setDescription("Youtube commands")
    .addSubcommand((sc) =>
      sc
        .setName("ban_channel")
        .setDescription("Ban channel by channel id")
        .addStringOption((option) =>
          option.setName("id").setDescription("Channel ID").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for ban")
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("unban_channel")
        .setDescription("Unban channel by channel id")
        .addStringOption((option) =>
          option.setName("id").setDescription("Channel ID").setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("list_banned")
        .setDescription("List banned channels + ban reasons")
    )
    .addSubcommand((sc) =>
      sc
        .setName("get_id")
        .setDescription("Gets channel id of the video link provided")
        .addStringOption((option) =>
          option.setName("url").setDescription("Video URL").setRequired(true)
        )
    ),
  async execute(interaction) {
    checkPermissions(interaction);
    const subCommand = interaction.options._subcommand;

    switch (subCommand) {
      case "list_banned": {
        console.warn(`youtube listbans at `, interaction.guild.name);
        const bans = listBans();
        const msg = Object.entries(bans)
          .map((kvp) => {
            return `${kvp[0]}: ${kvp[1]}`;
          })
          .join("\n");
        return await replyEmbedMessage(interaction, msg);
      }
      case "ban_channel": {
        const options = getOptions(interaction);
        const id = options[0].value;
        const reason = options[1].value;
        console.warn(
          `youtube ban at `,
          interaction.guild.name,
          ":",
          id,
          ",",
          reason
        );
        addBan(id, reason);
        return await replyEmbedMessage(interaction, `Channel banned.`);
      }
      case "unban_channel": {
        const options = getOptions(interaction);
        const id = options[0].value;
        console.warn(`youtube unban at `, interaction.guild.name, ":", id);
        removeBan(id);
        return await replyEmbedMessage(interaction, "Channel unbanned.");
      }
      case "get_id": {
        const options = getOptions(interaction);
        const videoLink = options[0].value;
        console.warn(`youtube id at `, interaction.guild.name, ":", videoLink);
        const id = await getYoutubeChannelId(videoLink);
        return await replyEmbedMessage(interaction, id);
      }
      default: {
        await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
        return undefined;
      }
    }
  },
};
