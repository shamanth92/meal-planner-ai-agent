/**
 * Meal Picker Node
 * 
 * Searches Spoonacular API for recipes matching AI-generated meal suggestions.
 * Uses retry logic with fallback keywords if primary search fails.
 * 
 * Responsibilities:
 * - Search Spoonacular for each meal using keywords
 * - Retry with fallback keywords if no results found
 * - Update meals with Spoonacular recipe IDs
 * - Keep AI-generated meal if no Spoonacular match found
 * 
 * Search Strategy:
 * 1. Try primary keywords (e.g., ["chicken", "tikka", "masala"])
 * 2. If no results, retry with fallback keywords (e.g., ["chicken", "curry"])
 * 3. If still no results, keep original AI-generated meal without spoonacularId
 * 
 * Input State:
 * - meals: AI-generated meal suggestions with keywords
 * - recipeQuery: User preferences (dietary restrictions, etc.)
 * 
 * Output State:
 * - meals: Updated meals with spoonacularId (if found)
 * 
 * Next Node:
 * - Daily mode: recipeFetcher
 * - Weekly mode: humanReview
 */

import { RecipeAgentState, MealSchema } from "../agent/state";
import { searchMeals } from "../tools/searchMeals";
import { z } from "zod";

export const mealPickerNode = async (state: typeof RecipeAgentState.State) => {
    try {
        if (!state.meals || state.meals.length === 0) {
            throw new Error("No meals found in state");
        }

        if (!state.recipeQuery) {
            throw new Error("Recipe query is missing from state");
        }

        const updatedMeals: z.infer<typeof MealSchema>[] = [];
        
        // Process each meal sequentially (async iteration)
        for (const meal of state.meals) {
            const recipeQuery = state.recipeQuery;

            // Build search query from AI-generated keywords
            const query = meal.keywords.join(" ");
            const cuisine = meal.cuisine;
            const diet = recipeQuery.dietary;

            // Primary search with main keywords
            let searchResults = await searchMeals({
                query,
                cuisine,
                diet,
                number: 1
            });

            // Retry with fallback keywords if primary search fails
            if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
                const fallbackQuery = meal.fallbackKeywords.join(" ");

                searchResults = await searchMeals({
                    query: fallbackQuery,
                    cuisine,
                    diet,
                    number: 1
                });

                // If fallback also fails, keep AI-generated meal without spoonacularId
                if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
                    updatedMeals.push(meal);
                    continue;
                }
            }

            // Pick first result and update meal with Spoonacular ID
            const selectedMeal = searchResults.results[0];

            // Update meal with Spoonacular data
            // spoonacularId will be used by recipeFetcher to get full recipe details
            updatedMeals.push({
                ...meal,
                name: selectedMeal.title || meal.name,
                spoonacularId: selectedMeal.id
            });
        }

        return { meals: updatedMeals };

    } catch (error) {
        console.error("[MealPicker] Error:", error);
        throw error;
    }
};
