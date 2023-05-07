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
import { deleteCalendarData, updateCalendarData } from "../model/calendars.js";

export default {
  data: new SlashCommandBuilder()
    .setName("calendar")
    .setDefaultMemberPermissions(16)
    .setDescription("Manages custom calendars")
    .addSubcommand((sc) =>
      sc
        .setName("add")
        .setDescription("Adds a video to a custom calendar")
        .addStringOption((option) =>
          option.setName("url").setDescription("Video URL").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("channel").setDescription("Channel handle to add to")
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("delete")
        .setDescription("Removes a video from a custom calendar")
        .addStringOption((option) =>
          option.setName("url").setDescription("Video URL").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel handle to remove from")
        )
    ),
  async execute(interaction) {
    checkPermissions(interaction);
    const subCommand = interaction.options._subcommand;

    switch (subCommand) {
      case "add": {
        const options = getOptions(interaction);
        const url = options[0].value;
        const channel = options[1]?.value;

        const videoId = parseVideoId(url) || url;
        console.warn(
          `adding calendar url ${videoId} at `,
          interaction.guild.name
        );
        const data = await getYoutubeLiveDetailsByVideoIds([videoId]);

        updateCalendarData(channel || "custom", [...data]);

        return await replyEmbedMessage(interaction, `Added.`);
      }
      case "delete": {
        const options = getOptions(interaction);
        const url = options[0].value;
        const channel = options[1]?.value;

        const videoId = parseVideoId(url) || url;
        console.warn(
          `deleting calendar url ${videoId} at `,
          interaction.guild.name
        );

        const result = deleteCalendarData(channel || "custom", [videoId]);

        return await replyEmbedMessage(interaction, `Deleted: `, result);
      }
      default: {
        await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
        return undefined;
      }
    }
  },
};
