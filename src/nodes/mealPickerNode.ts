import { RecipeAgentState, MealSchema } from "../agent/state";
import { searchMeals } from "../tools/searchMeals";
import { z } from "zod";

export const mealPickerNode = async (state: typeof RecipeAgentState.State) => {
    try {
        console.log("[MealPicker] Starting meal picking from Spoonacular...");

        if (!state.meals || state.meals.length === 0) {
            throw new Error("No meals found in state");
        }

        if (!state.recipeQuery) {
            throw new Error("Recipe query is missing from state");
        }

        const updatedMeals: z.infer<typeof MealSchema>[] = [];
        
        for (const meal of state.meals) {
            console.log("[MealPicker] Processing meal:", meal.name);
            const recipeQuery = state.recipeQuery;

            // Build query from keywords
            const query = meal.keywords.join(" ");
            const cuisine = meal.cuisine;
            const diet = recipeQuery.dietary;

            console.log("[MealPicker] Searching Spoonacular with:");
            console.log("  Query:", query);
            console.log("  Cuisine:", cuisine);
            console.log("  Diet:", diet);

            // Search for meals using keywords
            let searchResults = await searchMeals({
                query,
                cuisine,
                diet,
                number: 1
            });

            // Retry with fallback keywords if no results
            if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
                console.warn("[MealPicker] No results found with full keywords, retrying with fallback keywords...");

                const fallbackQuery = meal.fallbackKeywords.join(" ");
                console.log("[MealPicker] Fallback query:", fallbackQuery);

                searchResults = await searchMeals({
                    query: fallbackQuery,
                    cuisine,
                    diet,
                    number: 1
                });

                if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
                    console.warn("[MealPicker] No results found even with fallback keywords, keeping AI-generated meal");
                    updatedMeals.push(meal);
                    continue;
                }

                console.log("[MealPicker] Found results with fallback keywords!");
            }

            // Pick the first result and update the meal with spoonacularId
            const selectedMeal = searchResults.results[0];

            console.log("[MealPicker] Selected meal from Spoonacular:", selectedMeal.title);

            // Update the meal with Spoonacular data
            updatedMeals.push({
                ...meal,
                name: selectedMeal.title || meal.name,
                spoonacularId: selectedMeal.id
            });
        }

        console.log("[MealPicker] Updated", updatedMeals.length, "meals with Spoonacular data");

        return { meals: updatedMeals };

    } catch (error) {
        console.error("[MealPicker] Error:", error);
        throw error;
    }
};
