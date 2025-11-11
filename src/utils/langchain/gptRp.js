// throws
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();
const API_KEY = process.env.OPENAI_API_KEY;

export const RP_MODEL = new ChatOpenAI({
  model: "gpt-4o-2024-05-13",
  temperature: 1,
  apiKey: API_KEY,
});

export const roleplayGpt = (messages, id, input) => {
  return RP_MODEL.invoke([...messages, ...input.reverse()], {
    configurable: {
      sessionId: id,
    },
  }).then((aiMessage) => {
    return {
      text: aiMessage.content,
      data: {
        pt: aiMessage.response_metadata.tokenUsage.promptTokens,
        ct: aiMessage.response_metadata.tokenUsage.completionTokens,
      },
    };
  });
};
