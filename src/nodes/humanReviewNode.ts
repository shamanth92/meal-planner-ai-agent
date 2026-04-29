import { RecipeAgentState } from "../agent/state";
import { interrupt } from "@langchain/langgraph";

export const humanReviewNode = async (state: typeof RecipeAgentState.State) => {
    console.log("\n" + "=".repeat(60));
    console.log("📋 WEEKLY MEAL PLAN REVIEW");
    console.log("=".repeat(60) + "\n");
    
    if (!state.meals || state.meals.length === 0) {
        throw new Error("No meals found in state");
    }
    
    // Display all meals
    state.meals.forEach((meal) => {
        console.log(`Day ${meal.day}: ${meal.name}`);
        console.log(`  Cuisine: ${meal.cuisine}`);
        console.log(`  Description: ${meal.description}`);
        console.log("");
    });
    
    console.log("=".repeat(60));
    console.log("Review the meal plan above.");
    console.log("=".repeat(60) + "\n");
    
    // Interrupt and wait for user decision
    // The value passed to Command({ resume }) will be returned here
    // DO NOT wrap interrupt() in try/catch - it throws a special error to pause execution
    const userDecision = interrupt({
        question: "Would you like to proceed with this meal plan?",
        options: ["yes", "no"],
        meals: state.meals
    }) as { decision: string; feedback?: string };
    
    // Check user's decision
    if (userDecision.decision === "yes") {
        console.log("\n✅ Proceeding with the meal plan...\n");
        return { 
            needsRegeneration: false,
            userFeedback: undefined
        };
    }
    
    // User wants to regenerate
    const feedback = userDecision.feedback || "";
    
    if (!feedback || feedback.trim() === "") {
        console.log("\n⚠️  No feedback provided. Proceeding with current meal plan...\n");
        return { 
            needsRegeneration: false,
            userFeedback: undefined
        };
    }
    
    console.log(`\n🔄 Regenerating meal plan with feedback: "${feedback}"\n`);
    
    return { 
        needsRegeneration: true,
        userFeedback: feedback.trim()
    };
};
