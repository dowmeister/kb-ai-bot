import "dotenv/config";

import readline from "readline";
import { askQuestion } from "./ai/ask";
import { logInfo, logError } from "./helpers/logger";

/**
 * Initialize the command-line interface for interactive Q&A
 */
function startCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  logInfo("Welcome to the Knowledge Base Assistant!");
  logInfo('Type your question below or type "exit" to quit.\n');

  rl.setPrompt("> ");
  rl.prompt();

  rl.on("line", async (input) => {
    const question = input.trim();

    if (question.toLowerCase() === "exit") {
      rl.close();
      return;
    }

    if (question.length === 0) {
      console.log("Please enter a question.");
      rl.prompt();
      return;
    }

    try {
      const response = await askQuestion(question);
      console.log(`\nAssistant: ${response.answer}\n`);
    } catch (error) {
      logError(`Failed to process your question: ${(error as Error).message}`);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nGoodbye!");
    process.exit(0);
  });
}

startCLI();
