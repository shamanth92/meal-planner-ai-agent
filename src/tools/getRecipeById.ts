import { config } from "../config/env";
import { z } from "zod";

export const getRecipeById = async (id: number): Promise<any> => {
    console.log("Getting recipe by ID...", id);
    
    const response = await fetch(`https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/${id}/information`, {
        headers: {
            'x-rapidapi-key': config.spoonacularApiKey || '',
            'x-rapidapi-host': config.spoonacularApiHost || ''
        }
    });
       
    const data = await response.json();
    // console.log("Recipe data:", data);

    return data;
};