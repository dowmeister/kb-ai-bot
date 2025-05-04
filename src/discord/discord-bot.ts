import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Events,
  PermissionsBitField,
  FetchMessagesOptions,
  EmbedBuilder,
  Collection,
  REST,
  Routes,
  OAuth2Scopes,
} from "discord.js";
import { askQuestion } from "../ai/ask";
import {
  saveAnswer,
  saveDiscordMessage,
  saveMissedAnswer,
  verifyUserMessage,
} from "../mongo";
import { logInfo, logError, logSuccess } from "../helpers/logger";
import { buildReply, isHelpRequestSimple } from "../helpers/utils";
import { embeddingService } from "../services/embedding-service";
import { knowledgeCommands } from "./commands/knowledge-commands";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// Commands collection
const commands = new Collection();
knowledgeCommands.forEach((command: any) => {
  commands.set(command.data.name, command);
});

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// and deploy your commands!
(async () => {
  try {
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
})();

function isMemberModerator(member: any): boolean {
  if (!member.permissions) return false;

  const permissions = member.permissions as PermissionsBitField;

  return (
    permissions.has(PermissionsBitField.Flags.ManageMessages) ||
    permissions.has(PermissionsBitField.Flags.BanMembers) ||
    permissions.has(PermissionsBitField.Flags.KickMembers) ||
    permissions.has(PermissionsBitField.Flags.Administrator)
  );
}

client.once(Events.ClientReady, () => {
  logSuccess(`Discord bot logged in as ${client.user?.tag}`);
  client.user?.setActivity("helping you!");
  logSuccess("Discord bot is ready!");

  // Generate the invite link with admin permissions and slash commands
  const inviteLink = client.generateInvite({
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    permissions: ["Administrator"],
  });

  logInfo(`Invite me to your server with this link: ${inviteLink}`);
});

// Command handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const command: DiscordCommand = commands.get(
    interaction.commandName
  ) as DiscordCommand;

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error executing this command!",
      ephemeral: true,
    });
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    // Ignore messages from bots
    if (message.author.bot) return;

    // The user mentioned the bot
    if (
      message.mentions &&
      message.mentions.users.size > 0 &&
      message.mentions.users.first()?.id === client.user?.id
    ) {
      const userMessage = message.content.trim();
      if (userMessage.length === 0) return;

      const member = await message.guild?.members.fetch(message.author.id);
      const isModerator = member ? isMemberModerator(member) : false;

      /*
    let trustScore = isModerator ? 2.0 : 1.0;
    let parentMessageId = undefined;

    if (message.reference?.messageId) {
      parentMessageId = message.reference.messageId;
      if (isModerator) {
        await verifyUserMessage(parentMessageId, message.content);
        trustScore = 2.5;
      }
    }
      */

      await saveDiscordMessage({
        guildId: message.guildId,
        content: userMessage,
        authorId: message.author.id,
        authorUsername: message.author.username,
        isModerator,
        timestamp: new Date(message.createdTimestamp),
        channelId: message.channelId,
        messageId: message.id,
      });

      const embedding = await embeddingService.generateEmbedding(userMessage);

      if (!embedding) {
        logError("Failed to get embedding for the message.");
        return;
      }

      if (embedding.length === 0) {
        logError("Empty embedding received.");
        return;
      }

      /*
    // Don't reply to messages from moderators
    if (
      isModerator &&
      message.channel.id != process.env.DISCORD_TESTING_CHANNEL_ID
    )
      return;
      */

      // don't reply to other chained replies
      //if (message.reference?.messageId) return;

      // New part: if it's a help request, try to answer
      //if (isHelpRequestSimple(userMessage)) {
      // Create a typing indicator
      await message.channel.sendTyping();

      const answer = await askQuestion(userMessage);

      if (answer && answer.answer.length > 0 && answer.replied) {
        logInfo(`Answering help request: ${userMessage}`);

        const embed = buildReply(answer);

        const sentMessage = await message.reply({ embeds: [embed] });

        saveAnswer({
          answer: answer.answer,
          urls: answer.urls,
          question: userMessage,
          questionMessageId: message.id,
          answerMessageId: sentMessage.id,
          questionUserId: message.author.id,
          questionUsername: message.author.username,
          guildId: message.guildId,
          channelId: message.channelId,
        });

        await sentMessage.react("👍");
        await sentMessage.react("👎");

        // Set up a filter to only collect thumbs up or thumbs down
        const filter = (reaction: any, user: any) => {
          return ["👍", "👎"].includes(reaction.emoji.name);
        };

        const collector = sentMessage.createReactionCollector({
          filter: filter,
        });

        collector.on("collect", (reaction, user) => {
          if (user.bot) return; // Ignore bot reactions
          if (isMemberModerator(user)) {
            if (reaction.emoji.name === "👍") {
              logInfo(`User ${user.username} liked the answer.`);
            } else if (reaction.emoji.name === "👎") {
              logInfo(`User ${user.username} disliked the answer.`);
            }
          }
        });

        collector.on("end", (collected) => {
          logInfo(`Collected ${collected.size} reactions.`);
        });
      } else {
        await message.reply(
          "❓ I couldn't find enough information to answer that."
        );

        saveMissedAnswer({
          urls: answer.urls,
          question: userMessage,
          messageId: message.id,
          questionUserId: message.author.id,
          questionUsername: message.author.username,
          guildId: message.guildId,
          channelId: message.channelId,
        });
      }
    }
  } catch (error) {
    logError(`Error handling Discord message: ${(error as Error).message}`);
  }
});

client.login(DISCORD_TOKEN);

async function retrieveAndCacheOldMessages() {
  if (process.env.DISCORD_GUILD_ID === undefined) {
    logError("DISCORD_GUILD_ID is not set in the environment variables.");
    return;
  }

  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);

  if (!guild) {
    logError("Guild not found. Please check the guild ID.");
    return;
  }

  const channels = guild.channels.cache.filter((c) => c.isTextBased());

  for (const channel of channels.values()) {
    let lastMessageId;
    let fetchComplete = false;

    while (!fetchComplete) {
      const options: FetchMessagesOptions = { limit: 100 };
      if (lastMessageId) options.before = lastMessageId;

      const messages = await channel.messages.fetch(options);

      if (!messages || messages.size === 0) {
        logInfo(`No more messages to fetch in channel ${channel.name}`);
        break;
      }

      for (const message of messages.values()) {
        // Process each message here
        // For example, save to database

        const member = await message.guild?.members.fetch(message.author.id);
        const isModerator = isMemberModerator(member);
        let trustScore = isModerator ? 2.0 : 1.0;

        await saveDiscordMessage({
          guildId: message.guildId,
          content: message.content.trim(),
          authorId: message.author.id,
          authorUsername: message.author.username,
          isModerator,
          timestamp: new Date(message.createdTimestamp),
          channelId: message.channelId,
          messageId: message.id,
          trustScore,
        });
      }

      if (messages && messages.last()) {
        lastMessageId = messages.last()?.id;

        // Check if the last message is older than 6 months
        const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
        let lastMessageDate;

        const lastMessage = messages.last();
        if (lastMessage) {
          lastMessageDate = lastMessage.createdTimestamp;
        }

        if (lastMessageDate && lastMessageDate < sixMonthsAgo) {
          {
            fetchComplete = true;
          }
        }
      }

      // To comply with rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
