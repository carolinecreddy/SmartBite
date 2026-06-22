export interface NutritionLabelAnalysis {
  productName: string;
  calories: string;
  protein: string;
  sugar: string;
  sodium: string;
  saturatedFat: string;
  fiber: string;
  simpleExplanation: string;
  assessments: string[];
  practicalSuggestion: string;
}

export interface Meal {
  name: string;
  ingredientsUsed: string[];
  extraIngredientsAdded?: string[];
  directions: string[];
  difficulty: "Easy" | "Medium" | "Hard" | string;
  tags: string[];
  combinedAdvice?: string;
}

export interface MealResponse {
  meals: Meal[];
  isFallbackMeals?: boolean;
  fallbackMessage?: string;
}

export type ActiveScreen = "home" | "scan-fridge" | "scan-label" | "fridge-results" | "label-results" | "meal-ideas";
