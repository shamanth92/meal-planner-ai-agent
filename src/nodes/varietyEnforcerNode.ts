import { RecipeAgentState, MealSchema } from "../agent/state";
import { model } from "../config/model";
import { VarietyEnforcerPrompt } from "../prompts";
import { z } from "zod";

export const varietyEnforcerNode = async (state: typeof RecipeAgentState.State) => {
    try {
        console.log("[VarietyEnforcer] Starting variety check...");
        
        if (!state.meals || state.meals.length === 0) {
            throw new Error("No meals found in state");
        }
        
        console.log("[VarietyEnforcer] Checking", state.meals.length, "meals for variety");
        
        const MealsResponseSchema = z.object({
            meals: z.array(MealSchema)
        });
        
        // Get AI to check and enforce variety
        console.log("[VarietyEnforcer] Invoking AI to enforce variety...");
        const structuredMeals = model.withStructuredOutput(MealsResponseSchema);
        const response = await structuredMeals.invoke(VarietyEnforcerPrompt(JSON.stringify(state.meals)));
        
        // Validate response
        const validatedData = MealsResponseSchema.parse(response);
        
        if (!validatedData.meals || validatedData.meals.length === 0) {
            throw new Error("No meals were returned by the AI");
        }
        
        console.log("[VarietyEnforcer] Successfully enforced variety, returned", validatedData.meals.length, "meals");
        
        return { meals: validatedData.meals };
        
    } catch (error) {
        console.error("[VarietyEnforcer] Error:", error);
        
        if (error instanceof z.ZodError) {
            console.error("[VarietyEnforcer] Validation error:", error.issues);
            throw new Error(`Meal validation failed: ${error.issues.map((e: z.ZodIssue) => e.message).join(", ")}`);
        }
        
        throw error;
    }
};
