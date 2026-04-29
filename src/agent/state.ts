/**
 * State Schema Definitions for Recipe Planning Agent
 * 
 * This file defines all Zod schemas used throughout the recipe planning workflow.
 * These schemas ensure type safety and validation across the LangGraph state machine.
 */

import { StateSchema } from "@langchain/langgraph";
import * as z from "zod";

export const RecipeQuerySchema = z.object({
    mode: z.enum(["daily", "weekly"]),
    cuisines: z.array(z.string()),
    goal: z.enum(["balanced", "weight_loss", "muscle_gain", "high_protein"]),
    dietary: z.enum(["vegetarian", "vegan", "non-veg"]),
    budget: z.number().optional(),
    mealTime: z.enum(["breakfast", "lunch", "dinner"]).optional(),
});

export const MealSchema = z.object({
    day: z.number().optional(),
    name: z.string(),
    description: z.string(),
    cuisine: z.string(),
    keywords: z.array(z.string()),
    fallbackKeywords: z.array(z.string()),
    spoonacularId: z.number().optional(),
});

export const RecipeStepSchema = z.object({
    stepNumber: z.number(),
    instruction: z.string(),
});

export const NutritionSchema = z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    sugar: z.number(),
    fat: z.number().optional(),
});

export const RecipeSchema = z.object({
    mealName: z.string(),
    ingredients: z.array(z.string()),
    steps: z.array(RecipeStepSchema),
    cookingTime: z.number(),
    servings: z.number(),
    nutrition: NutritionSchema,
});

export const DailyNutritionSchema = z.object({
    day: z.number(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
});

export const WeeklyNutritionTotalsSchema = z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
});

export const NutritionAnalysisSchema = z.object({
    summary: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    recommendations: z.array(z.string()),
});

export const WeeklyNutritionSchema = z.object({
    totals: WeeklyNutritionTotalsSchema.optional(),
    daily: z.array(DailyNutritionSchema),
    analysis: NutritionAnalysisSchema.optional(),
});

export const GroceryItemSchema = z.object({
    mealName: z.string(),
    groceryList: z.array(z.string()),
});

/**
 * RecipeAgentState
 * 
 * Main state schema for the LangGraph recipe planning workflow.
 * This state is passed between nodes and persisted by the checkpointer.
 * 
 * State Flow:
 * 1. recipeQuery: User input (always present)
 * 2. meals: Generated meal suggestions (after mealSuggesterNode)
 * 3. recipes: Detailed recipes (after recipeFetcherNode)
 * 4. weeklyNutrition: Nutrition analysis (after nutritionBalancerNode, weekly only)
 * 5. groceryList: Shopping list (after groceryFormatterNode)
 * 
 * Human-in-the-Loop Fields (weekly mode):
 * - userFeedback: User's feedback for meal plan regeneration
 * - needsRegeneration: Flag to trigger regeneration loop
 * 
 * @property recipeQuery - User's meal planning request (required)
 * @property meals - AI-generated meal suggestions (optional)
 * @property recipes - Complete recipes with instructions (optional)
 * @property groceryList - Meal-separated grocery lists (optional)
 * @property weeklyNutrition - Weekly nutrition data and analysis (optional)
 * @property userFeedback - User feedback for regeneration (optional)
 * @property needsRegeneration - Regeneration flag for human review (optional)
 */
export const RecipeAgentState = new StateSchema({
    recipeQuery: RecipeQuerySchema,
    meals: z.array(MealSchema).optional(),
    recipes: z.array(RecipeSchema).optional(),
    groceryList: z.array(GroceryItemSchema).optional(),
    weeklyNutrition: WeeklyNutritionSchema.optional(),
    userFeedback: z.string().optional(),
    needsRegeneration: z.boolean().optional(),
});
