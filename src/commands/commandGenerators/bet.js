import { reply, replyEmbedMessage } from "../../utils/discordUtils.js";

import {
  clearBet,
  JSON_FILE_NAME,
  makeBet,
  printBettersPlainText,
} from "../../model/bets.js";

import { printBetResult, printUnbet } from "../../utils/stringUtils.js";

import { SlashCommandBuilder } from "discord.js";
import { MAX_BET_LENGTH } from "../../utils/constants.js";

const getBaseCommand = () => {
  return new SlashCommandBuilder()
    .setName("bet")
    .setDescription("Bet commands")
    .addSubcommand((sc) => sc.setName("remove").setDescription("Remove my bet"))
    .addSubcommand((sc) => sc.setName("list").setDescription("List betters"));
};

const baseExecute = async (interaction) => {
  const subCommand = interaction.options._subcommand;

  switch (subCommand) {
    case "list": {
      await processListBetters(interaction);
      break;
    }
    case "remove": {
      await processClearBet(interaction);
      break;
    }
    case "new": {
      await processMakeBet(interaction);
      break;
    }
    default: {
      await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
      break;
    }
  }

  return undefined;
};

export const makeSimpleBetCommands = () => {
  const base = getBaseCommand();
  return {
    data: base.addSubcommand((sc) =>
      sc
        .setName("new")
        .setDescription("Make a bet")
        .addStringOption((option) =>
          option
            .setName("value")
            .setDescription("Your bet")
            .setRequired(true)
            .setMaxLength(MAX_BET_LENGTH)
            .setMinLength(1)
        )
    ),
    execute: baseExecute,
  };
};

export const makeCompoundBetCommands = (parsedBetChoices) => {
  let base = getBaseCommand();
  return {
    data: base.addSubcommand((sc) => {
      let toReturn = sc.setName("new").setDescription("Make a bet");
      parsedBetChoices.forEach((category) => {
        toReturn = toReturn.addStringOption((option) => {
          return option
            .setName(category.name.replaceAll(" ", "_").toLowerCase())
            .setRequired(true)
            .setDescription(category.name)
            .addChoices(
              ...category.content.map((el) => ({ name: el, value: el }))
            );
        });
      });
      return toReturn;
    }),
    execute: baseExecute,
  };
};

const getUserInfo = (interaction) => {
  return {
    id: interaction.user.id,
    userName: interaction.nickname || interaction.user.username,
  };
};

// throws IO error
const processListBetters = async (interaction) => {
  const guildId = interaction.guild.id;
  await reply(interaction, printBettersPlainText(JSON_FILE_NAME, guildId));
};

// throws IO error
const processClearBet = async (interaction) => {
  const guildId = interaction.guild.id;
  const userInfo = getUserInfo(interaction);
  clearBet(JSON_FILE_NAME, guildId, userInfo.id);
  await replyEmbedMessage(interaction, printUnbet(userInfo.id));
};

const getOptions = (interaction) => interaction.options?._hoistedOptions || [];

// throws IO error, validation error
const processMakeBet = async (interaction) => {
  const guildId = interaction.guild.id;
  const options = getOptions(interaction);
  const userInfo = getUserInfo(interaction);

  console.log("received bet", options);
  makeBet(JSON_FILE_NAME, guildId, userInfo, options);
  await replyEmbedMessage(
    interaction,
    printBetResult(userInfo.id, options),
    false,
    false
  );
};
