import { dotEnvConfig } from "./deps.ts";

// Get the .env file that the user should have created, and get the token
const env = dotEnvConfig({ export: true, path: "./.env" });
const token = env.BOT_TOKEN || "";
const judge_channel = env.JUDGE_CHANNEL || "";
const submission_channel = env.SUBMISSION_CHANNEL || "";
const ping_role = env.PING_ROLE || "";
const leaderboard_channel = env.LEADERBOARD_CHANNEL || "";
const leaderboard_message = env.LEADERBOARD_MESSAGE || "";
const minio_access = env.MINIO_ACCES || "";
const minio_secret = env.MINIO_SECRET || "";
const minio_endpoint = env.MINIO_ENDPOINT || "";
const minio_bucket = env.MINIO_BUCKET || "";
const minio_url = env.MINIO_URL || "";

export interface Config {
  token: string;
  judge_channel: bigint;
  submission_channel: bigint;
  ping_role: bigint;
  leaderboard_message: bigint;
  leaderboard_channel: bigint;
  minio_access: string;
  minio_secret: string;
  minio_endpoint: string;
  minio_bucket: string;
  minio_url: string;
}

export const configs = {
  token,
  ping_role: BigInt(ping_role),
  judge_channel: BigInt(judge_channel),
  submission_channel: BigInt(submission_channel),
  leaderboard_message: BigInt(leaderboard_message),
  leaderboard_channel: BigInt(leaderboard_channel),
  minio_access: minio_access,
  minio_secret: minio_secret,
  minio_endpoint: minio_endpoint,
  minio_bucket: minio_bucket,
  minio_url: minio_url,
};
