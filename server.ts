import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

// Ensure Gemini API key is present
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. AI features will fail.");
}

// Initialize Gemini Client as described in the system skills
const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set body parser to accept large base64 camera image uploads
  app.use(express.json({ limit: "15mb" }));

  // API Route: Analyze Fridge or Pantry Image
  app.post("/api/analyze-fridge", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Strip potential Data URI scheme prefix
      const base64Data = image.includes(",") ? image.split(",")[1] : image;
      const detectedMimeType = mimeType || "image/jpeg";

      console.log(`Analyzing fridge image... (MimeType: ${detectedMimeType})`);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: detectedMimeType,
            },
          },
          {
            text: "List and identify all the visible ingredients, foods, condiments, veggies, meats, carbohydrates, and proteins in this fridge, pantry, or cooking workspace. Only return food items that are edible and cooking ingredients. Be practical.",
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ingredients: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of identified food and ingredient names. Keep them short, usually 1-3 words per ingredient (e.g., 'Spinach', 'Chicken Breast', 'Pasta Sauce')."
              }
            },
            required: ["ingredients"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response content from Gemini.");
      }

      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/analyze-fridge:", error);
      res.status(500).json({ error: error.message || "Failed to analyze fridge image" });
    }
  });

  // API Route: Scan and Explain Nutrition Label
  app.post("/api/explain-label", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Strip potential Data URI scheme prefix
      const base64Data = image.includes(",") ? image.split(",")[1] : image;
      const detectedMimeType = mimeType || "image/jpeg";

      console.log(`Analyzing nutrition label image... (MimeType: ${detectedMimeType})`);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: detectedMimeType,
            },
          },
          {
            text: "Analyze this nutrition facts label or list of ingredients. Read, extract, summarize the facts and explain them in simple, friendly, easy-to-understand language.",
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: {
                type: Type.STRING,
                description: "Name of the product or brand (e.g., 'Tomato Sauce', 'Greek Yogurt', 'Spaghetti'). If unclear, list a descriptive guess."
              },
              calories: {
                type: Type.STRING,
                description: "Calories per serving or container, if visible (e.g., '140 kcal per serving' or 'Not visible')."
              },
              protein: {
                type: Type.STRING,
                description: "Protein amount, e.g. '8g' or '0g' or 'Not visible'."
              },
              sugar: {
                type: Type.STRING,
                description: "Sugar content, specify if high or if added sugars are listed (e.g., '15g (includes 12g added sugars)')."
              },
              sodium: {
                type: Type.STRING,
                description: "Sodium content (e.g., '340mg (15% DV)')."
              },
              saturatedFat: {
                type: Type.STRING,
                description: "Saturated fat content (e.g., '1g (5% DV)')."
              },
              fiber: {
                type: Type.STRING,
                description: "Dietary fiber content (e.g., '3g' or '0g')."
              },
              simpleExplanation: {
                type: Type.STRING,
                description: "Explain the nutritional quality in simple, plain English (as if explaining to a friend). Max 3-4 sentences."
              },
              assessments: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Qualities of the food based on the label, choosing relevant items from: 'Balanced', 'High Protein', 'High Sugar', 'High Sodium', 'Highly Processed', 'Generally Healthy', 'Low Sodium', 'Low Sugar'."
              },
              practicalSuggestion: {
                type: Type.STRING,
                description: "One highly actionable, practical suggestion on how the user can balance or combine this food item inside a wholesome recipe. Keep it positive."
              }
            },
            required: [
              "productName",
              "calories",
              "protein",
              "sugar",
              "sodium",
              "saturatedFat",
              "fiber",
              "simpleExplanation",
              "assessments",
              "practicalSuggestion"
            ]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response content from Gemini.");
      }

      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/explain-label:", error);
      res.status(500).json({ error: error.message || "Failed to analyze nutrition label" });
    }
  });

  // API Route: Generate Meal Ideas from Ingredients + Optional Label Context
  app.post("/api/generate-meals", async (req, res) => {
    try {
      const { ingredients, nutritionLabelContext } = req.body;
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: "At least one ingredient is required" });
      }

      console.log(`Generating meal ideas with ingredients: ${ingredients.join(", ")}`);
      if (nutritionLabelContext) {
        console.log(`Integrating scanned nutrition label context: "${nutritionLabelContext.productName}"`);
      }

      let prompt = `You are a culinary AI designed to suggest realistic, delightful, home-cooked meals.
Based on this available list of pantry or fridge ingredients: ${ingredients.join(", ")}.

Suggest 3 distinct, realistic meal ideas.`;

      if (nutritionLabelContext) {
        prompt += `

We have also scanned a nutrition label for a food product/ingredient: "${nutritionLabelContext.productName}".
Nutritional status of scanned product:
- Calories: ${nutritionLabelContext.calories}
- Protein: ${nutritionLabelContext.protein}
- Sugar: ${nutritionLabelContext.sugar}
- Sodium: ${nutritionLabelContext.sodium}
- Assessments: ${nutritionLabelContext.assessments?.join(", ") || "None"}
- Details: ${nutritionLabelContext.simpleExplanation}

Provide positive culinary recommendations. Since the scanned item "${nutritionLabelContext.productName}" has these nutritional qualities, you MUST determine how to intelligently combine it with the fridge ingredients to produce stable, balanced dishes.
Specifically fill out the "combinedAdvice" string field for each recommended recipe to guide the user on portion control or adding/adjusting ingredients (e.g., 'Since the scanned Marinara Sauce is high in sodium, we recommend using only half of the jar and adding plenty of fresh spinach and chicken to balance the salt content. Do not add extra table salt during cooking.').`;
      } else {
        prompt += `
Since no separate nutrition label was scanned, you do not need to provide combinedAdvice. You can leave custom advice empty or general.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              meals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Creative name of the recipe (e.g., 'Lemon Garlic Herb Chicken Pasta')"
                    },
                    ingredientsUsed: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of ingredients from the pantry list + optional label item used in this recipe"
                    },
                    directions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Clear, simple, step-by-step cooking instructions (3 to 6 steps maximum per meal)."
                    },
                    difficulty: {
                      type: Type.STRING,
                      description: "Must be 'Easy', 'Medium', or 'Hard'"
                    },
                    tags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Tags summarizing the food benefits. Choose among: 'High Protein', 'Balanced', 'Low Effort', 'Budget-Friendly'."
                    },
                    combinedAdvice: {
                      type: Type.STRING,
                      description: "Specialized combined context advice. If nutritionLabelContext was included, explain how to combine the label product with fridge items to optimize nutrition or mitigate issues (like high sodium or sugar). If no label was scanned, this can be empty or general food advice."
                    }
                  },
                  required: ["name", "ingredientsUsed", "directions", "difficulty", "tags"]
                }
              }
            },
            required: ["meals"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response content from Gemini.");
      }

      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/generate-meals:", error);
      res.status(500).json({ error: error.message || "Failed to generate meals" });
    }
  });

  // Client-Side App Setup / Vite server handling
  if (process.env.NODE_ENV !== "production") {
    // Mounting Vite middleware to handle React client hot compilations and static server in developmental stages
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started, listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server launch error:", err);
});
