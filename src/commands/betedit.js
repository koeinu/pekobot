import {
  changeBetDescription,
  clearBet,
  createChoiceBet,
  createSimpleBet,
  findChoiceBetWinners,
  saveBets,
  JSON_FILE_NAME,
  makeChoicesBetStructuresArray,
  parseBetChoices,
  printBettersPlainText,
  toggleBets,
  INITIAL_BET,
} from "../model/bets.js";

import {
  checkPermissions,
  getOptions,
  reply,
  replyEmbedMessage,
} from "../utils/discordUtils.js";

import { printUnbet } from "../utils/stringUtils.js";

import { SlashCommandBuilder } from "discord.js";

const processAssignRole = async (interaction) => {
  try {
    const guildId = interaction.guild.id;
    const options = getOptions(interaction);
    const category = options[0].value;
    const winner = options[1].value;
    const role = options[2];
    const set = options[3].value;
    const winners = await findChoiceBetWinners(
      JSON_FILE_NAME,
      guildId,
      category,
      winner
    );
    console.log(winners);
    if (!set) {
      await reply(
        interaction,
        `Winners for category ${"`" + category + "`"} are: ${winners
          .map((el) => `<@${el.id}>`)
          .join(", ")}! Role to assign: <@&${
          role.value
        }>. If you're okay with that, launch this command with 'set = True' option.`,
        undefined,
        false,
        true
      );
    } else {
      const guildRoles = await interaction.guild.roles.fetch();
      const foundRole = [...guildRoles.values()].find(
        (el) => el.id === role.value
      );

      for (let i = 0; i < winners.length; i++) {
        const foundUser = await interaction.guild.members.fetch(winners[i].id);
        console.log(`Adding ${foundRole.name} to ${foundUser.name}`);
        await foundUser.roles.add(foundRole);
      }
      await reply(
        interaction,
        `Winners for category ${"`" + category + "`"} are: ${winners
          .map((el) => `<@${el.id}>`)
          .join(
            ", "
          )}! The role was assigned successfully! Please check the role members before announcing it!`,
        undefined,
        false,
        true
      );
    }
  } catch (e) {
    console.error(e);
    await reply(interaction, e, undefined, false, true);
  }
};

// throws permission error
const processResults = async (interaction) => {
  const guildId = interaction.guild.id;
  toggleBets(JSON_FILE_NAME, guildId, false);
  await reply(
    interaction,
    printBettersPlainText(JSON_FILE_NAME, guildId),
    undefined,
    false,
    false
  );

  return undefined;
};

// throws permission error, IO error
const processChangeDesc = async (interaction) => {
  const guildId = interaction.guild.id;
  const options = getOptions(interaction);
  const betDescription = options[0].value;
  console.warn(
    `betedit description at`,
    interaction.guild.name,
    ":",
    betDescription
  );
  changeBetDescription(JSON_FILE_NAME, guildId, betDescription);
  await replyEmbedMessage(interaction, "Description changed.");

  return undefined;
};

// throws permission error
const processRemoveUser = async (interaction) => {
  const guildId = interaction.guild.id;
  // it's validated on the bot client side, made sure the <@userIdNumber> format is used
  const options = getOptions(interaction);
  const idToRemove = options[0].value.match(/\d+/g)[0];
  console.warn(
    `betedit removeUser at`,
    interaction.guild.name,
    ":",
    idToRemove
  );
  clearBet(JSON_FILE_NAME, guildId, idToRemove);
  await replyEmbedMessage(interaction, printUnbet(idToRemove));

  return undefined;
};

// throws permission error, IO error, validation error
const processCreateBetSimple = async (interaction) => {
  const guildId = interaction.guild.id;
  const options = getOptions(interaction);
  const betDescription = options[0].value;
  console.warn(
    `betedit create at`,
    interaction.guild.name,
    ":",
    betDescription
  );

  createSimpleBet(JSON_FILE_NAME, guildId, betDescription);

  await replyEmbedMessage(interaction, "Simple bet created.");

  return { data: [], create: true };
};

