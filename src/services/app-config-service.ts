import { logInfo, logSuccess } from "../helpers/logger";
import AppConfig from "../database/models/appConfig";

class AppConfigService {
  public config: IAppConfig | null = null;

  public constructor() {}

  async initialize() {
    // Initialization logic can be added here if needed
    logInfo("AppConfig initialized");

    this.config = await AppConfig.findOne({});

    if (!this.config) {
      this.config = await AppConfig.create({});
      logSuccess("AppConfig configuration created");
    }

    logInfo("AppConfig configuration loaded");
  }
}

export const appConfigService = new AppConfigService();
