import {
  checkPermissions,
  followUpCustomEmbed,
  replyCustomEmbed,
  send,
} from "../../utils/discordUtils.js";

import { SlashCommandBuilder } from "discord.js";

const DUMP_INTERVAL = 5000; //ms

let sourceChannelMessages = [];
let sourceChannel = undefined;
let isDumping = false;

export default {
  data: new SlashCommandBuilder()
    .setName("archive")
    .setDescription(
      "Allows dumping the messages from some channel/thread to another place. Mod-only."
    )
    .setDefaultMemberPermissions(16)
    .addSubcommand((sc) =>
      sc
        .setName("save")
        .setDescription(
          "Saves all the messages from a specified channel for dumping later"
        )
        .addStringOption((option) =>
          option
            .setRequired(true)
            .setName("channel")
            .setDescription("Channel id")
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("info")
        .setDescription("Shows the amount of currently saved messages.")
    )
    .addSubcommand((sc) =>
      sc.setName("clear").setDescription("Cleares the saved messages.")
    )
    .addSubcommand((sc) =>
      sc.setName("stop").setDescription("Stops the ongoing dumping")
    )
    .addSubcommand((sc) =>
      sc
        .setName("dump")
        .setDescription(
          "Dumps ALL the messages from a channel HERE where you call this command."
        )
    ),
  async execute(interaction, client) {
    checkPermissions(interaction);
    const subCommand = interaction.options._subcommand;
    switch (subCommand) {
      case "save": {
        sourceChannel = client.channels.cache.get(
          interaction.options._hoistedOptions[0].value
        );

        await replyCustomEmbed(
          interaction,
          undefined,
          "Fetching messages..",
          undefined,
          undefined,
          undefined
        );
        sourceChannelMessages = await fetchAllMessages(client, sourceChannel);
        await followUpCustomEmbed(
          interaction,
          undefined,
          `Fetched ${sourceChannelMessages.length} messages.`,
          undefined,
          undefined,
          undefined
        );
        break;
      }
      case "clear": {
        sourceChannelMessages = [];
        await replyCustomEmbed(
          interaction,
          undefined,
          `Cleared the saved messages.`,
          undefined,
          undefined,
          undefined
        );
        break;
      }
      case "stop": {
        isDumping = false;
        await replyCustomEmbed(
          interaction,
          undefined,
          `Stopped the ongoing message dumping.`,
          undefined,
          undefined,
          undefined
        );
        break;
      }
      case "info": {
        await replyCustomEmbed(
          interaction,
          undefined,
          `There are currently ${sourceChannelMessages.length} saved messages.`,
          undefined,
          undefined,
          undefined
        );
        break;
      }
      case "dump": {
        await replyCustomEmbed(
          interaction,
          undefined,
          `Dumping ${sourceChannelMessages.length} messages here with ${
            DUMP_INTERVAL / 1000
          }s interval between each one. To stop, call \`/archive stop\`.`,
          undefined,
          undefined,
          undefined
        );

        await sendAllMessages(
          sourceChannel,
          interaction.channel,
          sourceChannelMessages
        );
      }
    }
  },
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendAllMessages(sourceChannel, channel, messages) {
  isDumping = true;
  for (let i = 0; i < messages.length; i++) {
    if (!isDumping) {
      return;
    }
    const msg = messages[i];

    await send(
      channel,
      `${msg.content}\n> by ${msg.author} in ${sourceChannel}`
    );

    await delay(DUMP_INTERVAL);
  }
}

async function fetchAllMessages(client, channel) {
  let messages = [];

  // Create message pointer
  let message = await channel.messages
    .fetch({ limit: 1 })
    .then((messagePage) => (messagePage.size === 1 ? messagePage.at(0) : null));
  messages.push(message);

  while (message) {
    await channel.messages
      .fetch({ limit: 100, before: message.id })
      .then((messagePage) => {
        messagePage.forEach((msg) => messages.push(msg));

        // Update our message pointer to be last message in page of messages
        message =
          0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
      });
  }

  return messages.reverse();
}
