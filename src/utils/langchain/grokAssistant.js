// throws
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
  RunnableWithMessageHistory,
} from "@langchain/core/runnables";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { ChatXAI } from "@langchain/xai";
import dotenv from "dotenv";
import { estimateGrokTokens } from "../openaiUtils.js";

const MESSAGE_HISTORY_SIZE = 20;
const messageHistories = {};

dotenv.config();
const API_KEY = process.env.XAI_API_KEY;

const MODEL = new ChatXAI({
  model: "grok-4-fast-reasoning",
  temperature: 0,
  apiKey: API_KEY,
});

export const grok = (messages, id, input) => {
  const prompt = ChatPromptTemplate.fromMessages([
    ...messages,
    ["human", "{input}", "{name}"],
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
      const tokens = estimateGrokTokens(input, aiMessage.content);
      return {
        text: aiMessage.content,
        data: {
          pt: tokens.promptTokens,
          ct: tokens.completionTokens,
        },
      };
    });
};
