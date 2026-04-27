# Meal Planner Multi-Agent - Architecture

## State Schema

```typescript
interface MealPlanState {
  mode: "daily" | "weekly";
  cuisines: string[];
  goal: "balanced" | "weight_loss" | "muscle_gain" | "high_protein";
  dietary: "vegetarian" | "vegan" | "non-veg";
  budget?: number;
  mealTime?: "breakfast" | "lunch" | "dinner";
  
  meals?: {
    name: string;
    description: string;
    day?: number;
    cuisine: string;
    spoonacularId?: number;
  }[];
  
  recipes?: {
    mealName: string;
    ingredients: string[];
    steps: { stepNumber: number; instruction: string }[];
    cookingTime: number;
    servings: number;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      sugar: number;
      fat?: number;
    };
  }[];
  
  groceryList?: string[];
  
  weeklyNutrition?: {
    totals?: {
      calories: number;
      protein: number;
      carbs: number;
    };
    daily: {
      day: number;
      calories: number;
      protein: number;
      carbs: number;
    }[];
  };
}
```

## Agents

### Daily (3 agents)
1. Meal Suggester - Auto-selects 1 meal
2. Recipe Fetcher - Gets recipe details
3. Grocery Formatter - Creates shopping list

### Weekly (5 agents)
1. Meal Suggester - Suggests 7 meals
2. Variety Enforcer - Checks variety, swaps if needed
3. Recipe Fetcher - Gets 7 recipes
4. Nutrition Balancer - Calculates weekly nutrition
5. Grocery Formatter - Consolidates ingredients

## Execution Flows

### Daily

START → Meal Suggester → Recipe Fetcher → Grocery Formatter → END

### Weekly

START → Meal Suggester → Variety Enforcer → Recipe Fetcher → Nutrition Balancer → Grocery Formatter → END

## Design Decisions
- Two separate graphs (daily/weekly)
- No caching
- Fail gracefully (no retries)
- Config file input
- JSON output
- No looping (linear execution)