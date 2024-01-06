import {
  MAX_BET_LENGTH,
  MAX_CHOICES_DISCORD,
  PEKO_COLOR,
} from "../utils/constants.js";

import { loadFile, saveFile } from "../utils/fileUtils.js";

import { validateString } from "../utils/stringUtils.js";

import { EmbedBuilder } from "@discordjs/builders";

export const JSON_FILE_NAME = "bets.json";

const ABSTRACT_BET = {
  betType: -1,
  description: undefined,
  bettingAllowed: false,
};

export const INITIAL_BET = {
  ...ABSTRACT_BET,
  betters: [],
};

const INITIAL_CHOICE_BET = {
  ...ABSTRACT_BET,
  categories: [],
};

const findBets = (betsStorage, guildId) => {
  return betsStorage
    ? betsStorage.find((el) => el.guildId === guildId)
    : undefined;
};

// throws IO error
export const loadBets = (fileName, guildId) => {
  const betsStorage = loadFile(fileName);
  const bets = findBets(betsStorage, guildId);
  if (!bets) {
    console.log(`No bets file ${fileName}, ${guildId}, creating a new one`);
    saveBets(fileName, guildId, INITIAL_BET);
    return INITIAL_BET;
  }
  return bets.data;
};

// throws IO error
export const saveBets = (fileName, guildId, data) => {
  const dataToSave = { guildId, data };
  let betsStorage = loadFile(fileName);
  if (!betsStorage) {
    betsStorage = [dataToSave];
  } else {
    const bets = findBets(betsStorage, guildId);
    if (!bets) {
      betsStorage.push(dataToSave);
    } else {
      bets.data = dataToSave.data;
    }
  }
  saveFile(fileName, betsStorage);
  return data;
};

// throws validation error
const validateBetAction = (bet, forceAction) => {
  if (!bet.description && !bet.categories) {
    throw "No current bet.";
  }
  if (!forceAction && !bet.bettingAllowed) {
    throw "Betting is currently prohibited.";
  }
};

// throws IO error
export const changeBetDescription = (jsonFilename, guildId, newDescription) => {
  const bets = loadBets(jsonFilename, guildId);
  validateBetAction(bets, true);

  bets.description = newDescription;

  saveBets(jsonFilename, guildId, bets);
};

// throws IO error, validation error
export const clearBet = (jsonFilename, guildId, userId, forceAction) => {
  const bets = loadBets(jsonFilename, guildId);
  validateBetAction(bets, forceAction);

  if (bets.betType === 0) {
    const foundBet = bets.betters.find((el) => {
      return el.id === userId;
    });
    if (foundBet) {
      bets.betters.splice(bets.betters.indexOf(foundBet), 1);
    }
  } else {
    bets.categories.forEach((category) => {
      Object.keys(category.content).forEach((categoryName) => {
        const foundBet = category.content[categoryName].find((el) => {
          return el.id === userId;
        });
        if (foundBet) {
          category.content[categoryName].splice(
            category.content[categoryName].indexOf(foundBet),
            1
          );
        }
      });
    });
  }
  saveBets(jsonFilename, guildId, bets);
};

// throws IO error, validation error
export const makeBet = (jsonFilename, guildId, userInfo, betOptions) => {
  clearBet(jsonFilename, guildId, userInfo.id);
  const bets = loadBets(jsonFilename, guildId);

  if (bets.betType === 0) {
    const betValue = betOptions[0].value;
    validateString(betValue, MAX_BET_LENGTH);
    bets.betters.push({
      id: userInfo.id,
      name: userInfo.userName,
      bet: betOptions[0].value,
    });
  } else {
    betOptions.forEach((betOption, index) => {
      const value = betOption.value;
      const betCategory = bets.categories[index].content;
      if (!betCategory[value]) {
        throw `There is no betting category ${value}`;
      }

      betCategory[value].push({
        id: userInfo.id,
        name: userInfo.userName,
      });
    });
  }

  saveBets(jsonFilename, guildId, bets);
};

