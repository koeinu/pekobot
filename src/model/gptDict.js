import { loadFile, saveFile } from "../utils/fileUtils.js";

const JSON_FILE_NAME = "gpt_dictionary.json";
const INITIAL_FILE = {};

// throws IO error
const loadDictionary = (fileName, guildId) => {
  const dict = loadFile(fileName);
  if (!dict) {
    console.log(`No banned yt file ${dict}, creating a new one`);
    initializeDictionary(fileName);
    return {};
  }
  if (guildId) {
    if (!dict[guildId]) {
      dict[guildId] = {};
      saveFile(JSON_FILE_NAME, dict);
    }
    return dict;
  } else {
    const compoundDict = {};
    Object.values(dict).forEach((guildDict) => {
      Object.entries(guildDict).forEach((el) => (compoundDict[el[0]] = el[1]));
    });
    return compoundDict;
  }
};

// throws IO error
const initializeDictionary = (jsonFileName) => {
  saveFile(jsonFileName, INITIAL_FILE);
};

export const addEntry = (guildId, src, target) => {
  const dict = loadDictionary(JSON_FILE_NAME, guildId);
  const guildDict = dict[guildId];
  guildDict[src] = target;
  saveFile(JSON_FILE_NAME, dict);
};
export const deleteEntry = (guildId, src) => {
  const dict = loadDictionary(JSON_FILE_NAME, guildId);
  const guildDict = dict[guildId];
  if (Object.keys(guildDict).includes(src)) {
    delete guildDict[src];
    saveFile(JSON_FILE_NAME, dict);
  }
};
export const listDictionary = (guildId) => {
  const dict = loadDictionary(JSON_FILE_NAME, guildId);
  return guildId !== undefined ? dict[guildId] : dict;
};
