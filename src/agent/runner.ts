import { graph } from "./graph";
import * as readline from "readline";

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

    console.log("\n=== Starting Recipe Planner ===\n");
    console.log("Your Input:", JSON.stringify(input, null, 2));
    
    if (userInput.mode === "daily") {
        console.log("\nExpected Flow: START → mealSuggester → recipeFetcher → groceryFormatter → END\n");
    } else {
        console.log("\nExpected Flow: START → mealSuggester → varietyEnforcer → recipeFetcher → nutritionBalancer → groceryFormatter → END\n");
    }
    
    let stepCount = 0;
    for await (const step of await graph.stream(input)) {
        stepCount++;
        console.log(`\nStep ${stepCount}:`, Object.keys(step)[0]);
        console.log("---");
    }
    
    console.log(`\n✅ Total steps executed: ${stepCount}`);
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