// throws IO error
export const toggleBets = (jsonFilename, guildId, value) => {
  const bets = loadBets(jsonFilename, guildId);
  bets.bettingAllowed = value;
  saveBets(jsonFilename, guildId, bets);
};

// throws IO error
export const createSimpleBet = (jsonFilename, guildId, description) => {
  saveBets(jsonFilename, guildId, {
    ...INITIAL_BET,
    betType: 0,
    description: description,
  });
};

// throws IO error
export const createChoiceBet = (
  jsonFilename,
  guildId,
  description,
  categories
) => {
  saveBets(jsonFilename, guildId, {
    ...INITIAL_CHOICE_BET,
    betType: 1,
    description,
    categories,
  });
};

// throws IO error, validation error
export const parseBetChoices = (betCategories, betContents) => {
  const categoryNames = betCategories.split(";").map((categoryName) => {
    const trimmedName = categoryName.trim();
    validateString(trimmedName);
    return trimmedName;
  });

  const categoryContents = betContents.split(";").map((category) => {
    const trimmedCategory = category.trim();
    validateString(trimmedCategory);
    return trimmedCategory;
  });

  if (categoryNames.length !== categoryContents.length) {
    throw "Category descriptions amount don't match category contents amount. See syntax.";
  }

  return categoryContents.map((content, index) => {
    const categoryName = categoryNames[index];
    const contents = content.split(",").map((choice) => {
      const trimmedChoice = choice.trim();
      validateString(trimmedChoice);
      return trimmedChoice;
    });

    if (contents.length > MAX_CHOICES_DISCORD) {
      throw `You are trying to add ${contents.length} in one of categories. The amount of choices can't be more than 25. It's a restriction from Discord side.`;
    }

    return {
      name: categoryName,
      content: contents,
    };
  });
};

export const makeChoicesBetStructuresArray = (parsedBetChoices) => {
  return parsedBetChoices.map((category) => {
    const categoryStruct = {
      name: category.name,
      content: {},
    };
    category.content.forEach((strChoice) => {
      categoryStruct.content[strChoice] = [];
    });
    return categoryStruct;
  });
};

export const convertJsonToParsed = (fileName, guildId) => {
  const bet = loadBets(fileName, guildId);
  const toReturn = { betType: bet.betType };
  if (bet.betType === 0) {
    return toReturn;
  } else if (bet.betType === 1) {
    toReturn.data = bet.categories.map((el) => {
      return {
        name: el.name,
        content: Object.keys(el.content),
      };
    });
    return toReturn;
  } else {
    return { betType: -1 };
  }
};

const getBetterName = (el, withPing) => {
  return withPing ? `<@${el.id}>` : el.name;
};

export const printRawJson = (fileName, guildId) => {
  const bet = loadBets(fileName, guildId);
  return JSON.stringify(bet, null, 2);
};

