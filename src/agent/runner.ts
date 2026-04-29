/**
 * CLI Runner for Recipe Planning Agent
 * 
 * This file handles:
 * - User input collection via readline
 * - Graph execution with interrupt handling
 * - Human-in-the-loop workflow for weekly meal plan review
 * 
 * Interrupt Flow:
 * 1. Graph executes until interrupt() is called in humanReviewNode
 * 2. Execution pauses, returns result with __interrupt__ data
 * 3. Runner detects interrupt, prompts user for decision
 * 4. Runner resumes with Command({ resume }) containing user's response
 * 5. Graph continues from interrupt point with the resume value
 * 6. Loop repeats if user wants to regenerate meals
 */

import { graph } from "./graph";
import { RecipeAgentState } from "./state";
import { Command, INTERRUPT, isInterrupted } from "@langchain/langgraph";
import * as readline from "readline";

/**
 * InterruptPayload
 * 
 * Structure of data passed to interrupt() in humanReviewNode.
 * Used to validate and type the interrupt value.
 * 
 * @property question - Question to display to user
 * @property options - Available options (e.g., ["yes", "no"])
 * @property meals - Meal data to display for review
 */
interface InterruptPayload {
    question?: string;
    options?: string[];
    meals?: any[];
}

/**
 * Type guard to validate interrupt payload structure
 * 
 * @param value - Unknown value from interrupt
 * @returns True if value is a valid InterruptPayload
 */
function isInterruptPayload(value: unknown): value is InterruptPayload {
    return typeof value === 'object' && value !== null;
}

/**
 * Readline interface for CLI input
 */
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Promisified readline question
 * 
 * @param query - Question to ask user
 * @returns User's response
 */
const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};

/**
 * Collect user input for meal planning
 * 
 * Prompts user for:
 * - Planning mode (daily/weekly)
 * - Cuisine preferences
 * - Nutritional goal
 * - Dietary restrictions
 * - Budget (optional)
 * - Meal time (breakfast/lunch/dinner)
 * 
 * @returns RecipeQuery object matching RecipeQuerySchema
 */
const getUserInput = async () => {
    console.log("\n=== Recipe Planner - User Input ===\n");
    
    const mode = await question("Mode (daily/weekly): ");
    const cuisinesInput = await question("Cuisines (comma-separated, e.g., Indian,Mexican,Italian): ");
    const cuisines = cuisinesInput.split(",").map(c => c.trim());
    const goal = await question("Goal (balanced/weight_loss/muscle_gain/high_protein): ");
    const dietary = await question("Dietary preference (vegetarian/vegan/non-veg): ");
    const budgetInput = await question("Budget (optional, press Enter to skip): ");
    const budget = budgetInput ? parseInt(budgetInput) : undefined;
    
    let mealTime: "breakfast" | "lunch" | "dinner" | undefined;
    const mealTimeInput = await question("Meal time (breakfast/lunch/dinner): ");
    mealTime = mealTimeInput as "breakfast" | "lunch" | "dinner";
    
    return {
        mode: mode as "daily" | "weekly",
        cuisines,
        goal: goal as "balanced" | "weight_loss" | "muscle_gain" | "high_protein",
        dietary: dietary as "vegetarian" | "vegan" | "non-veg",
        budget,
        mealTime
    };
};

/**
 * Main recipe planning execution function
 * 
 * Flow:
 * 1. Collect user input
 * 2. Start graph execution with invoke()
 * 3. Handle interrupts in a loop (weekly mode only)
 * 4. Resume execution with user's decision
 * 5. Repeat until user approves or execution completes
 * 
 * Interrupt Handling:
 * - Daily mode: No interrupts, executes straight through
 * - Weekly mode: Pauses at humanReview for user approval
 * - If user says "yes": Proceeds to recipe fetching
 * - If user says "no": Collects feedback and regenerates meals
 * - Loop continues until user approves
 * 
 * Thread ID:
 * - Uses fixed thread_id for checkpointer to persist state
 * - Same thread_id required for resume to work
 * - For production, generate unique thread_id per session
 */
async function runRecipePlanner() {
    const userInput = await getUserInput();
    
    const input = {
        recipeQuery: userInput
    };

    console.log("\n" + "=".repeat(60));
    console.log("🍽️  RECIPE PLANNER STARTED");
    console.log("=".repeat(60) + "\n");
    
    // Config with thread_id for checkpointer state persistence
    const config = { configurable: { thread_id: "recipe-planner-session" } };
    
    // Initial invoke - executes until interrupt() or completion
    let result = await graph.invoke(input, config);
    
    // Interrupt handling loop (weekly mode only)
    // Continues until user approves or no more interrupts
    while (isInterrupted(result)) {
        const interrupts = result[INTERRUPT];
        
        if (interrupts && interrupts.length > 0) {
            const interruptData = interrupts[0];
            
            // Validate interrupt payload structure
            if (!isInterruptPayload(interruptData.value)) {
                throw new Error("Invalid interrupt payload structure");
            }
            
            // Extract question from interrupt payload
            const interruptValue = interruptData.value;
            const interruptQuestion = interruptValue.question || "Would you like to proceed with this meal plan?";
            const decision = await question(`\n${interruptQuestion} (yes/no): `);
            
            if (decision.toLowerCase() === "yes" || decision.toLowerCase() === "y") {
                // User approves - resume and proceed to recipe fetching
                result = await graph.invoke(
                    new Command({ 
                        resume: { decision: "yes" } 
                    }), 
                    config
                );
                break;
            } else {
                // User wants changes - collect feedback
                console.log("\nPlease provide feedback on what you'd like to change:");
                console.log("Examples:");
                console.log("  - 'Less chicken, more seafood'");
                console.log("  - 'Replace Day 3 and Day 5 with vegetarian options'");
                console.log("  - 'I don't like Indian cuisine, try Mediterranean instead'");
                console.log("  - 'Make meals lighter, around 400-500 calories'\n");
                
                const feedback = await question("Your feedback: ");
                
                if (feedback && feedback.trim() !== "") {
                    // Resume with feedback - triggers regeneration
                    // Graph will loop: humanReview → mealSuggester → mealPicker → humanReview
                    result = await graph.invoke(
                        new Command({ 
                            resume: { 
                                decision: "no", 
                                feedback: feedback.trim() 
                            } 
                        }), 
                        config
                    );
                    // Loop continues - will interrupt again at humanReview
                } else {
                    // No feedback provided - proceed anyway
                    result = await graph.invoke(
                        new Command({ 
                            resume: { decision: "yes" } 
                        }), 
                        config
                    );
                    break;
                }
            }
        } else {
            break;
        }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ RECIPE PLANNER COMPLETED");
    console.log("=".repeat(60) + "\n");
}

/**
 * Main entry point
 * 
 * Handles:
 * - Recipe planner execution
 * - Error handling and logging
 * - Cleanup (close readline, exit process)
 */
async function main() {
    try {
        await runRecipePlanner();
        console.log("\n✅ Recipe planner completed successfully!");
    } catch (error) {
        console.error("\n❌ Error during execution:", error);
    } finally {
        rl.close();
        process.exit(0);
    }
}

main();
