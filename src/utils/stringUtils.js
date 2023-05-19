import fetch from "isomorphic-fetch";

import dotenv from "dotenv";
import { canIncreaseCounter, increaseCounter } from "../model/counter.js";
import { ApiUtils } from "./apiUtils.js";
import extractUrls from "extract-urls";
import { getTweetChainTextParts } from "./twitterUtils.js";
import { getYoutubeVideoInfo } from "./youtubeUtils.js";
import { MessageType } from "discord.js";
import { MOD_THRESHOLDS } from "./openaiUtils.js";
import {
  GPT_INFORMATIVE_CONTENT_LIMIT_CHAR,
  MAX_TL_TAG_LENGTH,
  S_MS,
} from "./constants.js";
import { getOptions } from "./discordUtils.js";

dotenv.config();

export const validateString = (betValue, maxLength) => {
  if (betValue.length === 0) {
    throw "The argument is empty.";
  }
  // eslint-disable-next-line no-useless-escape
  if (betValue.match(/[@{}\[\]$#*_|~`>=]/)) {
    throw `The '${betValue}' argument contains prohibited symbols.`;
  }
  if (maxLength !== undefined && betValue.length > maxLength) {
    throw `The argument '${betValue}' is too long.`;
  }
};

export const formGPTPrompt = (repliedUsername, repliedText, username, text) => {
  const extractedText = extractCommandMessage(text);

  if (repliedText && repliedUsername) {
    if (extractedText.length === 0) {
      return `${repliedText}`;
    } else {
      return `${repliedUsername}: ${repliedText}\n${username}: ${extractedText}`;
    }
  } else if (extractedText.length > 0) {
    return `${extractedText}`;
  }
  return "";
};

export const formChainGPTPrompt = async (
  msgStructList,
  settings,
  rpSettings = undefined
) => {
  const msgs = (
    await Promise.all(
      msgStructList.map(async (msgStruct) => {
        const extractedText = await extractCommandMessage(msgStruct.msg);
        const extractedName = msgStruct.username;
        const finalName =
          rpSettings && extractedName === settings.name
            ? rpSettings.nickname
            : extractedName;

        return extractedText && extractedText.length > 0
          ? `${finalName}: ${extractedText}`
          : undefined;
      })
    )
  ).filter((el) => el !== undefined);
  const finalMsgArray = [];
  const reversedMsgs = msgs.reverse();
  for (let m of reversedMsgs) {
    if (
      finalMsgArray.map((el) => el).join("\n").length <
      GPT_INFORMATIVE_CONTENT_LIMIT_CHAR
    ) {
      finalMsgArray.push(m);
    }
  }

  finalMsgArray.reverse();
  const toReturn =
    finalMsgArray.length > 0
      ? [
          `{Current dialog starts here:}`,
          finalMsgArray.join("\n"),
          `${rpSettings?.nickname || settings.name}:`,
        ]
      : [];
  return toReturn.join("\n");
};

export const extractCommandMessage = (str) => {
  if (!str) {
    return "";
  }
  if (str.indexOf("~") === 0) {
    const command = str.match(/~[a-z]*/);
    if (command.length > 0) {
      return str.slice(command[0].length).trim();
    }
  }
  return str.trim();
};
function parseDiscordLink(link) {
  let splitLink = link.split("/");
  if (splitLink.includes("discord.com") && splitLink.includes("channels")) {
    let guildId = splitLink[splitLink.length - 3];
    let messageId = splitLink[splitLink.length - 1];
    let channelId = splitLink[splitLink.length - 2];
    return {
      guildId: guildId,
      messageId: messageId,
      channelId: channelId,
    };
  } else {
    return undefined;
  }
}

export const parseHashtags = (text) => {
  if (typeof text !== "string") {
    throw new TypeError("Expected a text");
  }

  let matcher = /[#＃][\S]+[\s|\n]*/g;
  return text.match(matcher);
};

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

export const gatherModerateMessageInfo = (msg, triggerData) => {
  const parts = [];
  parts.push(`${msg.url}`);
  parts.push(
    `Reasons: ${Object.entries(triggerData.categories)
      .filter((el) => el[1])
      .map((el) => {
        const category = el[0];
        return `${category}: ${triggerData.category_scores[category]} > ${MOD_THRESHOLDS[category]}`;
      })
      .join(", ")}`
  );
  parts.push(`Content: ${msg.content}`);
  return parts.join("\n");
};

export const gatherSlashCommandInfo = (interaction) => {
  const options = getOptions(interaction);
  const values = options.map((el) => JSON.stringify(el.value));
  const sc = interaction.options._subcommand;
  const parts = [interaction.commandName];
  if (sc) {
    parts.push(sc);
  }
  parts.push(`by ${interaction.author.username}`);
  parts.push(`at ${getMsgInfo(interaction)} |`);
  parts.push(...values);
  return parts;
};

export const getMsgInfo = (msg) => {
  return `msg: ${getMessage(msg)} in ${msg?.channel.name || "<no channel>"}, ${
    msg?.guild.name || "<no guild>"
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

export const getGptMessagesContents = async (msgChain) => {
  const list = msgChain.reverse();
  return Promise.all(
    list.map(async (el) => {
      const msgData = await getTextMessageContent(el, false, false, false);
      return {
        msg: msgData.text,
        username: el.author.username,
        originalMessage: msgData.originalMessage,
      };
    })
  );
};

export const splitGptDialogues = (msgChain) => {
  const result = [];
  msgChain.some((msg) => {
    if (msg.content === "---") {
      return true;
    } else {
      if (msg.content !== "~") {
        result.push(msg);
      }
      return false;
    }
  });

  return result;
};

// preferring embed description text
export const getTextMessageContent = async (
  msg,
  isTranslating,
  silentAttachments,
  recursionFlag
) => {
  const parts = [];
  let countObject = undefined;
  let parsedLinks = false;
  let messageText = extractCommandMessage(msg.content);

  if (!recursionFlag) {
    const urls = extractUrls(messageText);
    if (urls && urls.length > 0) {
      for (let url of urls) {
        const link = parseDiscordLink(url);
        if (link) {
          if (link.guildId === msg.guild.id) {
            const channel = await msg.client.channels._cache.get(
              link.channelId
            );
            if (!channel) {
              continue;
            }
            const message = await channel.messages
              .fetch(link.messageId)
              .catch((e) => {
                console.error(
                  `Couldn't fetch message for channel ${channel?.name}:`,
                  e
                );
              });
            if (message) {
              const messageContent = await getTextMessageContent(
                message,
                isTranslating,
                silentAttachments,
                true
              );
              parts.push(messageContent.text);
            }
          } else {
            messageText = messageText.replace(url, "");
          }
        }
      }
    }
  }

  const urls = extractUrls(messageText);
  if (!isTranslating && !silentAttachments && urls && urls.length > 0) {
    let testWithoutUrls = messageText;
    for (let parsedUrl of urls) {
      testWithoutUrls = testWithoutUrls.replace(parsedUrl, "").trim();
    }
    if (testWithoutUrls.length === 0) {
      // message is just a bunch of urls or other attachments..
      parts.push("Write your opinion about these attachments:");
    }
  }

  if (messageText && messageText.length > 0) {
    if (urls && urls.length > 0) {
      for (let parsedUrl of urls) {
        if (parsedUrl.includes("twitter.com")) {
          const tweetId = parsedUrl.match(/status\/[\d]+/g)[0].split("/")[1];

          const tweetPartsObjects = await getTweetChainTextParts(tweetId);
          const partsToMerge = silentAttachments
            ? [tweetPartsObjects.map((el) => el.text).join("\n---\n")]
            : [
                tweetPartsObjects.length > 1
                  ? "{Tweet conversation:}"
                  : "{Tweet attachment:}",
                tweetPartsObjects
                  .map((el) => `${el.userData.name} tweeted: '${el.text}'.`)
                  .join("\n"),
              ];

          messageText = messageText.replace(parsedUrl, partsToMerge.join("\n"));

          parsedLinks = true;
        } else if (
          parsedUrl.includes("youtube") ||
          parsedUrl.includes("youtu.be")
        ) {
          const info = await getYoutubeVideoInfo(parsedUrl, isTranslating);
          if (info) {
            const partsToMerge = silentAttachments
              ? [info]
              : ["{Video attachment:}", info];
            parsedLinks = true;
            messageText = messageText.replace(
              parsedUrl,
              partsToMerge.join("\n")
            );
          }
        }
      }
    }
    parts.push(messageText);
  }

  if (msg.attachments.size > 0) {
    const attachment = msg.attachments.first();
    if (attachment.name.includes(".txt")) {
      const url = attachment.url;
      const response = await fetch(url);
      const text = await response.text();
      if (!silentAttachments) {
        parts.push("Text attachment:");
      }
      parts.push(text);
    } else {
      const imageUrl = parseAttachmentUrl(msg);

      if (imageUrl !== undefined) {
        try {
          if (canIncreaseCounter("deepl")) {
            msg.channel.sendTyping().catch((e) => {
              console.error(`Couldn't send typing: ${e}`);
            });

            const text = await ApiUtils.OCRRequest(imageUrl, undefined, false);
            console.log("parsed OCR text: ", text);
            countObject = increaseCounter("deepl");
            if (!silentAttachments) {
              parts.push("Image attachment:");
            }
            parts.push(text);
          }
        } catch (errMsg) {
          console.error(errMsg);
        }
      }
    }
  }

  if (!parsedLinks) {
    msg.embeds.forEach((embed) => {
      const embedContent = embed.description;
      if (embedContent && embedContent.length > 0) {
        if (!silentAttachments) {
          parts.push("Embedded attachment:");
        }
        parts.push(embedContent);
      }
    });
  }

  return { countObject, text: parts.join("\n"), originalMessage: msg };
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

