/**
 * Human Review Node
 * 
 * Human-in-the-loop node for weekly meal plan approval.
 * Uses LangGraph's interrupt() to pause execution and wait for user input.
 * 
 * Responsibilities:
 * - Display all 7 meals to user for review
 * - Pause execution using interrupt()
 * - Receive user decision via Command({ resume })
 * - Set regeneration flags based on user feedback
 * 
 * Interrupt Flow:
 * 1. Display meals to console
 * 2. Call interrupt() with question and meal data
 * 3. Execution pauses, control returns to runner
 * 4. Runner prompts user and calls Command({ resume: { decision, feedback } })
 * 5. The resume value becomes the return value of interrupt()
 * 6. Node processes decision and returns state update
 * 
 * Input State:
 * - meals: Array of 7 meal suggestions from mealSuggester
 * 
 * Output State (user approves):
 * - needsRegeneration: false
 * - userFeedback: undefined
 * 
 * Output State (user wants changes):
 * - needsRegeneration: true
 * - userFeedback: User's feedback text
 * 
 * Next Node:
 * - If approved: recipeFetcher (via conditional edge)
 * - If regenerate: mealSuggester (via conditional edge, creates loop)
 * 
 * IMPORTANT: Do NOT wrap interrupt() in try/catch - it throws a special error
 * that LangGraph catches internally to pause execution.
 */

import { RecipeAgentState } from "../agent/state";
import { interrupt } from "@langchain/langgraph";

export const humanReviewNode = async (state: typeof RecipeAgentState.State) => {
    console.log("\n" + "=".repeat(60));
    console.log("📋 WEEKLY MEAL PLAN REVIEW");
    console.log("=".repeat(60) + "\n");
    
    if (!state.meals || state.meals.length === 0) {
        throw new Error("No meals found in state");
    }
    
    // Display all meals for user review
    state.meals.forEach((meal) => {
        console.log(`Day ${meal.day}: ${meal.name}`);
        console.log(`  Cuisine: ${meal.cuisine}`);
        console.log(`  Description: ${meal.description}`);
        console.log("");
    });
    
    console.log("=".repeat(60));
    console.log("Review the meal plan above.");
    console.log("=".repeat(60) + "\n");
    
    /**
     * Interrupt execution and wait for user decision
     * 
     * This pauses the graph execution and returns control to the runner.
     * The runner will:
     * 1. Detect the interrupt using isInterrupted(result)
     * 2. Access this payload via result[INTERRUPT][0].value
     * 3. Prompt user for decision
     * 4. Resume with Command({ resume: { decision, feedback } })
     * 
     * The object passed to Command({ resume }) becomes the return value here.
     * 
     * DO NOT wrap in try/catch - interrupt() throws a special error that
     * LangGraph catches to pause execution.
     */
    const userDecision = interrupt({
        question: "Would you like to proceed with this meal plan?",
        options: ["yes", "no"],
        meals: state.meals
    }) as { decision: string; feedback?: string };
    
    // Process user's decision (code below runs after resume)
    if (userDecision.decision === "yes") {
        console.log("\n✅ Proceeding with the meal plan...\n");
        return { 
            needsRegeneration: false,
            userFeedback: undefined
        };
    }
    
    // User wants to regenerate - check if feedback provided
    const feedback = userDecision.feedback || "";
    
    if (!feedback || feedback.trim() === "") {
        console.log("\n⚠️  No feedback provided. Proceeding with current meal plan...\n");
        return { 
            needsRegeneration: false,
            userFeedback: undefined
        };
    }
    
    console.log(`\n🔄 Regenerating meal plan with feedback: "${feedback}"\n`);
    
    // Return state update to trigger regeneration
    // Graph will route back to mealSuggester via conditional edge
    return { 
        needsRegeneration: true,
        userFeedback: feedback.trim()
    };
};
