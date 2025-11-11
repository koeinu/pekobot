import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { parseHashtags } from "../stringUtils.js";
import { listDictionary } from "../../model/gptDict.js";
import dotenv from "dotenv";

dotenv.config();
const API_KEY = process.env.OPENAI_API_KEY;
const GPTL_MODEL = new ChatOpenAI({
  temperature: 0,
  model: "gpt-4o",
  apiKey: API_KEY,
});

export const gptGetLanguage = async (text) => {
  const messages = [
    new SystemMessage(
      "Determine the primary language of the following, reply with the language code."
    ),
    new HumanMessage(text),
  ];

  return GPTL_MODEL.invoke(messages).then((aiMessage) => {
    return {
      text: aiMessage.content,
      data: {
        pt: aiMessage.response_metadata.tokenUsage.promptTokens,
        ct: aiMessage.response_metadata.tokenUsage.completionTokens,
      },
    };
  });
};

export const gptl = async (msg, settings, text) => {
  const hashTags = parseHashtags(text);
  let textWithoutHashtags = text;
  if (hashTags) {
    hashTags.forEach((tag) => {
      textWithoutHashtags = textWithoutHashtags.replace(tag, "").trim();
    });
  }

  if (textWithoutHashtags.length === 0) {
    return {
      text: text,
      data: {
        pt: 0,
        ct: 0,
      },
    };
  }

  const dict = listDictionary(msg ? msg.guild.id : undefined);
  const entries = Object.entries(dict).map((el) => ({
    src: el[0],
    tl: el[1],
  }));
  const messages = [
    new SystemMessage(
      "Translate the following to English, but preserve the original text structure, writing style, formatting, hashtags, symbols and kaomojis."
    ),
    new SystemMessage(
      `Additional slang dictionary: ${entries
        .map((el) => `${el.src} = ${el.tl}`)
        .join("; ")}.`
    ),
    new HumanMessage(text),
  ];

  return GPTL_MODEL.invoke(messages).then((aiMessage) => {
    return {
      text: aiMessage.content,
      data: {
        pt: aiMessage.response_metadata.tokenUsage.promptTokens,
        ct: aiMessage.response_metadata.tokenUsage.completionTokens,
      },
    };
  });
};
