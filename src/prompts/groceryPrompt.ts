export const GroceryPrompt = (ingredients: string) => `You are a grocery list generator agent. 
You take in the ingredients required from the recipe details and decide the items to be purchased.

Ingredients Information: ${ingredients}

The Grocery List Output should be in the below JSON format:

[{
    mealName: string,
    groceryList: string[]
}]

Example Output:
[{
    mealName: "Chicken Curry",
    groceryList: [
        "chicken",
        "curry powder",
        "salt",
        "pepper"
    ]
}]
`
