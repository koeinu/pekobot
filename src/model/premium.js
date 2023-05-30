import { loadFile, saveFile } from "../utils/fileUtils.js";

const JSON_FILE_NAME = "premium.json";

export const loadAllPremiumData = () => {
  const data = loadFile(JSON_FILE_NAME);
  if (!data) {
    return undefined;
  }
  return data;
};

export const loadPremiumData = (guildId) => {
  const data = loadFile(JSON_FILE_NAME);
  if (!data) {
    return undefined;
  }
  return data[guildId];
};

export const setupPremiumRole = (guildId, roleId) => {
  const data = loadFile(JSON_FILE_NAME) || {};
  if (!data[guildId]) {
    data[guildId] = {
      premiumRoleId: roleId,
    };
  } else {
    data[guildId].premiumRoleId = roleId;
  }
  saveFile(JSON_FILE_NAME, data);
};

export const assignPremiumMember = (guildId, userId, roleId) => {
  const data = loadFile(JSON_FILE_NAME) || {};
  if (!data[guildId]) {
    throw "Premium data was not set up";
  } else {
    if (!data[guildId].userData) {
      data[guildId].userData = [];
    }
    const foundData = data[guildId].userData.find((el) => el.userId === userId);
    if (foundData) {
      foundData.roleId = roleId;
    } else {
      data[guildId].userData.push({
        userId,
        roleId,
      });
    }
  }
  saveFile(JSON_FILE_NAME, data);
};

export const removePremiumMember = (guildId, userId) => {
  const data = loadFile(JSON_FILE_NAME) || {};
  let foundRoleId = -1;
  if (!data[guildId]) {
    throw "Premium data was not set up";
  } else {
    if (!data[guildId].userData) {
      data[guildId].userData = [];
    }
    const foundUser = data[guildId].userData.find((el) => el.userId === userId);
    const foundIndex = data[guildId].userData.indexOf(foundUser);
    if (foundIndex >= 0) {
      data[guildId].userData.splice(foundIndex, 1);
      foundRoleId = foundUser.roleId;
    }
  }
  saveFile(JSON_FILE_NAME, data);
  return foundRoleId;
};

export const getCustomRoleUsers = (guildId) => {
  const data = loadFile(JSON_FILE_NAME) || {};
  if (!data[guildId]) {
    throw "Premium data was not set up";
  } else {
    if (!data[guildId].userData) {
      return [];
    }
    return data[guildId].userData;
  }
};
