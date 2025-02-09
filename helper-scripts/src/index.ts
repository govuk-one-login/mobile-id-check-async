import { welcomeMessage } from "./stackManagementTool/prompts.js";
import { stackManagementTool } from "./stackManagementTool/stackManagementTool.js";

welcomeMessage();
await stackManagementTool();
