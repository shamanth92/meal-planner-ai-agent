import { RecipeAgentState, WeeklyNutritionSchema } from "../agent/state";
import { model } from "../config/model";
import { NutritionBalancerPrompt } from "../prompts";
import { z } from "zod";

export const nutritionBalancerNode = async (state: typeof RecipeAgentState.State) => {
    try {
        console.log("[NutritionBalancer] Starting nutrition analysis...");
        
        if (!state.recipes || state.recipes.length === 0) {
            throw new Error("No recipes found in state");
        }
        
        if (!state.meals || state.meals.length === 0) {
            throw new Error("No meals found in state");
        }
        
        console.log("[NutritionBalancer] Extracting nutrition from", state.recipes.length, "recipes");
        
        // Extract nutrition data from recipes and map to days
        const dailyNutrition = state.meals.map((meal, index) => {
            const recipe = state.recipes?.[index];
            if (!recipe || !recipe.nutrition) {
                console.warn(`[NutritionBalancer] No nutrition data for day ${meal.day || index + 1}`);
                return {
                    day: meal.day || index + 1,
                    calories: 0,
                    protein: 0,
                    carbs: 0
                };
            }
            
            return {
                day: meal.day || index + 1,
                calories: recipe.nutrition.calories,
                protein: recipe.nutrition.protein,
                carbs: recipe.nutrition.carbs
            };
        });
        
        // Calculate weekly totals
        const totals = dailyNutrition.reduce(
            (acc, day) => ({
                calories: acc.calories + day.calories,
                protein: acc.protein + day.protein,
                carbs: acc.carbs + day.carbs
            }),
            { calories: 0, protein: 0, carbs: 0 }
        );
        
        const nutritionData = {
            totals,
            daily: dailyNutrition
        };
        
        console.log("[NutritionBalancer] Weekly totals:", totals);
        console.log("[NutritionBalancer] Invoking AI for nutrition analysis...");
        
        // Get AI analysis
        const NutritionResponseSchema = z.object({
            weeklyNutrition: WeeklyNutritionSchema
        });
        
        const structuredNutrition = model.withStructuredOutput(NutritionResponseSchema);
        const response = await structuredNutrition.invoke(NutritionBalancerPrompt(JSON.stringify(nutritionData)));
        
        const validatedData = NutritionResponseSchema.parse(response);
        
        if (!validatedData.weeklyNutrition) {
            throw new Error("No nutrition data was returned by the AI");
        }
        
        console.log("[NutritionBalancer] Analysis complete");
        console.log("[NutritionBalancer] Summary:", validatedData.weeklyNutrition.analysis?.summary);
        
        return { weeklyNutrition: validatedData.weeklyNutrition };
        
    } catch (error) {
        console.error("[NutritionBalancer] Error:", error);
        
        if (error instanceof z.ZodError) {
            console.error("[NutritionBalancer] Validation error:", error.issues);
            throw new Error(`Nutrition validation failed: ${error.issues.map((e: z.ZodIssue) => e.message).join(", ")}`);
        }
        
        throw error;
    }
};

