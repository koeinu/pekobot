import dotenv from "dotenv";
import { generateCommands } from "./generateCommands.js";

import {
  makeCompoundBetCommands,
  makeSimpleBetCommands,
} from "./commands/commandGenerators/bet.js";

import { convertJsonToParsed, JSON_FILE_NAME } from "./model/bets.js";
import fs from "node:fs";
import { getBotSettings } from "./model/botSettings.js";

dotenv.config();

const disabledCommands = {
  "584977240358518784": [
    "calendar",
    "youtube",
    "relay",
    "gptdraft",
    "custom_roles",
  ], // miko
  "999666683176308807": [
    "calendar",
    "jigsaw",
    "betedit",
    "gptDict",
    "youtube",
    "gptdraft",
    "custom_roles",
  ], // snaxxx
  "1061909810943115337": [], // ts
  "683140640166510717": ["calendar"], // peko
  "1088005181171580949": [], // ts2
};

export const makeCmds = async (settings) => {
  const disabledGuildCommands = {};
  settings.guildIds.forEach((id) => {
    disabledGuildCommands[id] = disabledCommands[id] || [];
  });
  const finalGuildCommands = {};

  const commandFiles = fs
    .readdirSync("./src/commands")
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    settings.guildIds.forEach((id) => {
      if (!finalGuildCommands[id]) {
        finalGuildCommands[id] = [];
      }
      if (
        !disabledGuildCommands[id] ||
        !disabledGuildCommands[id].find((dc) =>
          dc.toLowerCase().includes(file.toLowerCase().split(".")[0])
        )
      ) {
        finalGuildCommands[id].push(command.default.data.toJSON());
      }
    });
  }

  return { settings, commands: finalGuildCommands };
};

const processCommannds = (commandsData) => {
  const returnPromises = [];
  const settings = commandsData.settings;
  const guildCommandsData = commandsData.commands;
  Object.entries(guildCommandsData).forEach(([guildId, cmds]) => {
    const parsedData = convertJsonToParsed(JSON_FILE_NAME, guildId);
    console.log(parsedData);
    if (parsedData) {
      switch (parsedData.betType) {
        case 0:
          cmds.push(makeSimpleBetCommands().data.toJSON());
          break;
        case 1:
          cmds.push(makeCompoundBetCommands(parsedData.data).data.toJSON());
          break;
        default:
          break;
      }
    }
    returnPromises.push(generateCommands(settings, cmds, [guildId]));
  });
  return Promise.all(returnPromises);
};

makeCmds(getBotSettings("peko-bot"))
  .then(processCommannds)
  .catch((e) => {
    console.log(`Commands generate failed: ${e}`);
  });

makeCmds(getBotSettings("Mikodanye"))
  .then(processCommannds)
  .catch((e) => {
    console.log(`Commands generate failed: ${e}`);
  });
