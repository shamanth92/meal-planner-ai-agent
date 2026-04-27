import { ChatAnthropic } from "@langchain/anthropic";
import { config } from "./env";

export const model = new ChatAnthropic({
    model: "claude-sonnet-4-5",
    temperature: 1.0,
    apiKey: config.anthropicApiKey
});
