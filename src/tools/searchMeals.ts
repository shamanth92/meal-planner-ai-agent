import { config } from "../config/env";

interface SearchMealsParams {
    query: string;
    cuisine: string;
    diet: string;
    number?: number;
}

export const searchMeals = async (params: SearchMealsParams): Promise<any> => {
    const { query, cuisine, diet, number = 3 } = params;
    
    console.log("[SearchMeals] Searching with params:", params);
    
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
    console.log("[SearchMeals] Found results:", data.results?.length || 0);
    
    return data;
};