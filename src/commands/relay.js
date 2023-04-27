import { RelayMessageCommand } from "../listener/commands/relayMessageCommand.js";
import {
  checkPermissions,
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

        console.log("start message:", startMessage.content);

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
        const TLs = messages.filter((el) => rmc.commandMatch(el.content));

        console.log("found TLS:", TLs.length);

        TLs.forEach((tl) => console.log(tl.content));

        updateRelays([]);
        TLs.forEach((msg) => {
          const text = msg.content;
          if (msg.author.id !== "214207327451086848") {
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
        const startTime = new Date();
        const relayTexts = [];
        let firstTs = undefined;
        for (let i = 0; i < uniqueRelays.length; i++) {
          const relay = uniqueRelays[i];
          let ts = undefined;
          if (relay.source?.createdTimestamp) {
            // easier way
            ts = formatter.format(new Date(relay.source.createdTimestamp));
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
            if (!firstTs) {
              firstTs = message.createdAt;
            }
          }

          relayTexts.push(
            `[${ts}] ${relay.content.replaceAll("`", "").replace(">", "")}`
          );
        }
        const passedMS = new Date().getTime() - startTime.getTime();
        const elapsedMS = Math.max(0, 2000 - passedMS);
        if (elapsedMS > 0) {
          await sleep(() => {}, elapsedMS);
        }
        const options = getOptions(interaction);
        const streamDate =
          dateFormatter.format(firstTs) || dateFormatter.format(new Date());
        let fileName = `archive_${streamDate}.txt`;
        let message = undefined;
        if (options.length > 0) {
          const streamUrl = options[0].value;
          message = `Archive for ${streamDate}, url: ${streamUrl}`;
        } else {
          message = `Archive for ${streamDate}`;
        }

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
        // const sumMessage = (parts) => parts.join("\n");
        // const sumLength = (parts) => sumMessage(parts).length;
        // let parts = [];
        // for (let i = 0; i < relayTexts.length; i++) {
        //   if (sumLength(parts) > 2000) {
        //     console.log("sending", sumMessage(parts));
        //     await sendEmbedMessage(
        //       interaction.channel,
        //       sumMessage(parts),
        //       false,
        //       false
        //     );
        //     parts = [];
        //   }
        //   parts.push(relayTexts[i]);
        // }
        // if (parts.length > 0) {
        //   console.log("sending", sumMessage(parts));
        //   await sendEmbedMessage(
        //     interaction.channel,
        //     sumMessage(parts),
        //     false,
        //     false
        //   );
        // }
        break;
      }
      case "clear": {
        updateRelays([]);
        return await replyEmbedMessage(interaction, `Relay cleared.`);
      }
      case "info": {
        return await replyEmbedMessage(
          interaction,
          `Transcripts count: ${uniqueRelays.length}`
        );
      }
      case "toggle": {
        const options = getOptions(interaction);
        toggleRelays(options[0].value);
        return await replyEmbedMessage(
          interaction,
          `Relaying is now ${options[0].value ? "enabled" : "disabled"}`
        );
      }
      default: {
        await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
        return undefined;
      }
    }
  },
};

async function fetchMessages(channel, startId, endId, limit = 500) {
  const toReturn = [];
  let lastId;

  while (true) {
    console.log("msg count: ", toReturn.length, "...");
    const options = {
      limit: Math.min(limit, 100),
      cache: true,
      after: startId, // The date time you want it from
    };
    if (lastId) {
      options.after = lastId;
    }

    const messages = await channel.messages.fetch(options);
    let values = Array.from(messages.values()).reverse();
    const foundEndMessage = values.find((el) => el.id === endId);
    if (foundEndMessage) {
      const foundEndMessageIndex = values.indexOf(foundEndMessage);
      values = values.filter((el, index) => index < foundEndMessageIndex);
    }
    toReturn.push(...values);
    const lastMessage = messages.first();
    lastId = lastMessage.id;
    console.log("lastId:", lastId);
    console.log("last message:", lastMessage.content);

    if (values.length < 100 || toReturn.length > limit) {
      break;
    }
  }

  return toReturn;
}
