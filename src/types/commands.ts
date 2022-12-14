import { BotClient } from "../../bot.ts";
import {
  ApplicationCommandOption,
  ApplicationCommandTypes,
  Interaction,
} from "../../deps.ts";

export interface Command {
  name: string;
  description: string;
  type: ApplicationCommandTypes;
  options?: ApplicationCommandOption[];
  execute: (bot: BotClient, interaction: Interaction) => unknown;
}
