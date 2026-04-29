/**
 * Get Recipe By ID Utility
 * 
 * Fetches detailed recipe information from Spoonacular API by recipe ID.
 * Used by recipeFetcherNode to get full recipe details after mealPickerNode
 * has identified a matching Spoonacular recipe.
 * 
 * Returns:
 * - Complete recipe data including:
 *   - Ingredients with quantities
 *   - Cooking instructions
 *   - Nutrition information
 *   - Cooking time and servings
 *   - And more metadata
 * 
 * API: Spoonacular recipe information endpoint
 * 
 * @param id - Spoonacular recipe ID
 * @returns Full recipe data from Spoonacular
 */

import { config } from "../config/env";
import { z } from "zod";

export const getRecipeById = async (id: number): Promise<any> => {
    const response = await fetch(`https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/${id}/information`, {
        headers: {
            'x-rapidapi-key': config.spoonacularApiKey || '',
            'x-rapidapi-host': config.spoonacularApiHost || ''
        }
    });
       
    const data = await response.json();

    return data;
};