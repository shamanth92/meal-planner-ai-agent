import { RecipeAgentState, GroceryItemSchema } from "../agent/state";
import { model } from "../config/model";
import { GroceryPrompt } from "../prompts";
import { z } from "zod";

export const groceryFormatterNode = async (state: typeof RecipeAgentState.State) => {
    try {
        console.log("[GroceryFormatter] Starting grocery list generation...");
        
        if (!state.recipes || state.recipes.length === 0) {
            throw new Error("No recipes found in state");
        }
        
        console.log("[GroceryFormatter] Processing", state.recipes.length, "recipes");
        
        const GroceryListResponseSchema = z.object({
            groceryList: z.array(GroceryItemSchema)
        });
        
        const allGroceryItems: z.infer<typeof GroceryItemSchema>[] = [];
        
        for (const recipe of state.recipes) {
            console.log("[GroceryFormatter] Processing recipe:", recipe.mealName);
            
            const recipeData = {
                mealName: recipe.mealName,
                ingredients: recipe.ingredients
            };
            
            const structuredGroceryList = model.withStructuredOutput(GroceryListResponseSchema);
            const response = await structuredGroceryList.invoke(GroceryPrompt(JSON.stringify(recipeData)));
            
            const validatedData = GroceryListResponseSchema.parse(response);
            
            if (!validatedData.groceryList || validatedData.groceryList.length === 0) {
                console.warn("[GroceryFormatter] No grocery items generated for", recipe.mealName);
                continue;
            }
            
            // Add the first grocery item from the response
            allGroceryItems.push(validatedData.groceryList[0]);
            console.log("[GroceryFormatter] Grocery items for", recipe.mealName, ":", validatedData.groceryList[0].groceryList);
        }
        
        if (allGroceryItems.length === 0) {
            throw new Error("No grocery items were generated");
        }

        console.log("[GroceryFormatter] Generated", allGroceryItems.length, "meal-separated grocery lists");
        console.log("[GroceryFormatter] All grocery items:", JSON.stringify(allGroceryItems, null, 2));
        
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
