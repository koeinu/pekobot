import { REST, Routes } from "discord.js";

import dotenv from "dotenv";

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.APP_ID;
const guildIds = process.env.GUILD_ID;

console.log(token, clientId, guildIds);

export const disabledCommands = {
  "584977240358518784": ["calendar", "youtube", "relay", "gptdraft"], // miko
  "999666683176308807": [
    "calendar",
    "jigsaw",
    "betedit",
    "gptDict",
    "youtube",
    "gptdraft",
  ], // snaxxx
  "1061909810943115337": [], // ts
  "683140640166510717": ["calendar"], // peko
  "1088005181171580949": ["calendar"], // ts2
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

      const data = await rest
        .put(Routes.applicationGuildCommands(clientId, guildId), {
          body: commands,
        })
        .catch((e) => {
          console.error(`Guild id: ${guildId}:`, e);
        });

      console.log(
        `Successfully reloaded ${data.length} application (/) commands.`
      );
    } catch (error) {
      console.error(error);
    }
  }
};
