import { dotEnvConfig } from "./deps.ts";

// Get the .env file that the user should have created, and get the token
const env = dotEnvConfig({ export: true, path: "./.env" });
const token = env.BOT_TOKEN || "";
const judge_channel = env.JUDGE_CHANNEL || "";
const submission_channel = env.SUBMISSION_CHANNEL || "";
const ping_role = env.PING_ROLE || "";

export interface Config {
  token: string;
  judge_channel: bigint;
  submission_channel: bigint;
  ping_role: bigint;
}

export const configs = {
  token,
  ping_role: BigInt(ping_role),
  judge_channel: BigInt(judge_channel),
  submission_channel: BigInt(submission_channel),
};
