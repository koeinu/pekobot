// throws
import dotenv from "dotenv";
import { ChatXAI } from "@langchain/xai";
import { estimateGrokTokens } from "../openaiUtils.js";

dotenv.config();
const API_KEY = process.env.XAI_API_KEY;

export const RP_MODEL = new ChatXAI({
  model: "grok-4-fast-non-reasoning",
  temperature: 1,
  apiKey: API_KEY,
});

export const roleplayGrok = (messages, id, input) => {
  return RP_MODEL.invoke([...messages, ...input.reverse()], {
    configurable: {
      sessionId: id,
    },
  }).then((aiMessage) => {
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
