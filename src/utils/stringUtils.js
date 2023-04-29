import fetch from "isomorphic-fetch";

import dotenv from "dotenv";
import { botInspiration } from "./openaiUtils.js";
import { canIncreaseCounter, increaseCounter } from "../model/counter.js";
import { ApiUtils } from "./apiUtils.js";

dotenv.config();
const botName = process.env.BOT_NAME;
export const MAX_BET_LENGTH = 20;
export const MAX_CATEGORY_LENGTH = 40;
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

export const formChainGPTPrompt = async (msgStructList, rpMode = false) => {
  const msgs = (
    await Promise.all(
      msgStructList.map(async (msgStruct) => {
        const extractedText = await extractCommandMessage(msgStruct.msg);
        const extractedName = msgStruct.username;
        const finalName =
          rpMode && extractedName === botName ? botInspiration : extractedName;

        return extractedText && extractedText.length > 0
          ? `${finalName}: ${extractedText}`
          : undefined;
      })
    )
  ).filter((el) => el !== undefined);
  const finalMsgArray = [];
  const reversedMsgs = msgs.reverse();
  for (let m of reversedMsgs) {
    if (finalMsgArray.map((el) => el.content).join("\n").length < 3000) {
      finalMsgArray.push(m);
    }
  }
  finalMsgArray.reverse();
  const toReturn =
    finalMsgArray.length > 0
      ? [
          `{Current dialog starts here:}`,
          finalMsgArray.join("\n"),
          `${rpMode ? botInspiration : botName}:`,
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

// preferring embed description text
export const getTextMessageContent = async (
  msg,
  canOCR,
  silentAttachments = false
) => {
  const parts = [];
  let countObject = undefined;
  const messageText = extractCommandMessage(
    msg.content !== undefined ? msg.content : msg.text
  );
  if (messageText && messageText.length > 0) {
    parts.push(
      extractCommandMessage(msg.content !== undefined ? msg.content : msg.text)
    );
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
    } else if (canOCR) {
      const imageUrl = parseAttachmentUrl(msg);

      console.log(`translating image`);

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
  if (msg.embeds.length > 0) {
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

  return { countObject, text: parts.join("\n") };
};

export const formatTLText = (text, isGpt) =>
  isGpt
    ? `<:openai:1099665985784520824> **TL:** \`${text}\``
    : `<:deepl:1070332970424090704> **DeepL:** \`${text}\``;

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
    `TL time: ${((timeMs || 0) / 1000).toFixed(0)}s` +
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
      trimmedText = trimmedText.slice(5).trim();
      return "[Chat] " + trimmedText;
    case "tl":
      return "[TL] " + trimmedText;
  }
}
