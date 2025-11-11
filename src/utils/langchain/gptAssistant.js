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

const MESSAGE_HISTORY_SIZE = 20;
const messageHistories = {};

dotenv.config();
const API_KEY = process.env.OPENAI_API_KEY;

const MODEL = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
  apiKey: API_KEY,
});

export const gpt = (messages, id, input) => {
  const prompt = ChatPromptTemplate.fromMessages([
    ...messages,
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
