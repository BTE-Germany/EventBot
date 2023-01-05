import { dotEnvConfig } from "./deps.ts";

// Get the .env file that the user should have created, and get the token
const env = dotEnvConfig({ export: true, path: "./.env" });
const token = env.BOT_TOKEN || "";
const judge_channel = env.JUDGE_CHANNEL || "";
const submission_channel = env.SUBMISSION_CHANNEL || "";
const ping_role = env.PING_ROLE || "";
const leaderboard_channel = env.LEADERBOARD_CHANNEL || "";
const leaderboard_message = env.LEADERBOARD_MESSAGE || "";
const azureconnectionstring = env.AZURE_STORAGE_CONNECTION_STRING || "";
const azure_container = env.AZURE_STORAGE_CONTAINER_NAME || "";
const azure_url = env.AZURE_STORAGE_URL || "";

export interface Config {
  token: string;
  judge_channel: bigint;
  submission_channel: bigint;
  ping_role: bigint;
  leaderboard_message: bigint;
  leaderboard_channel: bigint;
  azureconnectionstring: string;
  azure_container: string;
  azure_url: string;
}

export const configs = {
  token,
  ping_role: BigInt(ping_role),
  judge_channel: BigInt(judge_channel),
  submission_channel: BigInt(submission_channel),
  leaderboard_message: BigInt(leaderboard_message),
  leaderboard_channel: BigInt(leaderboard_channel),
  azureconnectionstring: azureconnectionstring,
  azure_container: azure_container,
  azure_url: azure_url
};
