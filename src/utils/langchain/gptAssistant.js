// throws
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
  RunnableWithMessageHistory,
} from "@langchain/core/runnables";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { getRandomOmikuji } from "../omikuji.js";

const MESSAGE_HISTORY_SIZE = 20;
const messageHistories = {};
const OMIKUJI_REQUEST_PATTERN =
  /omikuji|o[\s-]?mikuji|おみくじ|御神籤|fortune\s*slip/i;

dotenv.config();
const API_KEY = process.env.OPENAI_API_KEY;

const MODEL = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
  apiKey: API_KEY,
});

const getLatestUserText = (input) => {
  if (typeof input === "string") {
    return input;
  }
  if (!Array.isArray(input)) {
    return "";
  }
  for (let i = input.length - 1; i >= 0; i -= 1) {
    const message = input[i];
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
    if (message?.role === "system") {
      continue;
    }
    if (message?.content) {
      return message.content;
    }
  }
  return "";
};

const getOmikujiPromptMessages = (input) => {
  const latestUserText = getLatestUserText(input);
  if (!OMIKUJI_REQUEST_PATTERN.test(latestUserText)) {
    return [];
  }
  const result = getRandomOmikuji();
  console.log(`Omikuji draw for GPT prompt: ${result}`);
  return [
    {
      role: "system",
      content: `The user has mentioned an omikuji. A special code was triggered and generated a truly random draw of an omikuji: "${result}". In case the user ASKED to draw an omikuji, you must present exactly this one as a result, and play around it in English following your character role. If user DIDN'T ask to draw one and just mentioned it, DO NOT use this generated draw result.`,
    },
  ];
};

export const gpt = (messages, id, input) => {
  const prompt = ChatPromptTemplate.fromMessages([
    ...messages,
    ...getOmikujiPromptMessages(input),
    ["human", "{input}"],
  ]);

  const filterMessages = (_input) =>
    _input.chat_history.slice(-MESSAGE_HISTORY_SIZE);

  const chain = RunnableSequence.from([
    RunnablePassthrough.assign({
      chat_history: filterMessages,
    }),
    prompt,
    MODEL,
  ]);

  const withMessageHistory = new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: async (sessionId) => {
      if (messageHistories[sessionId] === undefined) {
        messageHistories[sessionId] = new InMemoryChatMessageHistory();
      }
      return messageHistories[sessionId];
    },
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
  });
  return withMessageHistory
    .invoke(
      {
        input: input,
      },
      {
        configurable: {
          sessionId: id,
        },
      }
    )
    .then((aiMessage) => {
      return {
        text: aiMessage.content,
        data: {
          pt: aiMessage.response_metadata.tokenUsage.promptTokens,
          ct: aiMessage.response_metadata.tokenUsage.completionTokens,
        },
      };
    });
};
