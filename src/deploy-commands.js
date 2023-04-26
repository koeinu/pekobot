import dotenv from "dotenv";
import { generateCommands, makeCmds } from "./generateCommands.js";

import {
  makeCompoundBetCommands,
  makeSimpleBetCommands,
} from "./commands/commandGenerators/bet.js";

import { convertJsonToParsed, JSON_FILE_NAME } from "./model/bets.js";

dotenv.config();

makeCmds()
  .then((cmds) => {
    const parsedData = convertJsonToParsed(JSON_FILE_NAME);
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
    return generateCommands(cmds);
  })
  .catch((e) => {
    console.log(`Commands generate failed: ${e}`);
  });
