// import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { config } from "./env";

// Anthropic model (commented out)
// export const model = new ChatAnthropic({
//     model: "claude-sonnet-4-5",
//     temperature: 1.0,
//     apiKey: config.anthropicApiKey
// });

// OpenAI model
export const model = new ChatOpenAI({
    model: "gpt-5.4-mini",
    temperature: 1.0,
    apiKey: config.openaiApiKey
});
