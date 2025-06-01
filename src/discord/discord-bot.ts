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
  TextChannel,
} from "discord.js";
import { askQuestion } from "../ai/ask";
import { initMongoose } from "../mongo";
import { logInfo, logError, logSuccess } from "../helpers/logger";
import {
  buildReply,
  isHelpRequestSimple,
  removeMentions,
} from "../helpers/utils";
import { embeddingService } from "../services/embedding-service";
import { knowledgeCommands } from "./commands/knowledge-commands";
import DiscordMessage from "../database/models/discordMessage";
import { projectCommands } from "./commands/project-commands";
import { registerCommands } from "./commands-management";
import KnowledgeSource from "../database/models/knowledgeSource";
import Project from "../database/models/project";

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
const commands = new Collection<string, any>();
knowledgeCommands.forEach((command: any) => {
  commands.set(command.data.name, command);
});
/*
projectCommands.forEach((command: any) => {
  commands.set(command.data.name, command);
});
*/

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
      const userMessage = removeMentions(message.content.trim());
      if (userMessage.length === 0) return;

      const member = await message.guild?.members.fetch(message.author.id);
      const isModerator = member ? isMemberModerator(member) : false;

      const savedDiscordMessage = await DiscordMessage.create({
        guildId: message.guildId,
        content: userMessage,
        authorId: message.author.id,
        authorUsername: message.author.username,
        channelId: message.channelId,
        messageId: message.id,
        channelName: (message.channel as TextChannel).name,
      });

      const embedding = await embeddingService.generateEmbedding(userMessage);

      if (!embedding) {
        logError("Failed to get embedding for the message.");
        return;
      }

      if (embedding.length === 0) {
        logError("Empty embedding received.");

        savedDiscordMessage.updateOne({ replied: false });
        return;
      }

      await message.channel.sendTyping();

      const project = await Project.findOne({
        guildId: message.guildId,
      });

      if (!project) {
        logError(`No project found for guild ${message.guildId}`);
        await message.reply(
          "❓ I couldn't find a project for this server. Please create one first."
        );
        return;
      }

      const answer = await askQuestion(userMessage, project as IProject);

      if (answer && answer.answer.length > 0 && answer.replied) {
        logInfo(`Answering help request: ${userMessage}`);

        if (
          answer.answer ==
          "I'm sorry, I don't have enough information to answer."
        ) {
          await message.reply(
            "❓ I couldn't find enough information to answer that."
          );
          await savedDiscordMessage.updateOne({
            replied: false,
          });
          return;
        }

        const embed = buildReply(answer);

        const sentMessage = await message.reply({ embeds: [embed] });

        await savedDiscordMessage.updateOne({
          replied: true,
          answer: answer.answer,
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

        await savedDiscordMessage.updateOne({
          replied: false,
        });
      }
    }
  } catch (error) {
    logError(`Error handling Discord message: ${(error as Error).message}`);
  }
});

async function init() {
  await initMongoose();
  await registerCommands(commands);
  client.login(DISCORD_TOKEN);
}

init();
