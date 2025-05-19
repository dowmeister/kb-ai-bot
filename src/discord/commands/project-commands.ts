// src/commands/knowledge-commands.ts
import {
  CommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import Project from "../../database/models/project";
import KnowledgeSource from "../../database/models/knowledgeSource";

export const projectCommands = [
  {
    data: new SlashCommandBuilder()
      .setName("kf-project-add")
      .setDescription("Add to project knowledge base")
      .addStringOption((option) =>
        option
          .setName("name")
          .setDescription("The project title")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isCommand()) return;

      await interaction.deferReply();

      const name = interaction.options.getString("name", true);

      const project = await Project.create({
        name: name,
        guildId: interaction.guildId,
      });

      await interaction.followUp({
        content: `Project ${name} has been created with ID ${project._id}.`,
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("kf-project-list")
      .setDescription("List all projects")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isCommand()) return;

      await interaction.deferReply();

      const projects = await Project.find({
        guildId: interaction.guildId,
      })
        .populate("knowledgeSources")
        .exec();

      if (projects.length === 0) {
        await interaction.followUp({
          content: "No projects found.",
        });
        return;
      }

      const projectList = projects
        .map((project) => `- ${project.name} (${project._id} - ${project.knowledgeSources.length} source(s))`)
        .join("\n");

      await interaction.followUp({
        content: `Projects:\n${projectList}`,
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("kf-project-delete")
      .setDescription("Delete a project")
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription("The id of the project to delete")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isCommand()) return;

      await interaction.deferReply();

      const id = interaction.options.getString("id", true);

      await Project.deleteOne({ _id: id, guildId: interaction.guildId });

      await interaction.followUp({
        content: `Project with ID ${id} has been deleted.`,
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("kf-source-add")
      .setDescription("Get project info")
      .addStringOption((option) =>
        option
          .setName("project")
          .setDescription("The id of the project to add the source to")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("start_url")
          .setDescription("The start URL of the source")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isCommand()) return;

      await interaction.deferReply();

      const projectId = interaction.options.getString("project", true);
      const startUrl = interaction.options.getString("start_url", true);
      const project = await Project.findOne({
        _id: projectId,
        guildId: interaction.guildId,
      });

      if (!project) {
        await interaction.followUp({
          content: `Project with ID ${projectId} not found.`,
        });
        return;
      }
      const knowledgeSource = await KnowledgeSource.create({
        url: startUrl,
        project: project._id,
        type: "web",
      });

      await interaction.followUp({
        content: `Knowledge source with ID ${knowledgeSource._id} has been added to project ${project.name}.`,
      });
    },
  },
];
