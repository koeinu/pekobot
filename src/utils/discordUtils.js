import {
  DISCORD_BOT_MAX_MESSAGE,
  FETCH_CHUNK,
  MAX_FETCH,
  PEKO_COLOR,
} from "./constants.js";

import { getMsgInfo } from "./stringUtils.js";
import { EmbedBuilder } from "discord.js";

export const getOptions = (interaction) =>
  interaction.options?._hoistedOptions || [];

export const send = async (target, strContent, msg, ping) => {
  let msgOptions = {
    content: strContent,
    message_reference: msg
      ? {
          message_id: msg.id,
          channel_id: msg.channel.id,
          guild_id: msg.guild.id,
        }
      : undefined,
    allowedMentions: ping
      ? undefined
      : {
          repliedUser: false,
        },
  };
  return await target.send(msgOptions);
};

export const sendToChannels = async (discordClient, text, channels) => {
  const foundChannels = channels
    .reduce((array, channelToSend) => {
      const fc = discordClient.channels.cache.filter(
        (el) => el.id === channelToSend
      );
      array.push(...fc);
      return array;
    }, [])
    .map((el) => el[1]);

  foundChannels.forEach((channel) => {
    channel.send(text).catch((e) => {
      console.error(`Couldn't send text to ${channel.name}, ${e}`);
    });
  });
};

export const fillMessage = async (msg) => {
  if (msg.partial) {
    return await msg.fetch().catch((e) => {
      console.error(`Couldn't fetch message ${getMsgInfo(msg)}:`, e);
    });
  }

  return msg;
};
function chunkSubstr(str, size) {
  const numChunks = Math.ceil(str.length / size);
  const chunks = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks;
}
export const reply = async (
  msg,
  replyText,
  attachment = undefined,
  ping = false,
  ephemeral = true
) => {
  console.log("ephemeral ", ephemeral);
  if (replyText.length <= DISCORD_BOT_MAX_MESSAGE) {
    return msg.reply({
      content: replyText,
      allowedMentions: ping
        ? undefined
        : {
            repliedUser: false,
          },
      ephemeral: ephemeral,
      files: attachment ? [{ attachment }] : undefined,
    });
  } else {
    const chunks = chunkSubstr(replyText, DISCORD_BOT_MAX_MESSAGE);
    chunks.forEach((chunk) => {
      msg.channel.send({ content: chunk });
    });
  }
};

export const replyEmbed = async (
  msg,
  replyEmbedArray,
  ping = false,
  ephemeral = true
) => {
  return msg.reply({
    embeds: replyEmbedArray,
    allowedMentions: ping
      ? undefined
      : {
          repliedUser: false,
        },
    ephemeral: ephemeral,
  });
};

export const replyEmbedMessage = async (
  msg,
  stringMessage,
  ping = false,
  ephemeral = true
) => {
  return msg.reply({
    embeds: [
      new EmbedBuilder().setColor(PEKO_COLOR).setDescription(stringMessage),
    ],
    allowedMentions: ping
      ? undefined
      : {
          repliedUser: false,
        },
    ephemeral: ephemeral,
  });
};
export const followUpEmbedMessage = async (
  msg,
  stringMessage,
  ping = false,
  ephemeral = true
) => {
  return msg.followUp({
    embeds: [
      new EmbedBuilder().setColor(PEKO_COLOR).setDescription(stringMessage),
    ],
    allowedMentions: ping
      ? undefined
      : {
          repliedUser: false,
        },
    ephemeral: ephemeral,
  });
};
export const sendEmbedMessage = async (
  target,
  stringMessage,
  ping = false,
  ephemeral = true
) => {
  return target.send({
    embeds: [
      new EmbedBuilder().setColor(PEKO_COLOR).setDescription(stringMessage),
    ],
    allowedMentions: ping
      ? undefined
      : {
          repliedUser: false,
        },
    ephemeral: ephemeral,
  });
};
export const sendWithAttachment = async (
  target,
  stringMessage,
  bufferText,
  fileName,
  ping = false,
  ephemeral = true
) => {
  return target.send({
    content: stringMessage,
    files:
      bufferText && fileName
        ? [
            {
              attachment: bufferText,
              name: fileName,
            },
          ]
        : undefined,
    allowedMentions: ping
      ? undefined
      : {
          repliedUser: false,
        },
    ephemeral: ephemeral,
  });
};

