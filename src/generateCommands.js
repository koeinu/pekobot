import { REST, Routes } from "discord.js";

import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.APP_ID;
const guildIds = process.env.GUILD_ID;

console.log(token, clientId, guildIds);

export const makeCmds = async () => {
  const cmds = [];
  const commandFiles = fs
    .readdirSync("./src/commands")
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    cmds.push(command.default.data.toJSON());
  }

  return cmds;
};

const rest = new REST({ version: "10" }).setToken(token);

export const generateCommands = async (
  commands,
  guildIdsToTrigger = undefined
) => {
  const ids = guildIdsToTrigger
    ? guildIdsToTrigger
    : guildIds.split(",").map((el) => el.trim());
  for (let i = 0; i < ids.length; i++) {
    const guildId = ids[i];
    try {
      console.log(
        `Started refreshing ${commands.length} application (/) commands for ${guildId}`
      );

      console.log("---------------------------------------------");
      console.log(JSON.stringify(commands));
      console.log("---------------------------------------------");

      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );

      console.log(
        `Successfully reloaded ${data.length} application (/) commands.`
      );
    } catch (error) {
      console.error(error);
    }
  }
};
