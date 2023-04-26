import { loadFile, saveFile } from "../utils/fileUtils.js";

const JSON_FILE_NAME = "relay.json";

// throws IO error
export const loadRelays = () => {
  const relaysFile = loadFile(JSON_FILE_NAME);
  if (!relaysFile) {
    console.log(`No relay file ${JSON_FILE_NAME}, creating a new one`);
    initializeRelay(JSON_FILE_NAME);
    return { enabled: false, relays: [] };
  }
  return relaysFile;
};

// throws IO error
export const initializeRelay = (jsonFileName) => {
  saveFile(jsonFileName, { enabled: false, relays: [] });
};

// throws IO error
export const addRelay = (value) => {
  const relaysFile = loadRelays(JSON_FILE_NAME);
  relaysFile.relays.push(value);
  saveFile(JSON_FILE_NAME, {
    enabled: relaysFile.enabled,
    relays: relaysFile.relays,
  });
};

export const updateRelays = (relays) => {
  const relaysFile = loadRelays(JSON_FILE_NAME);
  relaysFile.relays = relays;
  saveFile(JSON_FILE_NAME, {
    enabled: relaysFile.enabled,
    relays: relaysFile.relays,
  });
};

export const toggleRelays = (value) => {
  const relaysFile = loadRelays(JSON_FILE_NAME);
  relaysFile.enabled = value;
  saveFile(JSON_FILE_NAME, {
    enabled: relaysFile.enabled,
    relays: relaysFile.relays,
  });
};
