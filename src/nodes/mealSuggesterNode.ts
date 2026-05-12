/**
 * Meal Suggester Node
 * 
 * First node in the recipe planning workflow.
 * Uses AI to generate meal suggestions based on user preferences.
 * 
 * Responsibilities:
 * - Generate 1 meal (daily mode) or 7 meals (weekly mode)
 * - Include search keywords and fallback keywords for each meal
 * - Handle user feedback for regeneration (weekly mode)
 * - Validate AI output against MealSchema
 * 
 * Input State:
 * - recipeQuery: User's meal planning preferences
 * - userFeedback: Optional feedback from human review (regeneration only)
 * 
 * Output State:
 * - meals: Array of meal suggestions with keywords
 * - userFeedback: Cleared after use
 * - needsRegeneration: Cleared after use
 * 
 * Next Node:
 * - mealPicker: Searches Spoonacular for matching recipes
 */

import { MealSchema, RecipeAgentState } from "../agent/state";
import { model } from "../config/model";
import { DailyMealSearchPrompt, WeeklyMealSearchPrompt } from "../prompts";
import { z } from "zod";

export const mealSuggesterNode = async (state: typeof RecipeAgentState.State) => {
    try {
        if (!state.recipeQuery) {
            throw new Error("Recipe query is missing from state");
        }

        const mealQuery = state.recipeQuery;
        
        // Response schema for AI structured output
        const MealsResponseSchema = z.object({
            meals: z.array(MealSchema)
        });
        
        const structuredMeals = model.withStructuredOutput(MealsResponseSchema);
        let response;
        
        // Daily mode: Generate 1 meal
        if(mealQuery.mode === "daily") {
            const prompt = DailyMealSearchPrompt(JSON.stringify(mealQuery));
            response = await structuredMeals.invoke(prompt);
        } 
        // Weekly mode: Generate 7 meals (one per day)
        else {
            // REGENERATION: Two-step process for reliable meal preservation
            if (state.userFeedback && state.meals) {
                console.log('[MealSuggester] Regeneration requested with feedback:', state.userFeedback);
                
                // Step 1: Ask AI which day numbers need to be changed based on feedback
                const AnalysisSchema = z.object({
                    daysToChange: z.array(z.number()).describe('Array of day numbers (1-7) that need to be changed based on user feedback'),
                    reasoning: z.string().describe('Brief explanation of why these days were selected')
                });
                
                const analysisModel = model.withStructuredOutput(AnalysisSchema);
                const analysisPrompt = `You are analyzing user feedback on a weekly meal plan.

CURRENT MEAL PLAN:
${state.meals.map(m => `Day ${m.day}: ${m.name} (${m.cuisine})`).join('\n')}

USER FEEDBACK:
"${state.userFeedback}"

Based on the feedback, which day numbers (1-7) need to be changed? Return ONLY the day numbers that the user wants to modify.

Examples:
- "Replace masala oats" → Find which day has masala oats, return that day number
- "Change day 3" → Return [3]
- "Replace all Indian meals" → Return day numbers of all Indian cuisine meals
- "Keep everything the same" → Return []

Return the day numbers as an array.`;

                const analysis = await analysisModel.invoke(analysisPrompt);
                console.log('[MealSuggester] Days to change:', analysis.daysToChange);
                console.log('[MealSuggester] Reasoning:', analysis.reasoning);
                
                // Step 2: Generate new meals ONLY for the days that need changing
                if (analysis.daysToChange.length === 0) {
                    console.log('[MealSuggester] No changes needed, keeping all meals');
                    response = { meals: state.meals };
                } else {
                    // Generate new meals for specified days
                    const RegenerationSchema = z.object({
                        meals: z.array(MealSchema)
                    });
                    
                    const regenModel = model.withStructuredOutput(RegenerationSchema);
                    const regenPrompt = `${WeeklyMealSearchPrompt(JSON.stringify(mealQuery))}

REGENERATION REQUEST:
Generate NEW meals for ONLY these days: ${analysis.daysToChange.join(', ')}

User feedback: "${state.userFeedback}"

Generate ${analysis.daysToChange.length} meal(s) that address the user's feedback. Use the correct day numbers: ${analysis.daysToChange.join(', ')}`;

                    const newMeals = await regenModel.invoke(regenPrompt);
                    
                    // Step 3: Merge - keep unchanged meals, replace specified days
                    const finalMeals = state.meals.map(oldMeal => {
                        if (analysis.daysToChange.includes(oldMeal.day)) {
                            // Find the new meal for this day
                            const newMeal = newMeals.meals.find(m => m.day === oldMeal.day);
                            if (newMeal) {
                                console.log(`[MealSuggester] Replacing day ${oldMeal.day}: "${oldMeal.name}" → "${newMeal.name}"`);
                                return newMeal;
                            }
                        }
                        console.log(`[MealSuggester] Keeping day ${oldMeal.day}: "${oldMeal.name}"`);
                        return oldMeal;
                    });
                    
                    response = { meals: finalMeals };
                }
            } else {
                // Initial generation (no feedback)
                const prompt = WeeklyMealSearchPrompt(JSON.stringify(mealQuery));
                response = await structuredMeals.invoke(prompt);
            }
        }

        // Validate AI response against schema
        const validatedData = MealsResponseSchema.parse(response);
        
        if (!validatedData.meals || validatedData.meals.length === 0) {
            throw new Error("No meals were generated by the AI");
        }
        
        // Return updated state with meals
        // Clear feedback and regeneration flags after use
        return { 
            meals: validatedData.meals,
            userFeedback: undefined,
            needsRegeneration: undefined
        };
        
    } catch (error) {
        console.error("[MealSuggester] Error:", error);
        
        // Provide detailed error message for validation failures
        if (error instanceof z.ZodError) {
            console.error("[MealSuggester] Validation error:", error.issues);
            throw new Error(`Meal validation failed: ${error.issues.map((e: z.ZodIssue) => e.message).join(", ")}`);
        }
        
        throw error;
    }
};

