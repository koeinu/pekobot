import { loadFile, saveFile } from "../utils/fileUtils.js";

const JSON_FILE_NAME = "counter.json";
const DEFAULT_LIMIT = 1000;
const INITIAL_FILE = {
  deepl: { value: 50, limit: DEFAULT_LIMIT },
  pek: { value: 0, limit: 10 },
};

// throws IO error
const loadCounter = (fileName) => {
  const counter = loadFile(fileName);
  if (!counter) {
    console.log(`No counter file ${fileName}, creating a new one`);
    initializeCounter(fileName);
    return INITIAL_FILE;
  }
  return counter;
};

// throws IO error
const initializeCounter = (jsonFileName) => {
  saveFile(jsonFileName, INITIAL_FILE);
};

export const increaseCounter = (stringName) => {
  if (!canIncreaseCounter(stringName)) {
    throw new Error(`Reached monthly command limit for ${stringName} command`);
  }
  const counter = loadCounter(JSON_FILE_NAME);
  if (!Object.keys(counter).includes(stringName)) {
    counter[stringName] = { value: 0, limit: DEFAULT_LIMIT };
  }
  counter[stringName].value += 1;
  saveFile(JSON_FILE_NAME, counter);
  return counter[stringName];
};

export const getCounter = (stringName) => {
  const counter = loadCounter(JSON_FILE_NAME);
  if (Object.keys(counter).includes(stringName)) {
    return counter[stringName];
  } else {
    counter[stringName] = { value: 0, limit: DEFAULT_LIMIT };
    saveFile(JSON_FILE_NAME, counter);
  }

  return counter[stringName];
};

export const canIncreaseCounter = (stringName) => {
  const counter = loadCounter(JSON_FILE_NAME);
  if (Object.keys(counter).includes(stringName)) {
    console.log(
      `${stringName}: comparing ${counter[stringName].value} and ${counter[stringName].limit}`
    );
    return counter[stringName].value < counter[stringName].limit;
  }
  return true;
};

export const resetCounters = () => {
  const counter = loadCounter(JSON_FILE_NAME);
  Object.keys(counter).forEach((key) => {
    counter[key].value = 0;
  });
  saveFile(JSON_FILE_NAME, counter);
};
