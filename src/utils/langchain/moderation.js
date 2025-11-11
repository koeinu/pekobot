import { OpenAIModerationChain } from "@langchain/classic/chains";
import dotenv from "dotenv";

dotenv.config();
const API_KEY = process.env.OPENAI_API_KEY;
const MODERAIION_MODEL = new OpenAIModerationChain({
  apiKey: API_KEY,
});

export const MOD_THRESHOLDS = {
  sexual: 0.8,
  hate: 0.92,
  violence: 0.92,
  "self-harm": 0.75,
  "sexual/minors": 0.5,
  "hate/threatening": 0.6,
  "violence/graphic": 0.6,
};

const fixModData = (data) => {
  data.flagged = false;
  Object.entries(data.category_scores).forEach(([category, value]) => {
    const decision = value > MOD_THRESHOLDS[category];
    data.categories[category] = decision;
    if (decision) {
      data.flagged = true;
    }
  });
  return data;
};

export const moderateMessage = async (msg) => {
  const result = await MODERAIION_MODEL.invoke({
    input: msg.content,
  });
  console.log(`Moderation result: ${JSON.stringify(result.data?.results)}`);
  if (result.results) {
    if (result.results.length > 0) {
      const data = result.results[0];
      return fixModData(data);
    }
  }
  console.error(`Couldn't get moderation results: ${result}`);
  return undefined;
};
