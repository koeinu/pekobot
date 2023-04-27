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

export const formChainGPTPrompt = (msgStructList) => {
  return `Write your next answer to the following conversation:\n${msgStructList
    .map((msgStruct) => {
      const extractedText = extractCommandMessage(msgStruct.msg);
      const extractedName = msgStruct.username;

      return `${extractedName}: ${extractedText}`;
    })
    .join("\n")}`;
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
export const getTextMessageContent = (msg) => {
  let toReturn = extractCommandMessage(
    msg.content !== undefined ? msg.content : msg.text
  );
  if (msg.embeds.length > 0) {
    const embedContent = msg.embeds[0].description;
    if (embedContent && embedContent.length > 0) {
      toReturn = embedContent;
    }
  }

  return toReturn;
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
  const regex = /[\[](START|END)[\]]/g;
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
