// eslint-disable-next-line no-unused-vars
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { OpenAIModerationChain } from "langchain/chains";

import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";

import dotenv from "dotenv";
import { listDictionary } from "../model/gptDict.js";
import {
  DDF_SERVER,
  MIKO_SERVER,
  PEKO_SERVER,
  TEST_SERVER,
  TEST_SERVER_2,
} from "./ids/guilds.js";
import { ASSISTANT_CHANNELS, RP_CHANNELS } from "./ids/channels.js";

dotenv.config();

import PQueue from "p-queue";
const queue = new PQueue({ concurrency: 1 });

import { parseHashtags } from "./stringUtils.js";

const MODEL = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 1,
});
const GPTL_MODEL = new ChatOpenAI({ temperature: 0, model: "gpt-4o" });

const MODERAIION_MODEL = new OpenAIModerationChain({
  throwError: true,
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
  // console.log(`Moderation result: ${JSON.stringify(result.data?.results)}`);
  if (result.results) {
    if (result.results.length > 0) {
      const data = result.results[0];
      return fixModData(data);
    }
  }
  console.error(`Couldn't get moderation results: ${result}`);
  return undefined;
};

export const messageContextArray = (msg, settings) => {
  const rpMode = RP_CHANNELS.includes(msg.channel.id);
  const rpSettings =
    rpMode && settings.extendedRp
      ? settings.extendedRp[msg.channel.name]
      : undefined;
  const systemContext = [
    ["system", `Current date and time: ${new Date().toUTCString()}.`],
  ];
  if (rpSettings) {
    // RP mode
    systemContext.push(
      [
        "system",
        `Write next ${rpSettings.name}'s reply in this fictional chat.`,
      ],
      [
        "system",
        `Keep it simple. Decide only what ${rpSettings.name} does or says.`,
      ],
      [
        "system",
        `Use Internet roleplay style: no quotation marks, user actions are written in italic and in third person.`,
      ],
      [
        "system",
        `Be initiative, proactive, creative, drive the conversation and story forward using ${rpSettings.name} actions or random events.`,
      ],
      ["system", `Always stay in character.`]
    );
    if (rpSettings["characterInstructions"]) {
      systemContext.push([
        "system",
        `Character Instructions: ${rpSettings["characterInstructions"].join(
          " "
        )}`,
      ]);
    }
    if (rpSettings["traits"]) {
      systemContext.push([
        "system",
        `Traits: ${rpSettings["traits"].join(" ")}`,
      ]);
    }
    if (rpSettings["appearances"]) {
      systemContext.push([
        "system",
        `${rpSettings.name}'s appearance: ${rpSettings["appearances"].join(
          " "
        )}`,
      ]);
    }
  } else {
    systemContext.push(
      [
        "system",
        `You are an assistant bot at a discord server named ${msg.guild.name}`,
      ],
      ["system", `Your creator is Hermit.`],
      ["system", `Your name is ${settings.name}.`],
      [
        "system",
        `You are participating in a dialogue in a channel named ${msg.channel.name}. Write the ${settings.name}'s next reply in the dialogue.`,
      ]
    );
    if (
      !ASSISTANT_CHANNELS.includes(msg.channel.id) &&
      msg.guild.id !== DDF_SERVER
    ) {
      if (settings.speechInstructions) {
        systemContext.push([
          "system",
          `Speech instructions: ${settings.speechInstructions.join(" ")}`,
        ]);
      }
      if (settings.trivia) {
        systemContext.push([
          "system",
          `Information and trivia about ${
            settings.inspiration
          }: ${settings.trivia.join(" ")}`,
        ]);
      }
    }
  }

  return systemContext;
};

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
  const serverRules = [
    ["system", `Server rules:`],
    ["system", "1. Don't say anything controversial or sexual."],
    [
      "system",
      "2. Reply in the same language as the previous message in the conversation.",
    ],
  ];

  // static rules
  switch (guildId) {
    case PEKO_SERVER:
    case MIKO_SERVER:
    case TEST_SERVER:
    case TEST_SERVER_2: {
      serverRules.push(
        ["system", "3. Don't pretend to be anyone else in any situation."],
        [
          "system",
          "4. When speaking about vtubers, you are allowed to talk about their lore and public information. Don't disclose any private or real life information.",
        ],
        [
          "system",
          "5. Respond only with statements. Don't ask anything and don't try to continue the dialogue.",
        ]
      );
      break;
    }
    default: {
      break;
    }
  }

  return serverRules;
};

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
      )}, other]. If there is no good option, respond 'other'. Any message about love, marriage or lewd things should be responded with 'other'.`
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

export const gptMood = async (text, settings, moodsArray, reactMode) => {
  const initialLine = reactMode
    ? `Determine the mood ${settings.inspiration} would react to the following.`
    : `Determine the mood of a message.`;
  const messages = [
    new SystemMessage(
      `${initialLine} You may choose one of moods from set [${moodsArray.join(
        ", "
      )}, other]. If there is no good option, respond 'other'. Any message about love, marriage or lewd things should be responded with 'blush'.`
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
      "Translate the following to English, preserving the original text structure and writing style. Leave untranslated and unformatted any hashtags, weird symbols and kaomojis."
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

const messageHistories = {};

// throws
export const gpt = (messages, id, input) => {
  const prompt = ChatPromptTemplate.fromMessages([
    ...messages,
    ["placeholder", "{chat_history}"],
    ["human", "{input}"],
  ]);

  const chain = prompt.pipe(MODEL);

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