export const printBettersEmbed = (fileName, guildId, withPing) => {
  const bet = loadBets(fileName, guildId);
  const toReturn = [];
  if (bet) {
    if (bet.betType === 0) {
      const toAdd = new EmbedBuilder()
        .setColor(PEKO_COLOR)
        .setTitle("Bet results")
        .addFields({
          name: "Betters:",
          value:
            bet.betters.length > 0
              ? bet.betters
                  .map((el) => {
                    const userName = getBetterName(el, withPing);
                    return `${userName}: ${el.bet}`;
                  })
                  .join("\n")
              : "No bets",
        })
        .setFooter({
          text: `Betting is currently ${
            bet.bettingAllowed ? "open" : "closed"
          }.`,
        });
      if (bet.description) {
        toAdd.setDescription(bet.description);
      }
      toReturn.push(toAdd);
    } else {
      const printCategoryContent = (category, index) => {
        const toAdd = new EmbedBuilder()
          .setColor(PEKO_COLOR)
          .setTitle(index !== undefined ? `${category.name}` : category.name)
          .setFooter({
            text: `Betting is ${bet.bettingAllowed ? "open" : "closed"}.`,
          });
        console.log("content:", category.content);
        let someFieldsAdded = false;
        Object.entries(category.content).forEach(([key, value]) => {
          const betters = value.map((el) => {
            return `${getBetterName(el, withPing)}`;
          });
          if (betters.length > 0) {
            someFieldsAdded = true;
            toAdd.addFields({
              name: `${key}`,
              value: betters.join(", "),
            });
          }
        });
        if (!someFieldsAdded) {
          toAdd.addFields({ name: "(No bets)", value: "\u200B" });
        }
        toReturn.push(toAdd);
      };
      bet.categories.forEach((category, index) => {
        printCategoryContent(
          category,
          bet.categories.length > 1 ? index : undefined
        );
      });
    }
  } else {
    toReturn.push(
      new EmbedBuilder().setColor(PEKO_COLOR).setTitle("No current bet")
    );
  }
  return toReturn;
};

export const printBettersPlainText = (fileName, guildId) => {
  const bet = loadBets(fileName, guildId);
  if (bet) {
    const toReturn = [];
    if (bet.betType === 0) {
      toReturn.push(bet.description);
      if (bet.betters.length > 0) {
        bet.betters.forEach((el) => {
          const userName = getBetterName(el, false); // no pings for plain texts
          toReturn.push(`${userName}: ${el.bet}`);
        });
      } else {
        toReturn.push("No bets");
      }
      toReturn.push("---");
      toReturn.push(`Betting is ${bet.bettingAllowed ? "open" : "closed"}.`);
    } else {
      const printCategoryContent = (category) => {
        const categoryLines = [];
        categoryLines.push(`${category.name}`);

        let someFieldsAdded = false;
        Object.entries(category.content).forEach(([key, value]) => {
          const betters = value.map((el) => {
            return `${getBetterName(el, false)}`; // no pings for plain texts
          });
          if (betters.length > 0) {
            someFieldsAdded = true;
            categoryLines.push(
              `${"`" + key + "`"}: ${sortStrArray(betters).join(", ")}`
            );
          }
        });
        if (!someFieldsAdded) {
          categoryLines.push("(No bets)");
        }
        return categoryLines;
      };
      const intermediateArrays = [];
      sortCategoriesArray(bet.categories).forEach((category, index) => {
        intermediateArrays.push(
          printCategoryContent(
            category,
            bet.categories.length > 1 ? index : undefined
          )
        );
      });
      toReturn.push(
        intermediateArrays.map((el) => el.join("\n")).join("\n---\n")
      );
    }

    return `${
      bet.description
        ? "Results for `" + bet.description + "` " + "betting:"
        : "Bet results:"
    }\n${toReturn.join("\n")}\nBetting is currently ${
      bet.bettingAllowed ? "open" : "closed"
    }.`;
  } else {
    return ["No current bet"];
  }
};

const sortCategoriesArray = (arr) =>
  arr.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));
const sortStrArray = (arr) =>
  arr.sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1));

export const findChoiceBetWinners = async (
  fileName,
  guildId,
  category,
  winner
) => {
  const bets = loadBets(fileName, guildId);
  if (bets.betType !== 1) {
    throw "The bet is not choice-based, process the winners manually please";
  } else {
    const foundCategory = bets.categories.find(
      (el) => el.name.toLowerCase() === category.toLowerCase()
    );
    if (foundCategory) {
      const foundWinners = Object.entries(foundCategory.content).find(
        (el) => el[0].toLowerCase() === winner.toLowerCase()
      );
      if (foundWinners) {
        return foundWinners[1];
      } else {
        throw `Couldn't find winner ${winner}`;
      }
    } else {
      throw `Couldn't find category ${category}`;
    }
  }
};
