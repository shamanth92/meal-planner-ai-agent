import { RecipeAgentState, RecipeSchema } from "../agent/state";
import { model } from "../config/model";
import { RecipePrompt, RecipeGenerationPrompt } from "../prompts";
import { getRecipeById } from "../tools/getRecipeById";
import { z } from "zod";

export const recipeFetcherNode = async (state: typeof RecipeAgentState.State) => {
    try {
        console.log("[RecipeFetcher] Starting recipe fetching...");
        
        if (!state.meals || state.meals.length === 0) {
            throw new Error("No meals found in state");
        }
        
        console.log("[RecipeFetcher] Processing", state.meals.length, "meals");
        
        const RecipeResponseSchema = z.object({
            recipes: z.array(RecipeSchema)
        });
        
        const allRecipes: z.infer<typeof RecipeSchema>[] = [];
        
        for (const meal of state.meals) {
            console.log("[RecipeFetcher] Processing meal:", meal.name);
            
            const spoonacularId = meal.spoonacularId;
            let validatedData;
            
            if (!spoonacularId) {
                console.warn("[RecipeFetcher] No Spoonacular ID found for", meal.name, "- generating recipe with AI...");
                
                const mealInfo = {
                    name: meal.name,
                    description: meal.description,
                    cuisine: meal.cuisine,
                    keywords: meal.keywords
                };
                
                console.log("[RecipeFetcher] Generating recipe for:", meal.name);
                const structuredRecipes = model.withStructuredOutput(RecipeResponseSchema);
                const response = await structuredRecipes.invoke(RecipeGenerationPrompt(JSON.stringify(mealInfo)));
                
                validatedData = RecipeResponseSchema.parse(response);
                console.log("[RecipeFetcher] Successfully generated recipe with AI");
                
            } else {
                console.log("[RecipeFetcher] Fetching recipe by ID:", spoonacularId);
                const recipe = await getRecipeById(spoonacularId);

                console.log("[RecipeFetcher] Invoking AI to extract recipe details...");
                const structuredRecipes = model.withStructuredOutput(RecipeResponseSchema);
                const response = await structuredRecipes.invoke(RecipePrompt(JSON.stringify(recipe)));

                validatedData = RecipeResponseSchema.parse(response);
                console.log("[RecipeFetcher] Successfully extracted recipe from Spoonacular");
            }
            
            if (!validatedData.recipes || validatedData.recipes.length === 0) {
                console.error("[RecipeFetcher] No recipe extracted for", meal.name);
                continue;
            }
            
            // Add the first recipe from the response
            allRecipes.push(validatedData.recipes[0]);
        }
        
        if (allRecipes.length === 0) {
            throw new Error("No recipes were extracted");
        }
        
        console.log("[RecipeFetcher] Successfully extracted", allRecipes.length, "recipes");
        
        return { recipes: allRecipes };
        
    } catch (error) {
        console.error("[RecipeFetcher] Error:", error);
        throw error;
    }
};
