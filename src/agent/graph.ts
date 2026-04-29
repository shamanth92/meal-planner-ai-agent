/**
 * LangGraph State Machine for Recipe Planning Agent
 * 
 * This file defines the workflow graph with conditional routing based on:
 * - Planning mode (daily vs weekly)
 * - User feedback (human-in-the-loop for weekly mode)
 * 
 * Graph Flow:
 * 
 * Daily Mode:
 *   START → mealSuggester → mealPicker → recipeFetcher → groceryFormatter → END
 * 
 * Weekly Mode (user approves):
 *   START → mealSuggester → mealPicker → humanReview → recipeFetcher → 
 *   nutritionBalancer → groceryFormatter → END
 * 
 * Weekly Mode (user regenerates):
 *   START → mealSuggester → mealPicker → humanReview → mealSuggester → ... (loop)
 */

import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { RecipeAgentState } from "./state";
import { mealSuggesterNode, recipeFetcherNode, groceryFormatterNode, nutritionBalancerNode, varietyEnforcerNode, mealPickerNode, humanReviewNode } from "../nodes";

/**
 * Route after mealPicker based on planning mode
 * 
 * Daily mode: Skip human review, go directly to recipe fetching
 * Weekly mode: Route to human review for approval/feedback
 * 
 * @param state - Current graph state
 * @returns Next node name
 */
const routeAfterMealPicker = (state: typeof RecipeAgentState.State) => {
    return state.recipeQuery.mode === "daily" ? "recipeFetcher" : "humanReview";
};

/**
 * Route after humanReview based on user decision
 * 
 * If user wants regeneration: Loop back to mealSuggester with feedback
 * If user approves: Proceed to recipe fetching
 * 
 * This creates the human-in-the-loop regeneration cycle.
 * 
 * @param state - Current graph state
 * @returns Next node name
 */
const routeAfterHumanReview = (state: typeof RecipeAgentState.State) => {
    return state.needsRegeneration ? "mealSuggester" : "recipeFetcher";
};

/**
 * Route after recipeFetcher based on planning mode
 * 
 * Daily mode: Skip nutrition analysis, go directly to grocery list
 * Weekly mode: Analyze weekly nutrition before grocery list
 * 
 * @param state - Current graph state
 * @returns Next node name
 */
const routeAfterRecipeFetcher = (state: typeof RecipeAgentState.State) => {
    return state.recipeQuery.mode === "daily" ? "groceryFormatter" : "nutritionBalancer";
};

/**
 * Checkpointer for state persistence
 * 
 * MemorySaver stores state in memory (lost on restart).
 * For production, replace with RedisSaver for persistence across restarts
 * and multi-server deployments.
 */
const checkpointer = new MemorySaver();

/**
 * Recipe Planning Graph
 * 
 * Nodes:
 * - mealSuggester: Generate meal suggestions using AI
 * - mealPicker: Search Spoonacular for matching recipes
 * - humanReview: Display meals for user approval (weekly only)
 * - recipeFetcher: Fetch detailed recipes from Spoonacular or generate with AI
 * - nutritionBalancer: Analyze weekly nutrition (weekly only)
 * - groceryFormatter: Generate meal-separated grocery lists
 * 
 * Edges:
 * - Fixed edges: Always follow the same path
 * - Conditional edges: Route based on state (mode, needsRegeneration)
 * 
 * Checkpointer:
 * - Saves state after each node execution
 * - Enables interrupt/resume for human-in-the-loop
 * - Requires thread_id in config to persist/retrieve state
 */
export const graph = new StateGraph(RecipeAgentState)
    .addNode("mealSuggester", mealSuggesterNode)
    .addNode("mealPicker", mealPickerNode)
    .addNode("humanReview", humanReviewNode)
    .addNode("recipeFetcher", recipeFetcherNode)
    .addNode("groceryFormatter", groceryFormatterNode)
    .addNode("nutritionBalancer", nutritionBalancerNode)
    .addEdge(START, "mealSuggester")
    .addEdge("mealSuggester", "mealPicker")
    .addConditionalEdges("mealPicker", routeAfterMealPicker, {
        recipeFetcher: "recipeFetcher",
        humanReview: "humanReview",
    })
    .addConditionalEdges("humanReview", routeAfterHumanReview, {
        mealSuggester: "mealSuggester",
        recipeFetcher: "recipeFetcher",
    })
    .addConditionalEdges("recipeFetcher", routeAfterRecipeFetcher, {
        groceryFormatter: "groceryFormatter",
        nutritionBalancer: "nutritionBalancer",
    })
    .addEdge("nutritionBalancer", "groceryFormatter")
    .addEdge("groceryFormatter", END)
    .compile({ checkpointer });
    
