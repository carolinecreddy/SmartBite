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

function parseFlexibleJson(text: string): any {
  let cleaned = text.trim();
  // Strip code blocks if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch (nestedErr) {
        // Fall through
      }
    }
    throw err;
  }
}

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
            text: "List and identify all the visible ingredients, foods, condiments, veggies, meats, carbohydrates, and proteins in this fridge, pantry, or cooking workspace. Only return food items that are edible and cooking ingredients. Be practical. Return ONLY a valid JSON object matching the requested schema. Do not output any markdown formatting, markdown code blocks (such as ```json), or explanatory text.",
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

      const result = parseFlexibleJson(responseText);
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/analyze-fridge:", error);
      const errMessage = String(error?.message || error || "");
      const errStatus = error?.status;
      if (
        errStatus === 503 ||
        errStatus === 429 ||
        errMessage.includes("503") ||
        errMessage.includes("UNAVAILABLE") ||
        errMessage.includes("high demand") ||
        errMessage.includes("rate limit") ||
        errMessage.includes("RESOURCE_EXHAUSTED") ||
        errMessage.includes("overloaded") ||
        errMessage.includes("temporary") ||
        errMessage.includes("quota")
      ) {
        res.status(503).json({ error: "UNAVAILABLE: " + errMessage });
      } else {
        res.status(500).json({ error: errMessage });
      }
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
             text: "Please analyze this nutrition facts label, product container, or list of ingredients. Be extremely flexible and helper-oriented:\n1. If the image looks like an ingredient list instead of a formal Nutrition Facts panel, treat that ingredient list as the primary label source. Identify what it is, extract and explain it under simpleExplanation, and give useful advice.\n2. If some or most of the values are missing, do NOT fail. Estimate or read what you CAN. For any values that are completely not present in the image (like calories, protein, sugar, sodium, saturated fat, or fiber), write exactly \"Not clearly visible\" instead of leaving them empty or throwing an error.\n3. If the label is blurry, still try your best to estimate the values or give a general explanation based on any visible words/numbers.\n4. Only if almost nothing useful can be read at all (e.g., completely black, solid color, totally blurry, or completely unrelated image with zero readable text or food references), write exactly 'Could not read scan results clearly' for the 'productName' and 'simpleExplanation' fields.\n\nReturn ONLY a valid JSON object matching the requested schema. Do not output any markdown formatting, markdown code blocks, or explanatory text.",
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: {
                type: Type.STRING,
                description: "Name of the product or brand (e.g., 'Tomato Sauce', 'Greek Yogurt', 'Spaghetti'). If unclear or scanning an ingredient list/blurry logo, list a descriptive guess."
              },
              calories: {
                type: Type.STRING,
                description: "Calories per serving or container, if visible (e.g., '140 kcal per serving' or 'Not clearly visible')."
              },
              protein: {
                type: Type.STRING,
                description: "Protein amount, e.g. '8g' or '0g' or 'Not clearly visible'."
              },
              sugar: {
                type: Type.STRING,
                description: "Sugar content, specify if high or if added sugars are listed (e.g., '15g (includes 12g added sugars)' or 'Not clearly visible')."
              },
              sodium: {
                type: Type.STRING,
                description: "Sodium content (e.g., '340mg (15% DV)' or 'Not clearly visible')."
              },
              saturatedFat: {
                type: Type.STRING,
                description: "Saturated fat content (e.g., '1g (5% DV)' or 'Not clearly visible')."
              },
              fiber: {
                type: Type.STRING,
                description: "Dietary fiber content (e.g., '3g' or 'Not clearly visible')."
              },
              simpleExplanation: {
                type: Type.STRING,
                description: "Explain the nutritional quality or ingredient list in simple, friendly, plain English (as if explaining to a classmate). Max 3-4 sentences. Avoid medical terms or dry percentages. Focus on making it sound simple and helpful."
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

      const result = parseFlexibleJson(responseText);
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/explain-label:", error);
      const errMessage = String(error?.message || error || "");
      const errStatus = error?.status;
      if (
        errStatus === 503 ||
        errStatus === 429 ||
        errMessage.includes("503") ||
        errMessage.includes("UNAVAILABLE") ||
        errMessage.includes("high demand") ||
        errMessage.includes("rate limit") ||
        errMessage.includes("RESOURCE_EXHAUSTED") ||
        errMessage.includes("overloaded") ||
        errMessage.includes("temporary") ||
        errMessage.includes("quota")
      ) {
        res.status(503).json({ error: "UNAVAILABLE: " + errMessage });
      } else {
        res.status(500).json({ error: errMessage });
      }
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

      let prompt = `You are a helper-oriented beginner-friendly culinary assistant designed to suggest simple, realistic, classmate-friendly home-cooked meals or snack-style options.
Available list of fridge, pantry, or ingredients: ${ingredients.join(", ")}.

Suggest 3 simple, realistic meal ideas. You MUST follow these guidelines to maximize flexibility and reliability:
1. Generate meal ideas from any reasonable ingredient list, even if it is very limited or only has 2-4 items. Do NOT require specific main ingredients like chicken, beef, rice, pasta, or eggs before suggesting recipes.
2. If available ingredients are limited, focus on recommending quick snacks, light meals, micro-plates, or simple combinations.
3. Allow common pantry basics (such as salt, pepper, cooking oil, butter, water, rice, pasta, bread, eggs, or seasonings/spices) to be assumed when needed, even if they aren't explicitly listed by the user.
4. If there are not enough ingredients for full meals, suggest what 1-2 extra simple ingredients would make the meal work, and list those clearly in your directions or suggestions.
5. Always generate 3 ideas. If 3 full recipes is not possible or realistic, suggest simpler food pairings, snacks, or beverage combos so you always return exactly 3 matching items. Keep cooking instructions beginner-friendly and short (3 to 6 steps maximum per meal).`;

      if (nutritionLabelContext) {
        prompt += `

We have also scanned a nutrition Facts label or ingredient list for a food product/ingredient: "${nutritionLabelContext.productName}".
Nutritional status of scanned product:
- Calories: ${nutritionLabelContext.calories}
- Protein: ${nutritionLabelContext.protein}
- Sugar: ${nutritionLabelContext.sugar}
- Sodium: ${nutritionLabelContext.sodium}
- Assessments: ${nutritionLabelContext.assessments?.join(", ") || "None"}
- Details: ${nutritionLabelContext.simpleExplanation}

Provide positive cooking recommendations. Since the scanned item "${nutritionLabelContext.productName}" has these nutritional qualities, you MUST determine how to intelligently combine it with the ingredients to produce balanced meal ideas.
Avoid medical-sounding phrases like "daily sodium limits". Instead, focus on helpful nutrition tips, saying things like: "If this item is high in sodium, use a smaller amount or balance it with vegetables, plain protein, rice, or pasta."
Specifically fill out the "combinedAdvice" string field for each recommended meal to guide the user on using smaller portions or balancing/adjusting ingredients (e.g., 'Since the scanned marinara sauce is high in salt/sodium, you can use a smaller amount, or balance it out by adding fresh spinach, rice, pasta, or plain protein. Avoid adding extra salt during cooking.').`;
      } else {
        prompt += `
Since no separate nutrition label was scanned, you do not need to provide combinedAdvice. You can leave custom advice empty or general.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt + "\n\nReturn ONLY a valid JSON object matching the requested schema. Do not output any markdown formatting, markdown code blocks (such as ```json), or explanatory text.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isFallbackMeals: {
                type: Type.BOOLEAN,
                description: "Set to true if no complete meals could be made using ONLY the user's list of ingredients, meaning you had to suggest recipes requiring 1-3 extra common additions."
              },
              fallbackMessage: {
                type: Type.STRING,
                description: "If isFallbackMeals is true, this MUST be exactly: 'No complete meals were found using only these ingredients, but here are options that use your ingredients plus a few common additions.' Otherwise, keep it empty or null."
              },
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
                    extraIngredientsAdded: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Specify 1-3 additional common kitchen ingredients needed to complete this recipe, or empty list if none."
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

      const result = parseFlexibleJson(responseText);
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/generate-meals:", error);
      const errMessage = String(error?.message || error || "");
      const errStatus = error?.status;
      if (
        errStatus === 503 ||
        errStatus === 429 ||
        errMessage.includes("503") ||
        errMessage.includes("UNAVAILABLE") ||
        errMessage.includes("high demand") ||
        errMessage.includes("rate limit") ||
        errMessage.includes("RESOURCE_EXHAUSTED") ||
        errMessage.includes("overloaded") ||
        errMessage.includes("temporary") ||
        errMessage.includes("quota")
      ) {
        res.status(503).json({ error: "UNAVAILABLE: " + errMessage });
      } else {
        res.status(500).json({ error: errMessage });
      }
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