export const parseAttachmentUrl = (msg) => {
  const attachments = msg.attachments;
  return attachments.size > 0 ? [...attachments][0][1].url : undefined;
};

export const printBetResult = (userId, options) => {
  if (options.length > 1) {
    const betStringParts = options.map((option) => `${option.value}`);
    const betString = betStringParts.join(", ");
    return `<@${userId}> is betting for ${betString}.`;
  }
  return `<@${userId}> is betting for ${options[0].value}.`;
};

export const printUnbet = (userId) => {
  return `<@${userId}> called off their bet.`;
};

export const getCurrentMonthName = () => {
  const month = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const d = new Date();
  return month[d.getMonth()];
};

function extractMessageTags(str) {
  const regex = /[[](START|END)[\]]/g;
  return str.replace(regex, "").trim();
}

export const trimBrackets = (str) => {
  let tmp = str;

  tmp = extractMessageTags(tmp);
  while (tmp.charAt(0) === '"' && tmp.charAt(tmp.length - 1) === '"') {
    tmp = tmp.slice(1, -1);
  }

  return tmp;
};
export const printTLInfo = (countContainer, timeMs, metaData) => {
  return (
    (countContainer
      ? `${getCurrentMonthName()} OCR usage count: ${countContainer.value}/${
          countContainer.limit
        } | `
      : "") +
    `TL time: ${((timeMs || 0) / S_MS).toFixed(0)}s` +
    (metaData ? ` | ${metaData.pt}pt, ${metaData.ct}ct` : "")
  );
};
export const formatMSToHMS = (ts) => {
  const d = new Date(ts);
  return `${d.getUTCHours()}h${d.getUTCMinutes()}m${d.getUTCSeconds()}s`;
};
export const formatNewline = (...args) => args.join("\n");

