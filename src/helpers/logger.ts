const chalk = require("chalk");

export function logInfo(message: string) {
  console.log(chalk.blueBright(`[INFO] ${message}`));
}

export function logSuccess(message: string) {
  console.log(chalk.greenBright(`[SUCCESS] ${message}`));
}

export function logWarning(message: string) {
  console.log(chalk.yellowBright(`[WARNING] ${message}`));
}

export function logError(message: string, error?: any) {
  console.log(chalk.redBright(`[ERROR] ${message}`), error);
}