export const sendCustomEmbed = async (
  target,
  stringText = undefined,
  title = undefined,
  stringMessage = undefined,
  url = undefined,
  link = undefined,
  footerString = undefined,
  timeStamp = undefined,
  ephemeral = true
) => {
  const embed = new EmbedBuilder().setColor(PEKO_COLOR);

  if (stringMessage) {
    embed.setDescription(stringMessage);
  }
  if (title) {
    embed.setTitle(title);
  }
  if (url) {
    embed.setImage(url);
  }
  if (link) {
    embed.setURL(link);
  }
  if (footerString) {
    embed.setFooter({ text: footerString });
  }
  if (timeStamp) {
    embed.setTimestamp(timeStamp);
  }
  return target.send({
    content: stringText,
    embeds: [embed],
    ephemeral: ephemeral,
  });
};

export const replyCustomEmbed = async (
  msg,
  title,
  stringMessage,
  url,
  link,
  footerString,
  ephemeral = true,
  ping = false
) => {
  const embed = new EmbedBuilder().setColor(PEKO_COLOR);

  if (stringMessage) {
    embed.setDescription(stringMessage);
  }
  if (title) {
    embed.setTitle(title);
  }
  if (url) {
    embed.setImage(url);
  }
  if (link) {
    embed.setURL(link);
  }
  if (footerString) {
    embed.setFooter({ text: footerString });
  }
  return msg.reply({
    embeds: [embed],
    ephemeral: ephemeral,
    allowedMentions: ping
      ? undefined
      : {
          repliedUser: false,
        },
  });
};
export const followUpCustomEmbed = async (
  msg,
  title,
  stringMessage,
  url,
  link,
  footerString,
  pingRole,
  ephemeral = true
) => {
  const embed = new EmbedBuilder().setColor(PEKO_COLOR);

  if (stringMessage) {
    embed.setDescription(stringMessage);
  }
  if (title) {
    embed.setTitle(title);
  }
  if (url) {
    embed.setImage(url);
  }
  if (link) {
    embed.setURL(link);
  }
  if (footerString) {
    embed.setFooter({ text: footerString });
  }
  return await msg.followUp({
    content: pingRole ? `${pingRole}` : undefined,
    embeds: [embed],
    ephemeral: ephemeral,
    allowedMentions: pingRole
      ? {
          repliedUser: false,
          parse: ["roles"],
        }
      : undefined,
  });
};
export const getPermissions = (interaction) => {
  const permissions = interaction.memberPermissions;
  return permissions.serialize();
};

export const checkPermissions = (interaction) => {
  const perms = getPermissions(interaction);

  if (!perms.ManageChannels) {
    throw "Permission denied.";
  }
};
export function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function sleep(fn, sleepTime, ...args) {
  await timeout(sleepTime);
  return fn(...args);
}
export async function fetchMessage(discordClient, targetData) {
  let guild = await discordClient.guilds.cache.get(targetData.guildId);
  if (!guild) {
    guild = await discordClient.guilds.fetch(targetData.guildId).catch((e) => {
      // this is fine.
    });
  }
  if (!guild) {
    return undefined;
  }
  let channel = await guild.channels.cache.get(targetData.channelId);
  if (!channel) {
    channel = await guild.channels.fetch(targetData.channelId).catch((e) => {
      // this is not really fine.
      console.log(`Unknown channel:`, e);
    });
  }
  if (!channel) {
    return undefined;
  }
  let message = await channel.messages.cache.get(targetData.messageId);
  if (!message) {
    message = await channel.messages.fetch(targetData.messageId).catch((e) => {
      // this is not really fine.
      console.log(`Unknown message:`, e);
    });
  }
  if (!message) {
    return undefined;
  }

  return message;
}

export async function fetchMessages(
  channel,
  startId,
  endId,
  limit = MAX_FETCH
) {
  const toReturn = [];
  let lastId;

  while (true) {
    console.log("msg count: ", toReturn.length, "...");
    const options = {
      limit: Math.min(limit, FETCH_CHUNK),
      cache: true,
      after: startId, // The date time you want it from
    };
    if (lastId) {
      options.after = lastId;
    }

    const messages = await channel.messages.fetch(options).catch((e) => {
      console.error(`Couldn't fetch messages for channel ${channel?.name}:`, e);
    });
    if (!messages || messages.size === 0) {
      return toReturn;
    }
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

    if (values.length < FETCH_CHUNK || toReturn.length > limit) {
      break;
    }
  }

  return toReturn;
}
