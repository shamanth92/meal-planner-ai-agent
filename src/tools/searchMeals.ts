/**
 * Search Meals Utility
 * 
 * Searches Spoonacular API for recipes matching given criteria.
 * Used by mealPickerNode to find recipes matching AI-generated meal suggestions.
 * 
 * Features:
 * - Complex search with multiple filters (query, cuisine, diet)
 * - Random offset for variety in results
 * - Requires recipes to have instructions
 * - Sorts by ingredient usage
 * 
 * API: Spoonacular complexSearch endpoint
 * 
 * @param params.query - Search keywords (e.g., "chicken tikka masala")
 * @param params.cuisine - Cuisine type (e.g., "Indian", "Mexican")
 * @param params.diet - Dietary restriction (vegetarian/vegan/non-veg)
 * @param params.number - Number of results to return (default: 3)
 * 
 * @returns Spoonacular search response with results array
 */

import { config } from "../config/env";

interface SearchMealsParams {
    query: string;
    cuisine: string;
    diet: string;
    number?: number;
}

export const searchMeals = async (params: SearchMealsParams): Promise<any> => {
    const { query, cuisine, diet, number = 3 } = params;
    
    // Random offset for variety in results (0-19)
    const randomOffset = Math.floor(Math.random() * 20);
    
    const response = await fetch(
        `https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/complexSearch?query=${encodeURIComponent(query)}&diet=${diet}&cuisine=${cuisine}&ignorePantry=true&sort=max-used-ingredients&offset=${randomOffset}&number=${number}&instructionsRequired=true`,
        {
            headers: {
                'x-rapidapi-key': config.spoonacularApiKey || '',
                'x-rapidapi-host': config.spoonacularApiHost || ''
            }
        }
    );
    
    const data = await response.json();
    
    return data;
};