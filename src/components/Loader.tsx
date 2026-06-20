import React, { useEffect, useState } from "react";
import { Sparkles, ChefHat } from "lucide-react";

interface LoaderProps {
  type: "ingredients" | "label" | "meals";
}

const ingredientPhrases = [
  "Opening the camera lens...",
  "Powering up SmartBite AI...",
  "Analyzing visible food shapes...",
  "Detecting ingredients and proteins...",
  "Sifting out condiments and veggies...",
  "Finalizing ingredient list...",
];

const labelPhrases = [
  "Reading nutrition details...",
  "Decompressing microscopic numbers...",
  "Extracting protein, sodium, and sugars...",
  "Translating facts into plain language...",
  "Formulating active dietary suggestions...",
  "Almost ready...",
];

const mealPhrases = [
  "Combing through pantry matches...",
  "Consulting the AI Master Chef handbook...",
  "Balancing carbohydrates, proteins, and sodium...",
  "Drafting simple back-of-the-napkin steps...",
  "Testing difficulty ratings...",
  "Polishing final recipe cards...",
];

export default function Loader({ type }: LoaderProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const phrases =
    type === "ingredients"
      ? ingredientPhrases
      : type === "label"
      ? labelPhrases
      : mealPhrases;

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [phrases.length]);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-pulse" id="loader-overlay">
      <div className="relative mb-6">
        {/* Animated chefs hat and glowing sparkles */}
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shadow-xl border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800">
          <ChefHat className="w-10 h-10 animate-bounce" />
        </div>
        <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-1 rounded-full animate-spin duration-3000">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
        {type === "ingredients"
          ? "Analyzing Fridge & Pantry"
          : type === "label"
          ? "Decoding Nutrition Label"
          : "Crafting Culinary Creations"}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs font-medium">
        {phrases[phraseIndex]}
      </p>

      {/* Progress Line */}
      <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-6 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full animate-[loading_4s_ease-in-out_infinite]" style={{ width: "40%" }}></div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(100%); width: 60%; }
          100% { transform: translateX(-100%); width: 30%; }
        }
      `}</style>
    </div>
  );
}
