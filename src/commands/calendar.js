import {
  checkPermissions,
  getOptions,
  replyEmbedMessage,
} from "../utils/discordUtils.js";

import { SlashCommandBuilder, TextInputStyle } from "discord.js";
import {
  getYoutubeChannelId,
  getYoutubeLiveDetailsByVideoIds,
  parseVideoId,
} from "../utils/youtubeUtils.js";
import { deleteCalendarData, updateCalendarData } from "../model/calendars.js";
import { CALENDAR_METADATA } from "../utils/calendarUtils.js";

export default {
  data: new SlashCommandBuilder()
    .setName("calendar")
    .setDefaultMemberPermissions(16)
    .setDescription("Manages calendars")
    .addSubcommand((sc) =>
      sc
        .setName("add")
        .setDescription("Adds a video to a calendar")
        .addStringOption((option) =>
          option.setName("url").setDescription("Video URL").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("Video URL")
            .addChoices(
              ...(CALENDAR_METADATA.length > 0
                ? CALENDAR_METADATA.map((el) => ({
                    name: el.handle,
                    value: el.handle,
                  }))
                : [{ name: "custom", value: "custom" }])
            )
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("delete")
        .setDescription("Removes a video from a calendar")
        .addStringOption((option) =>
          option.setName("url").setDescription("Video URL").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("Video URL")
            .addChoices(
              ...(CALENDAR_METADATA.length > 0
                ? CALENDAR_METADATA.map((el) => ({
                    name: el.handle,
                    value: el.handle,
                  }))
                : [{ name: "custom", value: "custom" }])
            )
        )
    ),
  async execute(interaction) {
    checkPermissions(interaction);
    const subCommand = interaction.options._subcommand;

    switch (subCommand) {
      case "add": {
        const options = getOptions(interaction);
        const url = options[0].value;
        const manualChannelHandle = options[1].value;

        const channelId =
          CALENDAR_METADATA.find((el) => el.handle === manualChannelHandle)
            ?.id || (await getYoutubeChannelId(url));
        const channelHandle =
          CALENDAR_METADATA.find((el) => el.id === channelId)?.id || "custom";

        const videoId = parseVideoId(url) || url;
        console.warn(
          `adding calendar url ${videoId} at `,
          interaction.guild.name
        );
        const data = await getYoutubeLiveDetailsByVideoIds([videoId]);

        updateCalendarData(channelHandle, data);

        return await replyEmbedMessage(interaction, `Added.`);
      }
      case "delete": {
        const options = getOptions(interaction);
        const url = options[0].value;
        const manualChannelHandle = options[1].value;

        const channelId =
          CALENDAR_METADATA.find((el) => el.handle === manualChannelHandle)
            ?.id || (await getYoutubeChannelId(url));
        const channelHandle =
          CALENDAR_METADATA.find((el) => el.id === channelId)?.id || "custom";

        const videoId = parseVideoId(url) || url;
        console.warn(
          `deleting calendar url ${videoId} at `,
          interaction.guild.name
        );

        const result = deleteCalendarData(channelHandle, [videoId]);

        return await replyEmbedMessage(interaction, `Deleted: ${result}`);
      }
      default: {
        await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
        return undefined;
      }
    }
  },
};