// throws permission error, IO error, validation error
const processCreateBetChoices = async (interaction) => {
  const guildId = interaction.guild.id;
  const options = getOptions(interaction);
  const betCategories = options[0].value;
  const betContents = options[1].value;
  console.warn(
    `betedit create at`,
    interaction.guild.name,
    ":",
    betCategories,
    "///",
    betContents
  );
  const parsedBetChoices = parseBetChoices(betCategories, betContents);

  createChoiceBet(
    JSON_FILE_NAME,
    guildId,
    undefined,
    makeChoicesBetStructuresArray(parsedBetChoices)
  );

  await replyEmbedMessage(interaction, "Choice bet created.");

  return { data: parsedBetChoices, create: true };
};

// throws permission error, IO error
const processToggleBet = async (interaction) => {
  const guildId = interaction.guild.id;
  const options = getOptions(interaction);
  const value = options[0].value === true;
  console.warn(`betedit toggle at`, interaction.guild.name, ":", value);
  toggleBets(JSON_FILE_NAME, guildId, value);
  await replyEmbedMessage(
    interaction,
    `Betting ${value ? "allowed" : "prohibited"}.`
  );

  return undefined;
};

const processDeleteBet = async (interaction) => {
  const guildId = interaction.guild.id;
  console.warn(`betedit delete at `, interaction.guild.name);
  saveBets(JSON_FILE_NAME, guildId, INITIAL_BET);
  await replyEmbedMessage(interaction, "Bets are cleared.");

  return { data: [], create: false };
};

export default {
  data: new SlashCommandBuilder()
    .setName("betedit")
    .setDescription("Manage the bet")
    .setDefaultMemberPermissions(16)
    .addSubcommand((sc) =>
      sc
        .setName("create_simple")
        .setDescription("Create a bet with description")
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Bet description")
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("create_choices")
        .setDescription("Create a bet with choices")
        .addStringOption((option) =>
          option
            .setName("categories")
            .setDescription(
              "Optional category restriction. Syntax: 'c 1; c 2' -> 'c 1' and 'c 2' categories"
            )
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("data")
            .setDescription(
              "Optional choice restriction. Syntax: 'a, b; c, d' -> categories with choices [a, b] and [c, d]"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("description")
        .setDescription("Changes the current bet description")
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("New description")
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("toggle")
        .setDescription("Allow/prohibit betting")
        .addBooleanOption((option) =>
          option
            .setName("value")
            .setDescription("Sets the allow/prohibit status value for the bet")
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc.setName("delete").setDescription("Deletes the current bet")
    )
    .addSubcommand((sc) =>
      sc
        .setName("unbet")
        .setDescription("Remove bets from a specific user")
        .addUserOption((user) =>
          user
            .setName("user")
            .setDescription("User which bet to remove")
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("results")
        .setDescription(
          "Announce bet results (same as /bet list, but shows it for everyone and closes the betting)."
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("role")
        .setDescription("Assign the role to winners")
        .addStringOption((option) =>
          option
            .setName("category")
            .setDescription("Category name")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("winner")
            .setDescription("Winner option")
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role to assign")
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option.setName("set").setDescription("Update the role")
        )
    ),
  async execute(interaction) {
    checkPermissions(interaction);
    const subCommand = interaction.options._subcommand;

    switch (subCommand) {
      case "results": {
        return await processResults(interaction);
      }
      case "description": {
        return await processChangeDesc(interaction);
      }
      case "unbet": {
        return await processRemoveUser(interaction);
      }
      case "create_simple": {
        return await processCreateBetSimple(interaction);
      }
      case "create_choices": {
        return await processCreateBetChoices(interaction);
      }
      case "toggle": {
        return await processToggleBet(interaction);
      }
      case "delete": {
        return await processDeleteBet(interaction);
      }
      case "role": {
        return await processAssignRole(interaction);
      }
      default: {
        await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
        return undefined;
      }
    }
  },
};