export function formatTL(text) {
  let trimmedText = text.trim();
  const tlType =
    trimmedText.indexOf(">") === 0
      ? "summary"
      : trimmedText.indexOf("chat:") === 0
      ? "chat"
      : "tl";
  switch (tlType) {
    case "summary":
      trimmedText = trimmedText.slice(1).trim();
      return "[Summary] " + trimmedText;
    case "chat":
      trimmedText = trimmedText.slice("chat:".length).trim();
      return "[Chat] " + trimmedText;
    case "tl":
      return "[TL] " + trimmedText;
  }
}

export const isFormattedTl = (text) => {
  return (
    text.indexOf("[Summary]") === 0 ||
    text.indexOf("[Chat]") === 0 ||
    text.indexOf("[TL]") === 0
  );
};

export const textIsRelayTL = (trimmedText) => {
  if (
    trimmedText.indexOf("chat:") === 0 ||
    trimmedText.indexOf("chat;") === 0
  ) {
    return true;
  }
  const firstWord = trimmedText.match(/[a-zA-Z]+/i);
  // console.log("first word:", firstWord);
  if (
    firstWord &&
    (trimmedText.indexOf(":") === firstWord[0].length ||
      trimmedText.indexOf(";") === firstWord[0].length) &&
    firstWord[0].length <= MAX_TL_TAG_LENGTH &&
    !firstWord[0].includes("http")
  ) {
    return true;
  } else {
    return trimmedText.indexOf(">") === 0;
  }
};
