import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { RecipeAgentState } from "./state";
import { mealSuggesterNode, recipeFetcherNode, groceryFormatterNode, nutritionBalancerNode, varietyEnforcerNode, mealPickerNode, humanReviewNode } from "../nodes";

const routeAfterMealPicker = (state: typeof RecipeAgentState.State) => {
    return state.recipeQuery.mode === "daily" ? "recipeFetcher" : "humanReview";
};

const routeAfterHumanReview = (state: typeof RecipeAgentState.State) => {
    return state.needsRegeneration ? "mealSuggester" : "recipeFetcher";
};

const routeAfterRecipeFetcher = (state: typeof RecipeAgentState.State) => {
    return state.recipeQuery.mode === "daily" ? "groceryFormatter" : "nutritionBalancer";
};

const checkpointer = new MemorySaver();

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
    
