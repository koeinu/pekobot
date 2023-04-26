import { loadFile, saveFile } from "../utils/fileUtils.js";

const JSON_FILE_NAME = "youtube_bans.json";
const INITIAL_FILE = {};

// throws IO error
const loadBanned = (fileName) => {
  const counter = loadFile(fileName);
  if (!counter) {
    console.log(`No banned yt file ${fileName}, creating a new one`);
    initializeBanned(fileName);
    return INITIAL_FILE;
  }
  return counter;
};

// throws IO error
const initializeBanned = (jsonFileName) => {
  saveFile(jsonFileName, INITIAL_FILE);
};

export const addBan = (id, reason) => {
  const banned = loadBanned(JSON_FILE_NAME);
  banned[id] = reason;
  saveFile(JSON_FILE_NAME, banned);
};
export const removeBan = (id) => {
  const banned = loadBanned(JSON_FILE_NAME);
  if (Object.keys(banned).includes(id)) {
    delete banned[id];
    saveFile(JSON_FILE_NAME, banned);
  }
};
export const listBans = () => {
  return loadBanned(JSON_FILE_NAME);
};
