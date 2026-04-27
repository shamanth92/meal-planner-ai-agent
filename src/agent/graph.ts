import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { RecipeAgentState } from "./state";
import { mealSuggesterNode, recipeFetcherNode, groceryFormatterNode, nutritionBalancerNode, varietyEnforcerNode, mealPickerNode } from "../nodes";

const routeAfterMealSuggester = (state: typeof RecipeAgentState.State) => {
    return state.recipeQuery.mode === "daily" ? "recipeFetcher" : "varietyEnforcer";
};

const routeAfterRecipeFetcher = (state: typeof RecipeAgentState.State) => {
    return state.recipeQuery.mode === "daily" ? "groceryFormatter" : "nutritionBalancer";
};

export const graph = new StateGraph(RecipeAgentState)
    .addNode("mealSuggester", mealSuggesterNode)
    .addNode("mealPicker", mealPickerNode)
    .addNode("recipeFetcher", recipeFetcherNode)
    .addNode("groceryFormatter", groceryFormatterNode)
    .addNode("nutritionBalancer", nutritionBalancerNode)
    .addNode("varietyEnforcer", varietyEnforcerNode)
    .addEdge(START, "mealSuggester")
    .addEdge("mealSuggester", "mealPicker")
    .addConditionalEdges("mealPicker", routeAfterMealSuggester, {
        recipeFetcher: "recipeFetcher",
        varietyEnforcer: "varietyEnforcer",
    })
    .addEdge("varietyEnforcer", "recipeFetcher")
    .addConditionalEdges("recipeFetcher", routeAfterRecipeFetcher, {
        groceryFormatter: "groceryFormatter",
        nutritionBalancer: "nutritionBalancer",
    })
    .addEdge("nutritionBalancer", "groceryFormatter")
    .addEdge("groceryFormatter", END)
    .compile();
    
