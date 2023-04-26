import fs from 'fs';

export const JSON_DIR_NAME = "data/json";

export const formFilePath = (fileName) => {
  return `${JSON_DIR_NAME}/${fileName}`;
};

// throws IO error
export const loadFile = (fileName) => {
  try {
    let rawdata = fs.readFileSync(formFilePath(fileName));
    return JSON.parse(rawdata.toString());
  } catch (err) {
    console.log(err);
    return undefined;
  }
};

// throws IO error
export const saveFile = (fileName, jsonContents) => {
  fs.mkdirSync(JSON_DIR_NAME, { recursive: true });
  fs.writeFileSync(formFilePath(fileName), JSON.stringify(jsonContents));
};

// throws IO error
export const deleteFile = (fileName) => {
  try {
    fs.unlinkSync(formFilePath(fileName));
    console.log(`file ${fileName} deleted successfully`);
  } catch (err) {
    console.log(err);
  }
};
