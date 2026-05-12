/**
 * Recipe Fetcher Node
 * 
 * Fetches detailed recipe information using two strategies:
 * 1. Spoonacular API (if spoonacularId exists)
 * 2. AI generation (fallback if no spoonacularId)
 * 
 * Responsibilities:
 * - Process each meal to get full recipe details
 * - Fetch from Spoonacular API when ID is available
 * - Generate realistic recipe with AI when no Spoonacular match
 * - Extract structured recipe data (ingredients, steps, nutrition)
 * - Validate all recipes against RecipeSchema
 * 
 * Dual-Path Strategy:
 * 
 * Path 1 (Spoonacular):
 * - Fetch raw recipe data from Spoonacular API
 * - Use AI to extract/structure the data into RecipeSchema format
 * - Ensures consistent format regardless of Spoonacular's response structure
 * 
 * Path 2 (AI Generation):
 * - Generate complete recipe from meal metadata (name, cuisine, description)
 * - AI creates realistic ingredients, steps, cooking time, and nutrition
 * - Used when mealPicker couldn't find Spoonacular match
 * 
 * Input State:
 * - meals: Array of meals with optional spoonacularId
 * 
 * Output State:
 * - recipes: Array of complete recipes with ingredients, steps, nutrition
 * 
 * Next Node:
 * - Daily mode: groceryFormatter
 * - Weekly mode: nutritionBalancer
 */

import { RecipeAgentState, RecipeSchema } from "../agent/state";
import { model } from "../config/model";
import { RecipePrompt, RecipeGenerationPrompt } from "../prompts";
import { getRecipeById } from "../tools/getRecipeById";
import { z } from "zod";

export const recipeFetcherNode = async (state: typeof RecipeAgentState.State) => {
    try {
        if (!state.meals || state.meals.length === 0) {
            throw new Error("No meals found in state");
        }
        
        const RecipeResponseSchema = z.object({
            recipes: z.array(RecipeSchema)
        });
        
        const allRecipes: z.infer<typeof RecipeSchema>[] = [];
        
        console.log(`\n[RecipeFetcher] 📝 Processing ${state.meals.length} meal(s)...\n`);
        
        // Process each meal to get detailed recipe
        for (let i = 0; i < state.meals.length; i++) {
            const meal = state.meals[i];
            const spoonacularId = meal.spoonacularId;
            let validatedData;
            
            console.log(`[RecipeFetcher] ${i + 1}/${state.meals.length}: "${meal.name}" (${meal.cuisine})`);
            
            // Path 2: AI Generation (no Spoonacular ID)
            if (!spoonacularId || spoonacularId === 0) {
                console.log(`[RecipeFetcher]   → No Spoonacular ID found, generating recipe with AI...`);
                
                const mealInfo = {
                    name: meal.name,
                    description: meal.description,
                    cuisine: meal.cuisine,
                    keywords: meal.keywords
                };
                
                const structuredRecipes = model.withStructuredOutput(RecipeResponseSchema);
                const response = await structuredRecipes.invoke(RecipeGenerationPrompt(JSON.stringify(mealInfo)));
                
                validatedData = RecipeResponseSchema.parse(response);
                console.log(`[RecipeFetcher]   ✓ AI-generated recipe complete\n`);
                
            } 
            // Path 1: Spoonacular Fetch + AI Extraction
            else {
                console.log(`[RecipeFetcher]   → Fetching from Spoonacular (ID: ${spoonacularId})...`);
                const recipe = await getRecipeById(spoonacularId);

                console.log(`[RecipeFetcher]   → Structuring recipe data with AI...`);
                // Use AI to extract and structure Spoonacular data
                const structuredRecipes = model.withStructuredOutput(RecipeResponseSchema);
                const response = await structuredRecipes.invoke(RecipePrompt(JSON.stringify(recipe)));

                validatedData = RecipeResponseSchema.parse(response);
                console.log(`[RecipeFetcher]   ✓ Recipe fetched and structured\n`);
            }
            
            if (!validatedData.recipes || validatedData.recipes.length === 0) {
                console.error("[RecipeFetcher] No recipe extracted for", meal.name);
                continue;
            }
            
            // Add first recipe from response to collection
            allRecipes.push(validatedData.recipes[0]);
        }
        
        if (allRecipes.length === 0) {
            throw new Error("No recipes were extracted");
        }
        
        return { recipes: allRecipes };
        
    } catch (error) {
        console.error("[RecipeFetcher] Error:", error);
        throw error;
    }
};
