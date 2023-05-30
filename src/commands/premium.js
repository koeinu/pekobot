import {
  checkPermissions,
  getOptions,
  replyEmbedMessage,
} from "../utils/discordUtils.js";

import {
  ActionRowBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { MOD_PERMS } from "../utils/constants.js";
import {
  assignPremiumMember,
  getCustomRoleUsers,
  loadPremiumData,
  setupPremiumRole,
} from "../model/premium.js";

export default {
  data: new SlashCommandBuilder()
    .setName("custom_roles")
    .setDefaultMemberPermissions(MOD_PERMS)
    .setDescription("Setup premium roles")
    .addSubcommand((sc) =>
      sc
        .setName("setup")
        .setDescription("Set the Premium Role")
        .addRoleOption((option) =>
          option
            .setName("premium_role")
            .setDescription(
              "Role that is being referenced as a sign of a premium member"
            )
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("assign")
        .setDescription("Assign a Custom Role")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to assign a Custom Role to")
        )
        .addRoleOption((option) =>
          option.setName("custom_role").setDescription("Custom Premium Role")
        )
    )
    .addSubcommand((sc) =>
      sc.setName("list").setDescription("Lists users with Custom Role")
    )
    .addSubcommand((sc) =>
      sc.setName("list_premium").setDescription("Lists users with Premium Role")
    ),
  async execute(interaction) {
    checkPermissions(interaction);
    const subCommand = interaction.options._subcommand;

    switch (subCommand) {
      case "setup": {
        const options = getOptions(interaction);
        const role = options[0].value;

        setupPremiumRole(interaction.guildId, role);

        await replyEmbedMessage(interaction, "Done", false, false);
        break;
      }
      case "assign": {
        const options = getOptions(interaction);
        const user = options[0].value;
        const role = options[1].value;

        const foundUser = await interaction.guild.members.fetch(user);
        const foundRole = await interaction.guild.roles.fetch(role);

        assignPremiumMember(interaction.guildId, user, role);

        await replyEmbedMessage(
          interaction,
          `Saving ${foundRole} custom role for ${foundUser}`,
          false,
          false
        );
        break;
      }
      case "list": {
        const premiumData = loadPremiumData(interaction.guildId);
        if (!premiumData) {
          throw "Premium data was not set up";
        }
        const customRoleUsers = getCustomRoleUsers(interaction.guildId);
        const foundUsers = [];
        for (let i = 0; i < customRoleUsers.length; i++) {
          const foundUser = await interaction.guild.members.fetch(
            customRoleUsers[i].userId
          );
          const foundRole = await interaction.guild.roles.fetch(
            customRoleUsers[i].roleId
          );
          const isDignitary = !!foundUser.roles.cache.find(
            (el) => el.id === premiumData.premiumRoleId
          );

          foundUsers.push({ foundUser, foundRole, isDignitary });
        }

        await replyEmbedMessage(
          interaction,
          foundUsers
            .map(
              (el) =>
                `${el.foundUser} -> ${el.foundRole}, ${
                  el.isDignitary ? "boost status OK" : "boost status EXPIRED"
                }`
            )
            .join("\n"),
          false,
          false
        );
        break;
      }
      default: {
        await replyEmbedMessage(interaction, `Unknown command: ${subCommand}`);
        return undefined;
      }
    }
  },
};
