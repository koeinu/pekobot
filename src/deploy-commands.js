import dotenv from "dotenv";
import { disabledCommands, generateCommands } from "./generateCommands.js";

import {
  makeCompoundBetCommands,
  makeSimpleBetCommands,
} from "./commands/commandGenerators/bet.js";

import { convertJsonToParsed, JSON_FILE_NAME } from "./model/bets.js";
import fs from "node:fs";

dotenv.config();

export const makeCmds = async (guildIdsString) => {
  const parsedGuildIds = guildIdsString.split(",").map((el) => el.trim());
  const disabledGuildCommands = {};
  parsedGuildIds.forEach(id => {
    disabledGuildCommands[id] = disabledCommands[id] || [];
  })
  const finalGuildCommands = {};

  const commandFiles = fs
    .readdirSync("./src/commands")
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    parsedGuildIds.forEach((id) => {
      if (!finalGuildCommands[id]) {
        finalGuildCommands[id] = [];
      }
      if (!disabledGuildCommands[id] || !disabledGuildCommands[id].find(dc => dc.toLowerCase().includes(file.toLowerCase().split('.')[0]))) {

        finalGuildCommands[id].push(command.default.data.toJSON());
      }
    })
  }

  return finalGuildCommands;
};
makeCmds(process.env.GUILD_ID)
  .then((guildCommandsData) => {
    const returnPromises = [];
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
      returnPromises.push(generateCommands(cmds, [guildId])) ;
    });
    return Promise.all(returnPromises);
  })
  .catch((e) => {
    console.log(`Commands generate failed: ${e}`);
  });
