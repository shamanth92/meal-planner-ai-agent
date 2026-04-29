/**
 * Nutrition Balancer Node
 * 
 * Analyzes weekly nutrition data and provides AI-generated insights.
 * Only runs in weekly mode.
 * 
 * Responsibilities:
 * - Extract nutrition from all 7 recipes
 * - Calculate daily nutrition breakdown
 * - Aggregate weekly totals (calories, protein, carbs)
 * - Use AI to analyze nutrition balance
 * - Provide recommendations for improvement
 * 
 * Analysis Process:
 * 1. Extract nutrition from each recipe
 * 2. Map to daily breakdown (day 1-7)
 * 3. Calculate weekly totals
 * 4. Send to AI for analysis
 * 5. AI returns: summary, pros, cons, recommendations
 * 
 * Input State:
 * - recipes: Array of 7 recipes with nutrition data
 * - meals: Array of 7 meals (for day mapping)
 * 
 * Output State:
 * - weeklyNutrition: {
 *     totals: Weekly aggregated nutrition
 *     daily: Per-day breakdown
 *     analysis: AI-generated insights
 *   }
 * 
 * Next Node:
 * - groceryFormatter
 */

import { RecipeAgentState, WeeklyNutritionSchema } from "../agent/state";
import { model } from "../config/model";
import { NutritionBalancerPrompt } from "../prompts";
import { z } from "zod";

export const nutritionBalancerNode = async (state: typeof RecipeAgentState.State) => {
    try {
        if (!state.recipes || state.recipes.length === 0) {
            throw new Error("No recipes found in state");
        }
        
        if (!state.meals || state.meals.length === 0) {
            throw new Error("No meals found in state");
        }
        
        // Extract nutrition from recipes and map to daily breakdown
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
        
        // Aggregate weekly totals using reduce
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
        
        // Get AI analysis of nutrition balance
        const NutritionResponseSchema = z.object({
            weeklyNutrition: WeeklyNutritionSchema
        });
        
        const structuredNutrition = model.withStructuredOutput(NutritionResponseSchema);
        const response = await structuredNutrition.invoke(NutritionBalancerPrompt(JSON.stringify(nutritionData)));
        
        const validatedData = NutritionResponseSchema.parse(response);
        
        if (!validatedData.weeklyNutrition) {
            throw new Error("No nutrition data was returned by the AI");
        }
        
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

