import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.mjs";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const ClaudeResponseSchema = z.object({
    history: z.string(),
    notablePlayers: z.array(z.string()),
    achievements: z.array(z.string()),
    currentManager: z.string(),
    currentStadium: z.string(),
    fans: z.string()
});

async function runClaude() {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
    });

    const response = await anthropic.messages.parse({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        messages: [{
            role: "user",
            content: "Tell me something about Liverpool FC"
        }],
        output_config: { format: zodOutputFormat(ClaudeResponseSchema) }
    })
    
    console.log(response);
    console.log(response.parsed_output);
}

runClaude();
