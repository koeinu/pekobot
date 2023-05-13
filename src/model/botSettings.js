import { loadFile, saveFile } from "../utils/fileUtils.js";

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
    isSimplified: storage[botName].isSimplified,
    inactive: storage[botName].inactive,
  };
};
