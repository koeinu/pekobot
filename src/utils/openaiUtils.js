import dotenv from "dotenv";
import {
  DDF_SERVER,
  MIKO_SERVER,
  PEKO_SERVER,
  TEST_SERVER,
  TEST_SERVER_2,
} from "./ids/guilds.js";
import { ASSISTANT_CHANNELS, RP_CHANNELS } from "./ids/channels.js";
import { get_encoding } from "tiktoken";

dotenv.config();

const populateRPContext = (msg, rpSettings) => {
  const systemContext = [];
  systemContext.push({
    role: "system",
    content: `Write next ${rpSettings.name}'s reply in this fictional chat with user ${msg.author.globalName}. 
        Keep it simple. Decide only what ${rpSettings.name} does or says. 
        Use Internet roleplay style: characters speech is written in usual text without quotation marks, and actions are written in italic in third person. 
        Be initiative, proactive, creative, drive the conversation and story forward using ${rpSettings.name} actions or random events. 
        Always stay in character. 
        `,
  });
  if (
    rpSettings["characterInstructions"] &&
    rpSettings["characterInstructions"].length > 0
  ) {
    systemContext.push({
      role: "system",
      content: `Character Instructions: ${rpSettings[
        "characterInstructions"
      ].join(" ")}`,
    });
  }
  if (rpSettings["traits"] && rpSettings["traits"].length > 0) {
    systemContext.push({
      role: "system",
      content: `Traits: ${rpSettings["traits"].join(" ")}`,
    });
  }
  if (rpSettings["appearances"] && rpSettings["appearances"].length > 0) {
    systemContext.push({
      role: "system",
      content: `${rpSettings.name}'s appearance: ${rpSettings[
        "appearances"
      ].join(" ")}`,
    });
  }

  return systemContext;
};

const populateAssistantContext = (msg, settings) => {
  const systemContext = [];
  systemContext.push({
    role: "system",
    content: `You are an assistant bot at a discord server named ${msg.guild.name}. 
      Your creator is Hermit. 
      Your name is ${settings.name}. 
      You are participating in a dialogue in a channel named ${msg.channel.name}. Write the ${settings.name}'s next reply in the dialogue. 
      Currently, you are unable to use live search. It prevents you from performing tasks like telling weather or latest news. Be aware of that.
      `,
  });

  return systemContext;
};

const populateAssistantSemiRPContext = (msg, settings) => {
  const systemContext = [];
  if (settings.speechInstructions && settings.speechInstructions.length > 0) {
    systemContext.push({
      role: "system",
      content: `Speech instructions: ${settings.speechInstructions.join(" ")}`,
    });
  }
  if (settings.trivia && settings.trivia.length > 0) {
    systemContext.push({
      role: "system",
      content: `Information and trivia about ${
        settings.inspiration
      }: ${settings.trivia.join(" ")}`,
    });
  }
  return systemContext;
};

const doAssistantSemiRP = (msg) =>
  !ASSISTANT_CHANNELS.includes(msg.channel.id) && msg.guild.id !== DDF_SERVER;

export const messageContextArray = (msg, settings) => {
  const rpMode = RP_CHANNELS.includes(msg.channel.id);
  const rpSettings =
    rpMode && settings.extendedRp
      ? settings.extendedRp[msg.channel.name]
      : undefined;
  const systemContext = [
    { role: "system", content: `Current time: ${new Date().toUTCString()}.` },
  ];
  if (rpSettings) {
    systemContext.push(...populateRPContext(msg, rpSettings));
  } else {
    // usual assistant
    systemContext.push(...populateAssistantContext(msg, settings));
    if (doAssistantSemiRP(msg)) {
      systemContext.push(...populateAssistantSemiRPContext(msg, settings));
    }
  }

  return systemContext;
};

const encoder = get_encoding("cl100k_base");

export function estimateGrokTokens(prompt = "", completion = "") {
  const p = typeof prompt === "string" ? prompt : "";
  const c = typeof completion === "string" ? completion : "";

  const promptTokens = encoder.encode(p).length;
  const completionTokens = encoder.encode(c).length;
  const totalTokens = promptTokens + completionTokens;

  // Optional sanity-check logging
  console.log({
    promptTokens,
    completionTokens,
    totalTokens,
    promptChars: p.length,
    completionChars: c.length,
    roughPromptEst: Math.ceil(p.length / 4),
    roughCompletionEst: Math.ceil(c.length / 4),
  });

  return { promptTokens, completionTokens, totalTokens };
}

export const serverRules = (msg, settings) => {
  const guildId = msg.guild.id;
  const rpMode = RP_CHANNELS.includes(msg.channel.id);
  const rpSettings =
    rpMode && settings.extendedRp
      ? settings.extendedRp[msg.channel.name]
      : undefined;
  if (rpSettings || ASSISTANT_CHANNELS.includes(msg.channel.id)) {
    return [];
  }

  let rules = `Server rules:
  1. Don't say anything controversial or sexual.
  2. Reply in the same language as the previous message in the conversation.
  `;

  const extendedRules = `3. Don't pretend to be anyone else in any situation.
  4. When speaking about vtubers, you are allowed to talk about their lore and public information. Don't disclose any private or real life information.
  5. Respond only with statements. Don't ask anything and don't try to continue the dialogue.
  `;

  // static rules
  switch (guildId) {
    case PEKO_SERVER:
    case MIKO_SERVER:
    case TEST_SERVER:
    case TEST_SERVER_2: {
      rules += extendedRules;
      break;
    }
    default: {
      break;
    }
  }

  return [
    {
      role: "system",
      content: rules,
    },
  ];
};
