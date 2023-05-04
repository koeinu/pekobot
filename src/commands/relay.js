import { RelayMessageCommand } from "../listener/commands/relayMessageCommand.js";
import {
  checkPermissions,
  fetchMessages,
  followUpEmbedMessage,
  getOptions,
  replyEmbedMessage,
  sendWithAttachment,
  sleep,
} from "../utils/discordUtils.js";

import {
  addRelay,
  loadRelays,
  toggleRelays,
  updateRelays,
} from "../model/relay.js";

import { formatTL } from "../utils/stringUtils.js";

import { SlashCommandBuilder } from "discord.js";

import { RELAY_AUTHORS } from "../utils/ids/users.js";

const options = {
    month: "numeric",
    day: "numeric",
    timeZone: "Japan",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
    hour12: false,
  },
  formatter = new Intl.DateTimeFormat([], options);

const dateOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour12: false,
  },
  dateFormatter = new Intl.DateTimeFormat([], dateOptions);

// const streamTimeOptions = {
//     hour: "numeric",
//     minute: "numeric",
//     second: "numeric",
//     hour12: false,
//   },
//   streamTimeFormatter = new Intl.DateTimeFormat([], streamTimeOptions);

export default {
  data: new SlashCommandBuilder()
    .setName("tl_relay")
    .setDefaultMemberPermissions(16)
    .setDescription("Manage TL relaying")
    .addSubcommand((sc) =>
      sc
        .setName("dump")
        .setDescription("Dump relay to current channel")
        .addStringOption((option) =>
          option.setName("url").setDescription("Stream URL, optional")
        )
    )
    .addSubcommand((sc) =>
      sc.setName("clear").setDescription("Clear the current relay")
    )
    .addSubcommand((sc) =>
      sc
        .setName("info")
        .setDescription("The amount of transcripts in the current relay")
    )
    .addSubcommand((sc) =>
      sc
        .setName("toggle")
        .setDescription("Enable/disable relaying")
        .addBooleanOption((option) =>
          option
            .setRequired(true)
            .setName("value")
            .setDescription(
              "If true, relaying is enabled. Otherwise relaying is disabled"
            )
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("salvage")
        .setDescription(
          "Salvages all TLs from the channel starting with a provided message, NOT relaying them"
        )
        .addStringOption((option) =>
          option
            .setRequired(true)
            .setName("start_msg_id")
            .setDescription("Start message ID")
        )
        .addStringOption((option) =>
          option
            .setName("end_msg_id")
            .setDescription("End message ID (optional)")
        )
    ),
  async execute(interaction, discordClient) {
    checkPermissions(interaction);
    const subCommand = interaction.options._subcommand;

    const relaysFile = loadRelays();
    const uniqueRelays = relaysFile.relays.reduce((arr, curr) => {
      if (arr.find((el) => el.sourceId === curr.sourceId)) {
        return arr;
      }
      arr.push(curr);
      return arr;
    }, []);

    switch (subCommand) {
      case "salvage": {
        await replyEmbedMessage(interaction, `Starting salvaging.`);

        const options = getOptions(interaction);
        const guildId = "999666683176308807";
        const channelId = "1011279225728278690";
        const guild = await discordClient.guilds.cache.get(guildId);
        const channel = await guild.channels.cache.get(channelId);
        const startMessage = await channel.messages.fetch(options[0].value);
        const endMessage = options[1]
          ? await channel.messages.fetch(options[1].value)
          : undefined;

        console.warn(
          `relay salvage at `,
          interaction.guild.name,
          ":",
          endMessage.id,
          ",",
          endMessage?.id
        );

        let messages = [
          startMessage,
          ...Array.from(
            await fetchMessages(channel, startMessage.id, endMessage?.id)
          ),
        ];
        if (endMessage) {
          messages.push(endMessage);
        }

        console.log("fetched messages:", messages.length);

        const rmc = new RelayMessageCommand();
        const TLs = [];
        for (let el of messages) {
          const isMatch = await rmc.commandMatch(el);
          if (isMatch) {
            TLs.push(el);
          }
        }

        console.log("found TLS:", TLs.length);

        TLs.forEach((tl) => console.log(tl.content));

        updateRelays([]);
        TLs.forEach((msg) => {
          const text = msg.content;
          if (!RELAY_AUTHORS.includes(msg.author.id)) {
            // Zabine
            console.log("SKIPPING AUTHOR", msg.author, ":", text);
          } else {
            const msgToSend = formatTL(text);
            addRelay({
              sourceId: msg.id,
              source: {
                guildId: msg.guild.id,
                channelId: msg.channel.id,
                messageId: msg.id,
                createdTimestamp: msg.createdTimestamp,
              },
              content: msgToSend,
            });
          }
        });

        await followUpEmbedMessage(
          interaction,
          `Salvaged ${TLs.length} TLs. You can dump the data now.`,
          false,
          true
        );

        break;
      }
      case "dump": {
        if (uniqueRelays.length === 0) {
          await replyEmbedMessage(
            interaction,
            "No transcriptions in current relay",
            false,
            false
          );
          return;
        }
        await replyEmbedMessage(
          interaction,
          "Please wait, forming timestamps.."
        );
        const options = getOptions(interaction);
        const streamUrl = options.length > 0 ? options[0].value : undefined;
        // const streamStartedAt = streamUrl
        //   ? await getYoutubeStartTimestamp(streamUrl)
        //   : undefined;

        console.warn(`relay dump at `, interaction.guild.name, ":", streamUrl);

        const dumpingStartTime = new Date();
        const relayTexts = [];
        let firstTs = undefined;
        for (let i = 0; i < uniqueRelays.length; i++) {
          const relay = uniqueRelays[i];
          let ts = undefined;
          // let streamTs = undefined;
          if (relay.source?.createdTimestamp) {
            // easier way
            ts = formatter.format(new Date(relay.source.createdTimestamp));
            // streamTs = streamStartedAt
            //   ? streamTimeFormatter.format(
            //       new Date(relay.source.createdTimestamp - streamStartedAt)
            //     )
            //   : undefined;
            if (!firstTs) {
              firstTs = new Date(relay.source.createdTimestamp);
            }
          } else {
            // hardcode way
            const guildId = "999666683176308807";
            const channelId = "1088003327398256731";
            const guild = await discordClient.guilds.cache.get(guildId);
            const channel = await guild.channels.cache.get(channelId);
            const message = await channel.messages.fetch(relay.sourceId);
            console.log("dumping message ", relay.sourceId);
            ts = formatter.format(message.createdAt);
            // streamTs = streamStartedAt
            //   ? streamTimeFormatter.format(
            //       new Date(message.createdAt - streamStartedAt)
            //     )
            //   : undefined;
            if (!firstTs) {
              firstTs = message.createdAt;
            }
          }

          relayTexts.push(
            `[${ts}] ${relay.content.replaceAll("`", "").replace(">", "")}`
          );
        }

        const passedMS = new Date().getTime() - dumpingStartTime.getTime();
        const elapsedMS = Math.max(0, 2000 - passedMS);
        if (elapsedMS > 0) {
          await sleep(() => {}, elapsedMS);
        }

        // now safe to do the actual dump

        const streamDate =
          dateFormatter.format(firstTs) || dateFormatter.format(new Date());
        let fileName = `archive_${streamDate}.txt`;
        let message =
          `Archive for ${streamDate}` + (streamUrl ? `, ${streamUrl}` : "");

        console.log("prepared to dump tls:");
        console.log(relayTexts);
        const toBuffer = message ? [message, ...relayTexts] : relayTexts;
        const buffer = Buffer.from(toBuffer.join("\n"), "utf-8");
        await sendWithAttachment(
          interaction.channel,
          message,
          buffer,
          fileName,
          false,
          false
        );
        break;
      }
      case "clear": {
        console.warn(`relay clear at `, interaction.guild.name);
        updateRelays([]);
        return await replyEmbedMessage(interaction, `Relay cleared.`);
      }
      case "info": {
        console.warn(`relay info at `, interaction.guild.name);
        return await replyEmbedMessage(
          interaction,
          `Transcripts count: ${uniqueRelays.length}`
        );
      }
      case "toggle": {
        const options = getOptions(interaction);
        const value = options[0].value;
        toggleRelays(value);
        console.warn(`relay toggle at `, interaction.guild.name, ":", value);
        return await replyEmbedMessage(
          interaction,
          `Relaying is now ${value ? "enabled" : "disabled"}`
        );
      }
      default: {
        await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
        return undefined;
      }
    }
  },
};
