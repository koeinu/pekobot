import { formFilePath, loadFile, saveFile } from "../utils/fileUtils.js";
import fs from "node:fs";
import { sleep } from "../utils/discordUtils.js";
import { S_MS } from "../utils/constants.js";

const JSON_FILE_NAME = "settings.json";
const INITIAL_FILE = {};

// throws IO error
const loadSettingsStorage = (fileName) => {
  const storage = loadFile(fileName);
  if (!storage) {
    console.log(`No counter file ${fileName}, creating a new one`);
    initializeSettings(fileName);
    return INITIAL_FILE;
  }
  return storage;
};

// throws IO error
const initializeSettings = (jsonFileName) => {
  saveFile(jsonFileName, INITIAL_FILE);
};

export const getBotSettings = (botName) => {
  const storage = loadSettingsStorage(JSON_FILE_NAME);
  if (!storage[botName]) {
    throw `No settings for bot ${botName}`;
  }
  return {
    guildIds: storage[botName].guildIds,
    token: storage[botName].token,
    appId: storage[botName].appId,
    name: storage[botName].name,
    inspiration: storage[botName].inspiration,
    gobi: storage[botName].gobi,
    streakData: storage[botName].streakData,
    extendedRp: storage[botName].extendedRp,
    speechInstructions: storage[botName].speechInstructions,
    trivia: storage[botName].trivia,
    isSimplified: storage[botName].isSimplified,
    inactive: storage[botName].inactive,
  };
};

export const createUploadSettingsRoute = (req, res, next) => {
  console.log(
    "Now uploading",
    req.url,
    ": ",
    req.get("content-length"),
    "bytes"
  );
  req.pipe(fs.createWriteStream(formFilePath(JSON_FILE_NAME)));
  req.on("end", async () => {
    // Done reading!
    res.sendStatus(200);
    console.log("Uploaded!");
    next();

    await sleep(() => {}, S_MS);
    process.exit();
  });
};
