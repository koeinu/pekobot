import dotenv from "dotenv";
import { MessageType } from "discord.js";
import { getOptions } from "./discordUtils.js";

dotenv.config();

const getMessage = (msg) => {
  if (!msg) {
    return "...";
  }
  if (msg.content && msg.content.length > 0) {
    return msg.content;
  }
  if (msg.embeds && msg.embeds.length > 0) {
    return msg.embeds[0].data.description;
  }
  return "...";
};

export const gatherSlashCommandInfo = (interaction) => {
  const options = getOptions(interaction);
  const values = options.map((el) => JSON.stringify(el.value));
  const sc = interaction.options._subcommand;
  const parts = [interaction.commandName];
  if (sc) {
    parts.push(sc);
  }
  parts.push(`at ${getMsgInfo(interaction)} |`);
  parts.push(...values);
  return parts;
};

export const getMsgInfo = (msg) => {
  return `msg: ${getMessage(msg)} in ${msg?.channel?.name || "<no channel>"}, ${
    msg?.guild?.name || "<no guild>"
  } (${msg?.url || "---"})`;
};

export const getGptReplyChain = async (msg, msgChain = [msg]) => {
  if (!msg) {
    return msgChain.filter((el) => el !== undefined);
  }
  if (msg.type === MessageType.Reply) {
    const repliedToMessage = await msg.channel.messages
      .fetch(msg.reference.messageId)
      .catch((e) => {
        console.error(
          `Couldn't fetch reply message for ${getMsgInfo(msg)}:`,
          e
        );
      });
    msgChain.push(repliedToMessage);
    await getGptReplyChain(repliedToMessage, msgChain);
  }

  return msgChain.filter((el) => el !== undefined);
};

export const formatTLText = (text, isGpt) => {
  // return isGpt
  //   ? `<:openai:1099665985784520824> **TL:** ${text}`
  //   : `<:deepl:1070332970424090704> **DeepL:** ${text}`;
  return isGpt ? `**TL:** ${text}` : `**DeepL:** ${text}`;
};

export const parseSingleAttachmentUrl = (option) => {
  return option.attachment.url;
};

export const formatMSToHMS = (ts) => {
  const d = new Date(ts);
  return `${d.getUTCHours()}h${d.getUTCMinutes()}m${d.getUTCSeconds()}s`;
};
export const formatNewline = (...args) => args.join("\n");
