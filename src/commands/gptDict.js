import {
  checkPermissions,
  getOptions,
  replyEmbedMessage,
} from "../utils/discordUtils.js";

import { SlashCommandBuilder } from "discord.js";
import { addEntry, deleteEntry, listDictionary } from "../model/gptDict.js";
import { MOD_PERMS } from "../utils/constants.js";

const processAdd = async (interaction) => {
  const guildId = interaction.guild.id;
  const options = getOptions(interaction);
  const src = options[0].value;
  const tgt = options[1].value;
  addEntry(guildId, src, tgt);
  console.warn(`gpt dict add at `, interaction.guild.name, ":", src, "->", tgt);
  await replyEmbedMessage(
    interaction,
    `Added an entry ${src} -> ${tgt} to the server GPT dictionary.`,
    false,
    false
  );

  return undefined;
};
const processDelete = async (interaction) => {
  const guildId = interaction.guild.id;
  const options = getOptions(interaction);
  const src = options[0].value;
  console.warn(`gpt dict del at `, interaction.guild.name, ":", src);
  deleteEntry(guildId, src);
  await replyEmbedMessage(
    interaction,
    `Entry ${src} removed from the server GPT dictionary.`,
    false,
    false
  );

  return undefined;
};
const processList = async (interaction) => {
  const guildId = interaction.guild.id;
  const dict = listDictionary(guildId);
  const resultString = Object.entries(dict)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((el) => `\`${el[0]}\`: \`${el[1]}\``)
    .join("\n");
  await replyEmbedMessage(
    interaction,
    resultString.length === 0 ? "(No entries)" : resultString,
    false,
    false
  );

  return undefined;
};

export default {
  data: new SlashCommandBuilder()
    .setName("dict")
    .setDescription("GPT dictionary management")
    .setDefaultMemberPermissions(MOD_PERMS)
    .addSubcommand((sc) =>
      sc
        .setName("add")
        .setDescription("Add an entry at the dictionary")
        .addStringOption((option) =>
          option.setName("src").setDescription("Source word").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("target")
            .setDescription("Translation")
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("delete")
        .setDescription("Delete an entry at the dictionary")
        .addStringOption((option) =>
          option
            .setName("src")
            .setDescription("Source word to delete")
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc.setName("list").setDescription("List the dictionary words")
    ),
  async execute(interaction) {
    checkPermissions(interaction);
    const subCommand = interaction.options._subcommand;

    switch (subCommand) {
      case "add": {
        return await processAdd(interaction);
      }
      case "delete": {
        return await processDelete(interaction);
      }
      case "list": {
        return await processList(interaction);
      }
      default: {
        await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
        return undefined;
      }
    }
  },
};
