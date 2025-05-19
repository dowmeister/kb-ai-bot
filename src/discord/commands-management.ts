import { Collection, REST, Routes, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import path from "path";
import { logInfo, logSuccess } from "../helpers/logger";

export async function registerCommands(
  commands: Collection<string,any>
) {
  try {
    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    logInfo(`Started refreshing ${commands.size} application (/) commands.`);

    if (process.env.DISCORD_GUILD_ID) {
      // The put method is used to deploy commands to a specific guild
      const data: any = await rest.put(
        Routes.applicationGuildCommands(
          process.env.DISCORD_CLIENT_ID,
          process.env.DISCORD_GUILD_ID
        ),
        { body: commands.map((m: any) => m.data.toJSON()) }
      );

      logSuccess(
        `Successfully reloaded ${data.length} application (/) commands in the guild.`
      );
    } else {
      // The put method is used to fully refresh all commands in the guild with the current set
      const data: any = await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
        { body: commands.map((m: any) => m.data.toJSON()) }
      );

      logSuccess(
        `Successfully reloaded ${data.length} application (/) commands.`
      );
    }
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
}
