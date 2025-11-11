import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
  apiKey: API_KEY,
});

export const gptReaction = async (text, settings, actionsArray, reactMode) => {
  if (!reactMode) {
    return Promise.resolve({ text: undefined });
  }
  const messages = [
    new SystemMessage(
      `Guess an action ${
        settings.inspiration
      } would react with to the following. Polite requests may be answered with an affirmative action even if it doesn't fit the character's personality. To answer you may only choose one of actions from set [${actionsArray.join(
        ", "
      )}, other]. If there is no good option, respond 'other'. Any message about love, marriage or lewd things must be responded with 'other'.`
    ),
    new HumanMessage(text),
  ];

  return MODEL.invoke(messages).then((aiMessage) => {
    return {
      text: aiMessage.content,
      data: {
        pt: aiMessage.response_metadata.tokenUsage.promptTokens,
        ct: aiMessage.response_metadata.tokenUsage.completionTokens,
      },
    };
  });
};

export const gptMood = async (text, settings, moodsArray, reactMode) => {
  const initialLine = reactMode
    ? `Analyze the sentiment of the following message and determine the mood ${settings.inspiration} would react to it.`
    : `Analyze the sentiment of the following message and determine the mood of it.`;
  const messages = [
    new SystemMessage(
      `${initialLine} You may choose one of moods from set [${moodsArray.join(
        ", "
      )}, other]. If there is no good option, respond 'other'. Any message about love, marriage or lewd things must be responded with 'blush'.`
    ),
    new HumanMessage(text),
  ];

  return MODEL.invoke(messages).then((aiMessage) => {
    return {
      text: aiMessage.content,
      data: {
        pt: aiMessage.response_metadata.tokenUsage.promptTokens,
        ct: aiMessage.response_metadata.tokenUsage.completionTokens,
      },
    };
  });
};
