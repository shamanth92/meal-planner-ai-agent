/**
 * Grocery Formatter Node
 * 
 * Final node in the workflow. Generates meal-separated grocery lists.
 * Uses AI to format ingredients into clean, organized shopping lists.
 * 
 * Responsibilities:
 * - Process each recipe's ingredients
 * - Use AI to format into clean grocery list
 * - Keep lists separated by meal (not merged)
 * - Validate grocery list structure
 * 
 * Output Format:
 * [
 *   { mealName: "Chicken Tikka Masala", groceryList: ["2 lbs chicken", "1 cup yogurt", ...] },
 *   { mealName: "Pasta Carbonara", groceryList: ["1 lb pasta", "4 eggs", ...] },
 *   ...
 * ]
 * 
 * Why Meal-Separated?
 * - Easier to shop for specific days
 * - Can skip meals if needed
 * - Better organization for meal prep
 * 
 * Input State:
 * - recipes: Array of recipes with ingredients
 * 
 * Output State:
 * - groceryList: Array of meal-separated grocery lists
 * 
 * Next Node:
 * - END (final node in graph)
 */

import { RecipeAgentState, GroceryItemSchema } from "../agent/state";
import { model } from "../config/model";
import { GroceryPrompt } from "../prompts";
import { z } from "zod";

export const groceryFormatterNode = async (state: typeof RecipeAgentState.State) => {
    try {
        if (!state.recipes || state.recipes.length === 0) {
            throw new Error("No recipes found in state");
        }
        
        const GroceryListResponseSchema = z.object({
            groceryList: z.array(GroceryItemSchema)
        });
        
        const allGroceryItems: z.infer<typeof GroceryItemSchema>[] = [];
        
        // Process each recipe separately to keep lists meal-separated
        for (const recipe of state.recipes) {
            const recipeData = {
                mealName: recipe.mealName,
                ingredients: recipe.ingredients
            };
            
            // Use AI to format ingredients into clean grocery list
            const structuredGroceryList = model.withStructuredOutput(GroceryListResponseSchema);
            const response = await structuredGroceryList.invoke(GroceryPrompt(JSON.stringify(recipeData)));
            
            const validatedData = GroceryListResponseSchema.parse(response);
            
            if (!validatedData.groceryList || validatedData.groceryList.length === 0) {
                console.warn("[GroceryFormatter] No grocery items generated for", recipe.mealName);
                continue;
            }
            
            // Add grocery list for this meal
            allGroceryItems.push(validatedData.groceryList[0]);
        }
        
        if (allGroceryItems.length === 0) {
            throw new Error("No grocery items were generated");
        }
        
        return {
            groceryList: allGroceryItems
        };
        
    } catch (error) {
        console.error("[GroceryFormatter] Error:", error);
        
        if (error instanceof z.ZodError) {
            console.error("[GroceryFormatter] Validation error:", error.issues);
            throw new Error(`Grocery list validation failed: ${error.issues.map((e: z.ZodIssue) => e.message).join(", ")}`);
        }
        
        throw error;
    }
};
