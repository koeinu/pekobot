import {
  checkPermissions,
  getOptions,
  replyEmbedMessage,
} from "../utils/discordUtils.js";

import { SlashCommandBuilder, TextInputStyle } from "discord.js";
import {
  getYoutubeLiveDetailsByVideoIds,
  parseVideoId,
} from "../utils/youtubeUtils.js";
import { updateCalendarData } from "../model/calendars.js";

export default {
  data: new SlashCommandBuilder()
    .setName("calendar")
    .setDefaultMemberPermissions(16)
    .setDescription("Add videos to a custom calendar")
    .addSubcommand((sc) =>
      sc
        .setName("add")
        .setDescription("Provides a window to edit bot's message")
        .addStringOption((option) =>
          option.setName("url").setDescription("Video URL").setRequired(true)
        )
    ),
  async execute(interaction) {
    checkPermissions(interaction);
    const subCommand = interaction.options._subcommand;

    switch (subCommand) {
      case "add": {
        const options = getOptions(interaction);
        const url = options[0].value;

        const videoId = parseVideoId(url) || url;
        console.warn(
          `adding calendar url ${videoId} at `,
          interaction.guild.name
        );
        const data = await getYoutubeLiveDetailsByVideoIds([videoId]);

        updateCalendarData("custom", [...data]);

        return await replyEmbedMessage(interaction, `Added.`);
      }
      default: {
        await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
        return undefined;
      }
    }
  },
};
