import {
  Client,
  GatewayIntentBits,
  Events,
  PermissionsBitField,
  FetchMessagesOptions,
  EmbedBuilder,
} from "discord.js";
import { askQuestion } from "./ask";
import {
  saveAnswer,
  saveDiscordMessage,
  saveMissedAnswer,
  verifyUserMessage,
} from "./mongo";
import { configDotenv } from "dotenv";
import { logInfo, logError } from "./logger";
import { isHelpRequestSimple } from "./utils";
import { embeddingService } from "./services/embedding-service";

configDotenv();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

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
  logInfo(`Discord bot logged in as ${client.user?.tag}`);
  client.user?.setActivity("helping you!");
  logInfo("Discord bot is ready!");

  //retrieveAndCacheOldMessages();
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;

    const userMessage = message.content.trim();
    if (userMessage.length === 0) return;

    const member = await message.guild?.members.fetch(message.author.id);
    const isModerator = member ? isMemberModerator(member) : false;

    let trustScore = isModerator ? 2.0 : 1.0;
    let parentMessageId = undefined;

    if (message.reference?.messageId) {
      parentMessageId = message.reference.messageId;
      if (isModerator) {
        await verifyUserMessage(parentMessageId, message.content);
        trustScore = 2.5;
      }
    }

    await saveDiscordMessage({
      guildId: message.guildId,
      content: userMessage,
      authorId: message.author.id,
      authorUsername: message.author.username,
      isModerator,
      timestamp: new Date(message.createdTimestamp),
      channelId: message.channelId,
      messageId: message.id,
      parentMessageId,
      trustScore,
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

    // Don't reply to messages from moderators
    if (
      isModerator &&
      message.channel.id != process.env.DISCORD_TESTING_CHANNEL_ID
    )
      return;

    // don't reply to other chained replies
    if (message.reference?.messageId) return;

    // New part: if it's a help request, try to answer
    if (isHelpRequestSimple(userMessage)) {
      const answer = await askQuestion(userMessage);

      if (answer && answer.answer.length > 0) {
        logInfo(`Answering help request: ${userMessage}`);

        let answerText = answer.answer;

        const singleUrls = [...new Set(answer.urls)];

        if (answer.urls && answer.urls.length > 0) {
          for (let i = 0; i < singleUrls.length; i++) {
            const url = singleUrls[i];
            answerText += ` [[${i + 1}]](${url})`;
          }
        }

        const embed = new EmbedBuilder({
          description: answerText,
          color: 0x0099ff,
        });

        const sentMessage = await message.reply({ embeds: [embed] });

        saveAnswer({
          answer: answer.answer,
          urls: singleUrls,
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
    } else {
      logInfo(`Ignoring non-help request: ${userMessage}`);
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
