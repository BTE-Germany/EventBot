import { Bot } from "../../bot.ts";
import log from "../utils/logger.ts";
import {updateLeaderBoard} from "../utils/updateLeaderBoard.ts";

Bot.events.ready = (_, payload) => {
  log.info(
    `[READY] Shard ID ${payload.shardId} of ${
      Bot.gateway.lastShardId + 1
    } shards is ready!`
  );

  if (payload.shardId === Bot.gateway.lastShardId) {
    botFullyReady();
  }

  updateLeaderBoard(Bot);
};

function botFullyReady() {
  log.info("[READY] Bot is fully online.");
}
