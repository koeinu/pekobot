import {
  checkPermissions,
  getOptions,
  replyEmbedMessage,
} from "../utils/discordUtils.js";

import { SlashCommandBuilder } from "discord.js";
import {
  getYoutubeChannelId,
  getYoutubeLiveDetailsByVideoIds,
  parseVideoId,
} from "../utils/youtubeUtils.js";
import { deleteCalendarData, updateCalendarData } from "../model/calendars.js";
import { CALENDAR_METADATA } from "../utils/calendarUtils.js";
import { MOD_PERMS } from "../utils/constants.js";

export default {
  data: new SlashCommandBuilder()
    .setName("calendar")
    .setDefaultMemberPermissions(MOD_PERMS)
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
            .setName("handle")
            .setDescription("Calendar handle")
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
            .setName("handle")
            .setDescription("Calendar handle")
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
        const manualChannelHandle = options[1]?.value;

        const channelId =
          CALENDAR_METADATA.find((el) => el.handle === manualChannelHandle)
            ?.id || (await getYoutubeChannelId(url));
        const channelHandle =
          CALENDAR_METADATA.find((el) => el.id === channelId)?.id || "custom";

        const videoId = parseVideoId(url) || url;
        const data = await getYoutubeLiveDetailsByVideoIds([videoId]);

        updateCalendarData(channelHandle, data);

        return await replyEmbedMessage(interaction, `Added.`);
      }
      case "delete": {
        const options = getOptions(interaction);
        const url = options[0].value;
        const manualChannelHandle = options[1]?.value;

        const channelId =
          CALENDAR_METADATA.find((el) => el.handle === manualChannelHandle)
            ?.id || (await getYoutubeChannelId(url));
        const channelHandle =
          CALENDAR_METADATA.find((el) => el.id === channelId)?.id || "custom";

        const videoId = parseVideoId(url) || url;

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
