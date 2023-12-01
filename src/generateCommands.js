import { REST, Routes } from "discord.js";

export const generateCommands = async (
  settings,
  commands,
  guildIdsToTrigger = undefined
) => {
  const rest = new REST({ version: "10" }).setToken(settings.token);

  console.log(settings.token, settings.appId, settings.guildIds);
  const ids = guildIdsToTrigger
    ? guildIdsToTrigger
    : settings.guildIds.split(",").map((el) => el.trim());
  for (let i = 0; i < ids.length; i++) {
    const guildId = ids[i];
    try {
      console.log(
        `Started refreshing ${commands.length} application (/) commands for ${guildId}`
      );

      console.log("---------------------------------------------");
      console.log(JSON.stringify(commands.map((el) => el.name)));
      console.log("---------------------------------------------");

      const data = await rest
        .put(Routes.applicationGuildCommands(settings.appId, guildId), {
          body: commands,
        })
        .catch((e) => {
          console.error(`Guild id: ${guildId}:`, e);
        });
      if (data) {
        console.log(
          `Successfully reloaded ${data.length} application (/) commands.`
        );
      }
    } catch (error) {
      console.error(error);
    }
  }
};
