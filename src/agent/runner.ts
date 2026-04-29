import { graph } from "./graph";
import { RecipeAgentState } from "./state";
import { Command, INTERRUPT, isInterrupted } from "@langchain/langgraph";
import * as readline from "readline";

interface InterruptPayload {
    question?: string;
    options?: string[];
    meals?: any[];
}

function isInterruptPayload(value: unknown): value is InterruptPayload {
    return typeof value === 'object' && value !== null;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};

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
    // if (mode === "daily") {
        const mealTimeInput = await question("Meal time (breakfast/lunch/dinner): ");
        mealTime = mealTimeInput as "breakfast" | "lunch" | "dinner";
    // }
    
    return {
        mode: mode as "daily" | "weekly",
        cuisines,
        goal: goal as "balanced" | "weight_loss" | "muscle_gain" | "high_protein",
        dietary: dietary as "vegetarian" | "vegan" | "non-veg",
        budget,
        mealTime
    };
};

async function runRecipePlanner() {
    const userInput = await getUserInput();
    
    const input = {
        recipeQuery: userInput
    };

    console.log("\n" + "=".repeat(60));
    console.log("🍽️  RECIPE PLANNER STARTED");
    console.log("=".repeat(60) + "\n");
    
    const config = { configurable: { thread_id: "recipe-planner-session" } };
    
    // Initial invoke - will pause at interrupt() calls
    let result = await graph.invoke(input, config);
    
    // Loop while there are interrupts to handle
    while (isInterrupted(result)) {
        // Check the interrupt payload
        const interrupts = result[INTERRUPT];
        
        if (interrupts && interrupts.length > 0) {
            const interruptData = interrupts[0];
            
            // Type assertion: we know the interrupt value structure from humanReviewNode
            if (!isInterruptPayload(interruptData.value)) {
                throw new Error("Invalid interrupt payload structure");
            }
            
            const interruptValue = interruptData.value;
            const interruptQuestion = interruptValue.question || "Would you like to proceed with this meal plan?";
            const decision = await question(`\n${interruptQuestion} (yes/no): `);
            
            if (decision.toLowerCase() === "yes" || decision.toLowerCase() === "y") {
                // Resume with yes decision
                result = await graph.invoke(
                    new Command({ 
                        resume: { decision: "yes" } 
                    }), 
                    config
                );
                break;
            } else {
                // Get feedback
                console.log("\nPlease provide feedback on what you'd like to change:");
                console.log("Examples:");
                console.log("  - 'Less chicken, more seafood'");
                console.log("  - 'Replace Day 3 and Day 5 with vegetarian options'");
                console.log("  - 'I don't like Indian cuisine, try Mediterranean instead'");
                console.log("  - 'Make meals lighter, around 400-500 calories'\n");
                
                const feedback = await question("Your feedback: ");
                
                if (feedback && feedback.trim() !== "") {
                    // Resume with no decision and feedback
                    result = await graph.invoke(
                        new Command({ 
                            resume: { 
                                decision: "no", 
                                feedback: feedback.trim() 
                            } 
                        }), 
                        config
                    );
                    // Loop will continue if there's another interrupt (regeneration loop)
                } else {
                    // No feedback, proceed anyway
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
