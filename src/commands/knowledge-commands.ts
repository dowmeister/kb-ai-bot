// src/commands/knowledge-commands.ts
import {
  CommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import { embeddingService } from "../services/embedding-service";
import { askQuestion } from "../ask";
import { buildReply } from "../utils";
import { qdrantService } from "../services/qdrant-service";
import { exec } from "child_process";

export const knowledgeCommands = [
  {
    data: new SlashCommandBuilder()
      .setName("kb-add")
      .setDescription("Add to knowledge base")
      .addStringOption((option) =>
        option
          .setName("title")
          .setDescription("The question title")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("answer")
          .setDescription("The answer or explanation")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    execute: async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isCommand()) return;

      await interaction.deferReply();

      const title = interaction.options.getString("title", true);
      const answer = interaction.options.getString("answer", true);

      const embedding = await embeddingService.generateEmbedding(answer);

      await qdrantService.upsert(embedding, {
        title: title,
        text: answer,
        url: `kb-add-${interaction.id}`,
        key: `kb-add-${interaction.id}`,
        source: "discord",
        guild_id: interaction.guildId,
      });

      try {
        await interaction.editReply({
          content: "✅ Entry added to knowledge base!",
        });
      } catch (error) {
        console.error("Error adding to knowledge base:", error);
        await interaction.editReply({
          content: "❌ Failed to add entry to knowledge base.",
        });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("kb-delete")
      .setDescription("Delete from knowledge base")
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription("The id of the entry to delete")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    execute: async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isCommand()) return;

      await interaction.deferReply();

      const id = interaction.options.getString("id", true);

      await qdrantService.deleteVectorsById(id);

      try {
        await interaction.editReply({
          content: `✅ Entry deleted from knowledge base!`,
        });
      } catch (error) {
        console.error("Error deleting from knowledge base:", error);
        await interaction.editReply({
          content: "❌ Failed to delete entry from knowledge base.",
        });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("kb-list")
      .setDescription("List all entries in the knowledge base")
      .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    execute: async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isCommand()) return;

      await interaction.deferReply();

      const vectors = await qdrantService.getAllVectorsBySource("discord", interaction.guildId);

      if (!vectors || vectors.length === 0) {
        await interaction.editReply({
          content: "❌ No entries found in the knowledge base.",
        });
        return;
      }

      const replyContent = vectors
        .map(
          (vector) => `**ID:** ${vector.id}\n**Text:** ${vector.payload.title}`
        )
        .join("\n\n");

      await interaction.editReply({
        content: replyContent,
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("ask")
      .setDescription("Search the knowledge base")
      .addStringOption((option) =>
        option
          .setName("query")
          .setDescription("What do you want to search for?")
          .setRequired(true)
      )
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("User to reply to")
          .setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    execute: async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isChatInputCommand()) return;

      await interaction.deferReply();

      const query = interaction.options.getString("query", true);

      const user = interaction.options.getUser("user");

      const reply = await askQuestion(query);

      if (!reply || reply.answer.length === 0 || !reply.replied) {
        await interaction.editReply({
          content: "❌ No answer found.",
        });
        return;
      }

      try {
        let replyContent = "";

        if (user) {
          replyContent = `<@${user.id}>`;
        }

        const replyEmbed = buildReply(reply);

        await interaction.editReply({
          content: replyContent,
          embeds: [replyEmbed],
        });
      } catch (error) {
        console.error("Error sending reply:", error);
        await interaction.editReply("❌ Error sending reply.");
      }
    },
  },
];
