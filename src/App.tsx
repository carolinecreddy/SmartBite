import React, { useState } from "react";
import { 
  Sparkles, 
  ChefHat, 
  Camera, 
  Upload, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Edit2, 
  Check, 
  Activity, 
  Info, 
  X, 
  Utensils,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Zap
} from "lucide-react";
import CameraView from "./components/CameraView";
import Loader from "./components/Loader";
import { NutritionLabelAnalysis, Meal, ActiveScreen } from "./types";

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("home");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredientInput, setNewIngredientInput] = useState<string>("");
  const [scannedLabel, setScannedLabel] = useState<NutritionLabelAnalysis | null>(null);
  const [generatedMeals, setGeneratedMeals] = useState<Meal[]>([]);
  
  // Loading & error trackers
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingType, setLoadingType] = useState<"ingredients" | "label" | "meals">("ingredients");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Custom manual edit state for a single ingredient
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Start Over / Reset State completely
  const handleReset = () => {
    setActiveScreen("home");
    setIngredients([]);
    setNewIngredientInput("");
    setScannedLabel(null);
    setGeneratedMeals([]);
    setErrorMessage(null);
    setEditingIndex(null);
  };

  // Switch to Scan Fridge Screen
  const handleOpenScanFridge = () => {
    setErrorMessage(null);
    setActiveScreen("scan-fridge");
  };

  // Switch to Scan Label Screen
  const handleOpenScanLabel = () => {
    setErrorMessage(null);
    setActiveScreen("scan-label");
  };

  // Handle Photo capture of Fridge / Pantry Item
  const handleFridgeCapture = async (base64Image: string, mimeType: string) => {
    setIsLoading(true);
    setLoadingType("ingredients");
    setActiveScreen("fridge-results");
    setErrorMessage(null);
    
    try {
      const response = await fetch("/api/analyze-fridge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image, mimeType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze pantry image");
      }

      const data = await response.json();
      if (data.ingredients && Array.isArray(data.ingredients)) {
        // Filter out duplicate or empty items and join with any existing
        const newItems = data.ingredients.filter(
          (item: string) => item.trim() !== "" && !ingredients.includes(item.trim())
        );
        setIngredients((prev) => [...prev, ...newItems]);
      } else {
        throw new Error("No ingredients detected. Please try a different photo or add ingredients manually.");
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Something went wrong while identifying your ingredients. Try again or add items manually.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Photo capture of Nutrition facts Label
  const handleLabelCapture = async (base64Image: string, mimeType: string) => {
    setIsLoading(true);
    setLoadingType("label");
    setActiveScreen("label-results");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/explain-label", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image, mimeType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze nutrition label");
      }

      const data: NutritionLabelAnalysis = await response.json();
      setScannedLabel(data);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Could not parse or read the nutrition label. Hold the camera steady and test under brighter light.");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate customized Meal suggestions
  const handleGenerateMeals = async () => {
    if (ingredients.length === 0) {
      setErrorMessage("Please have at least 1 ingredient in your workspace to generate recipe matches.");
      return;
    }

    setIsLoading(true);
    setLoadingType("meals");
    setActiveScreen("meal-ideas");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/generate-meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredients,
          nutritionLabelContext: scannedLabel || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to compile custom meal matches");
      }

      const data = await response.json();
      setGeneratedMeals(data.meals || []);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Could not generate creative recipes. Try modifying your ingredient list and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add individual custom ingredient manually
  const handleAddManualIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanItem = newIngredientInput.trim();
    if (cleanItem && !ingredients.includes(cleanItem)) {
      setIngredients((prev) => [...prev, cleanItem]);
      setNewIngredientInput("");
    }
  };

  // Remove individual ingredient
  const handleRemoveIngredient = (indexToRemove: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Start editing a specific ingredient in the list
  const startEditingElement = (index: number, val: string) => {
    setEditingIndex(index);
    setEditingValue(val);
  };

  // Save the edited ingredient value
  const saveEditedElement = (index: number) => {
    const cleanEdited = editingValue.trim();
    if (cleanEdited) {
      setIngredients((prev) => {
        const copy = [...prev];
        copy[index] = cleanEdited;
        return copy;
      });
    }
    setEditingIndex(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white" id="main-app-container">
      
      {/* HEADER SECTION - Styling matching the 'Bold Typography' neo-brutalist style */}
      <header className="bg-white border-b-4 border-slate-900 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 relative z-10" id="app-header">
        <div className="flex flex-col cursor-pointer" onClick={handleReset}>
          <h1 className="text-3xl font-black tracking-tighter text-indigo-600 uppercase italic flex items-center gap-1.5 hover:opacity-90 transition-opacity">
            <span>SMARTBITE</span>
            <ChefHat className="w-7 h-7 text-emerald-500 -rotate-12 stroke-[2.5]" />
          </h1>
          <p className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500">
            Scan your food. Understand labels. Make smarter meals.
          </p>
        </div>
        
        {/* Status indicator / reset button */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border-2 border-slate-900">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase text-slate-700">App Active</span>
          </div>
          
          {(ingredients.length > 0 || scannedLabel) && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-rose-50 border-2 border-slate-900 rounded-xl text-rose-700 hover:bg-rose-100 flex items-center gap-1 text-[11px] font-extrabold transition-all active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(244,63,94,1)] active:shadow-none"
              id="header-btn-reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              RESET
            </button>
          )}
        </div>
      </header>

      {/* ERROR TOAST BAR */}
      {errorMessage && (
        <div className="bg-rose-500 text-white px-6 py-4 border-b-4 border-slate-900 font-bold shadow-lg flex items-center justify-between gap-2 anime-fade-in" id="error-alert">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm tracking-tight">{errorMessage}</p>
          </div>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="p-1 hover:bg-white/20 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* MAIN SCREEN ROUTER */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6" id="app-main-content">
        
        {/* SCREEN 1: HOME DASHBOARD */}
        {activeScreen === "home" && (
          <div className="flex flex-col gap-6 py-4 animate-fade-in" id="screen-home">
            <div className="text-left bg-gradient-to-tr from-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(79,70,229,1)] relative overflow-hidden" id="home-intro-card">
              <div className="relative z-10 max-w-xl">
                <span className="px-3 py-1 bg-indigo-500/30 rounded-full text-[10px] font-black border border-indigo-400/40 uppercase tracking-wider text-indigo-300">
                  SmartBite Cooking Assistant
                </span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none mt-3 mb-4">
                  Scan your food. Understand labels. Make smarter meals.
                </h2>
                <p className="text-sm text-indigo-100 leading-relaxed font-semibold">
                  Take photos of what is inside your fridge or pantry to automatically detect raw ingredients, or scan nutrition facts on any food box to understand the details in simple, direct terms.
                </p>
              </div>
              <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute top-10 right-10 opacity-10 pointer-events-none">
                <Utensils className="w-40 h-40" />
              </div>
            </div>

            {/* Reviewer Testing Note */}
            <div className="p-4 bg-amber-50 border-2 border-slate-900 rounded-2xl flex items-center gap-3 text-slate-800 text-xs font-semibold" id="reviewer-note">
              <span className="p-1 px-2 bg-indigo-600 text-white text-[10px] font-black rounded uppercase tracking-wider">
                Note
              </span>
              <p>Best tested on a phone in Safari or Chrome. Allow camera access when prompted.</p>
            </div>

            {/* ACTION GRID: Neo-Brutalist heavy border options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2" id="dashboard-actions-grid">
              {/* Option A: Scan Fridge/Pantry */}
              <button
                onClick={handleOpenScanFridge}
                className="group bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 flex flex-col items-start justify-between text-left shadow-[8px_8px_0px_0px_rgba(79,70,229,1)] hover:shadow-[12px_12px_0px_0px_rgba(79,70,229,1)] active:shadow-none active:translate-x-1.5 active:translate-y-1.5 transition-all text-slate-800"
                id="btn-scan-fridge-trigger"
              >
                <div className="flex justify-between items-start w-full mb-8">
                  <span className="bg-indigo-100 text-indigo-600 p-4 rounded-2xl border-2 border-slate-900 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                    <Camera className="w-8 h-8" />
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-100 text-emerald-800 border-2 border-slate-900 px-2.5 py-1 rounded-full">
                    AI Vision Enabled
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black leading-none mb-2 tracking-tight uppercase group-hover:text-indigo-600 transition-colors">
                    SCAN FRIDGE /<br />PANTRY
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Instantly identify items with your camera to find realistic recipes based mostly on what you already have.
                  </p>
                </div>
              </button>

              {/* Option B: Scan Nutrition Label */}
              <button
                onClick={handleOpenScanLabel}
                className="group bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 flex flex-col items-start justify-between text-left shadow-[8px_8px_0px_0px_rgba(16,185,129,1)] hover:shadow-[12px_12px_0px_0px_rgba(16,185,129,1)] active:shadow-none active:translate-x-1.5 active:translate-y-1.5 transition-all text-slate-800"
                id="btn-scan-label-trigger"
              >
                <div className="flex justify-between items-start w-full mb-8">
                  <span className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl border-2 border-slate-900 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-200">
                    <Activity className="w-8 h-8" />
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-widest bg-indigo-50 text-indigo-800 border-2 border-slate-900 px-2.5 py-1 rounded-full">
                    Nutrition Decoded
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black leading-none mb-2 tracking-tight uppercase group-hover:text-emerald-600 transition-colors">
                    SCAN NUTRITION<br />LABEL
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Snap a photo of the nutrition label on any food package to get a simple, helpful breakdown of its key nutrients.
                  </p>
                </div>
              </button>
            </div>

            {/* Quick manual workspace summary if they already have items in progress */}
            {(ingredients.length > 0 || scannedLabel) && (
              <div className="p-6 bg-amber-50 border-4 border-slate-900 rounded-3xl mt-4 flex flex-col gap-4 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]" id="active-workspace-card">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-amber-200 border border-amber-400 rounded-lg text-amber-900 text-xs font-black">
                    WORKSPACE ACTIVE
                  </span>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Current Loaded Items
                  </h4>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 p-4 rounded-xl border border-amber-200/50">
                  <div className="space-y-1.5 text-xs">
                    {ingredients.length > 0 ? (
                      <p className="text-slate-700 font-medium">
                        🥦 <span className="font-extrabold">{ingredients.length} ingredients</span> ready to cook.
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">No ingredients scanned or added yet.</p>
                    )}
                    
                    {scannedLabel ? (
                      <p className="text-slate-700 font-medium">
                        🔍 Scanned item context: <span className="font-extrabold text-indigo-600">"{scannedLabel.productName}"</span> ({scannedLabel.calories})
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">No ingredient label context scanned yet.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {/* View current fridge results */}
                    {ingredients.length > 0 && (
                      <button
                        onClick={() => setActiveScreen("fridge-results")}
                        className="flex-1 sm:flex-none text-center px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl border-2 border-slate-900 hover:bg-indigo-700"
                      >
                        Adjust Ingredients
                      </button>
                    )}
                    {/* View labels results */}
                    {scannedLabel && (
                      <button
                        onClick={() => setActiveScreen("label-results")}
                        className="flex-1 sm:flex-none text-center px-4 py-2 bg-emerald-500 text-white font-bold text-xs rounded-xl border-2 border-slate-900 hover:bg-emerald-600"
                      >
                        View Label Data
                      </button>
                    )}
                    {/* Combine option */}
                    {ingredients.length > 0 && (
                      <button
                        onClick={handleGenerateMeals}
                        className="flex-1 sm:flex-none bg-amber-400 text-slate-900 font-black text-xs px-4 py-2 rounded-xl border-2 border-slate-900 hover:bg-amber-350 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
                      >
                        Generate 3 Meal Ideas ⚡
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCREEN 2: SCAN FRIDGE CAMERA */}
        {activeScreen === "scan-fridge" && (
          <div className="rounded-3xl border-4 border-slate-900 overflow-hidden" id="screen-camera-fridge">
            <CameraView 
              title="Camera Workspace: Ingredients"
              guidanceText="Frame your fridge, pantry, countertop, or ingredients in good lighting."
              onCapture={handleFridgeCapture}
              onCancel={() => setActiveScreen("home")}
            />
          </div>
        )}

        {/* SCREEN 3: SCAN LABEL CAMERA */}
        {activeScreen === "scan-label" && (
          <div className="rounded-3xl border-4 border-slate-900 overflow-hidden" id="screen-camera-label">
            <CameraView 
              title="Camera Workspace: Label Scanner"
              guidanceText="Center the Nutrition Facts label or ingredient list clearly in the photo."
              onCapture={handleLabelCapture}
              onCancel={() => setActiveScreen("home")}
            />
          </div>
        )}

        {/* SCREEN 4: DETECTED INGREDIENTS LIST + MANUAL WORKSPACE */}
        {activeScreen === "fridge-results" && (
          <div className="flex flex-col gap-6 py-2 animate-fade-in" id="ingredients-results-panel">
            {isLoading ? (
              <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <Loader type="ingredients" />
              </div>
            ) : (
              <div className="flex flex-col gap-6" id="ingredients-resolved-card">
                {/* Visual Summary Box */}
                <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(79,70,229,1)]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-100 pb-4 mb-6">
                    <div>
                      <h2 className="text-3xl font-black tracking-tight text-slate-800 uppercase italic">
                        Ingredients Found
                      </h2>
                      <p className="text-sm text-slate-500 font-semibold mt-1">
                        Edit, delete, or manually add ingredients, then tap the button below to generate clear recipe ideas.
                      </p>
                    </div>

                    <button
                      onClick={handleOpenScanFridge}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl border-2 border-slate-900 transition-all flex items-center gap-1.5"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      Capture Another Image
                    </button>
                  </div>

                  {/* Manual entry field */}
                  <form onSubmit={handleAddManualIngredient} className="flex gap-2 mb-6" id="add-manual-form">
                    <input
                      type="text"
                      placeholder="Type ingredient (e.g. Garlic, Broccoli, Rice)..."
                      value={newIngredientInput}
                      onChange={(e) => setNewIngredientInput(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-900 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-indigo-600 text-white font-black text-sm rounded-2xl border-2 border-slate-900 hover:bg-indigo-700 flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      ADD
                    </button>
                  </form>

                  {/* Key items rendering */}
                  {ingredients.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300" id="empty-ingredients-fallback">
                      <ChefHat className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-500 uppercase">Your ingredient list is empty</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        Take a photo of your fridge or type items to fill this workspace.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="ingredients-grid-list">
                      {ingredients.map((ing, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-slate-100 hover:bg-slate-150 border-2 border-slate-900 rounded-2xl transition"
                        >
                          {editingIndex === idx ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="flex-1 bg-white border border-slate-400 text-xs font-bold p-1 rounded-md"
                              />
                              <button
                                onClick={() => saveEditedElement(idx)}
                                className="p-1 px-2.5 bg-emerald-500 text-white rounded-md text-xs font-black border border-slate-900"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                <span className="text-sm font-extrabold text-slate-800 tracking-tight truncate">
                                  {ing}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => startEditingElement(idx, ing)}
                                  className="p-1 bg-white hover:bg-slate-200 rounded-lg text-slate-600 border border-slate-300"
                                  title="Edit ingredient name"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveIngredient(idx)}
                                  className="p-1 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 border border-rose-300"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary Footer for Ingredients */}
                  {ingredients.length > 0 && (
                    <div className="mt-8 pt-6 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center gap-4 justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1 px-2 bg-emerald-500 text-white text-[11px] font-black rounded border border-slate-900">
                          {ingredients.length} INGREDIENTS READY
                        </span>
                        {scannedLabel && (
                          <span className="p-1 px-2 bg-indigo-600 text-white text-[11px] font-black rounded border border-slate-900">
                            LABEL CONTEXT LOADED
                          </span>
                        )}
                      </div>

                      <button
                        onClick={handleGenerateMeals}
                        className="w-full sm:w-auto px-8 py-4 bg-emerald-500 text-slate-950 font-black text-sm uppercase rounded-2xl border-4 border-slate-900 hover:bg-emerald-400 active:translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all flex items-center justify-center gap-2"
                        id="btn-recipe-trigger-active"
                      >
                        <span>Generate 3 Meal Ideas</span>
                        <ChevronRight className="w-5 h-5 stroke-[3]" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Scanned Label reminder to help encourage combination feature */}
                {!scannedLabel && (
                  <div className="bg-amber-50 border-4 border-slate-900 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]">
                    <div className="space-y-1 max-w-lg">
                      <h4 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                        Combine with a packaged product
                      </h4>
                      <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                        Do you have a specialized sauce, canned element, yogurt, or packaged seasoning mix you want to use? Scan its nutritional label first to receive direct helpful nutrition tips.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenScanLabel}
                      className="px-4 py-2 bg-white text-slate-800 font-black text-xs rounded-xl border-2 border-slate-900 hover:bg-slate-100 flex items-center gap-1 flex-shrink-0 self-stretch sm:self-center justify-center"
                    >
                      Scan Package Label
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 5: LABELS INTERPRETATION RESULTS */}
        {activeScreen === "label-results" && (
          <div className="flex flex-col gap-6 py-2 animate-fade-in" id="label-results-panel">
            {isLoading ? (
              <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <Loader type="label" />
              </div>
            ) : (
              <div className="flex flex-col gap-6" id="label-resolved-card">
                {scannedLabel && (
                  <>
                    {/* Visual brutalist card detailing label analysis */}
                    <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(16,185,129,1)]">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-150 pb-4 mb-6">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-100 text-emerald-800 border bg-emerald-50 border-emerald-300 px-2.5 py-1 rounded-full">
                            Nutrition Decode Success
                          </span>
                          <h2 className="text-3xl font-black tracking-tight text-slate-800 uppercase italic mt-1.5">
                            "{scannedLabel.productName}" Label Overview
                          </h2>
                        </div>
                        <button
                          onClick={handleOpenScanLabel}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl border-2 border-slate-900 transition-all flex items-center gap-1.5"
                        >
                          <Camera className="w-4 h-4 text-emerald-400" />
                          Scan Another Product
                        </button>
                      </div>

                      {/* Main assessment bubbles */}
                      <div className="mb-6">
                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Category Assessments</p>
                        <div className="flex flex-wrap gap-2">
                          {scannedLabel.assessments && scannedLabel.assessments.map((tag, i) => {
                            let colorClasses = "bg-slate-100 text-slate-800 border-slate-300";
                            const lowerTag = tag.toLowerCase();
                            if (lowerTag.includes("processed")) colorClasses = "bg-amber-100 text-amber-900 border-amber-400";
                            if (lowerTag.includes("healthy") || lowerTag.includes("balanced")) colorClasses = "bg-emerald-100 text-emerald-900 border-emerald-400";
                            if (lowerTag.includes("sodium") || lowerTag.includes("sugar")) colorClasses = "bg-rose-100 text-rose-950 border-rose-400";
                            if (lowerTag.includes("protein")) colorClasses = "bg-indigo-100 text-indigo-900 border-indigo-400";
                            
                            return (
                              <span key={i} className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 ${colorClasses}`}>
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                                            {/* Clear Nutritional Breakdown Sections */}
                      <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {/* Calories */}
                          <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="block text-[10px] uppercase font-black text-slate-500 mb-0.5">Calories</span>
                            <span className="text-sm font-black text-slate-800">{scannedLabel.calories || "N/A"}</span>
                          </div>

                          {/* Protein */}
                          <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="block text-[10px] uppercase font-black text-slate-500 mb-0.5">Protein</span>
                            <span className="text-sm font-black text-indigo-700">{scannedLabel.protein || "N/A"}</span>
                          </div>

                          {/* Sugar */}
                          <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="block text-[10px] uppercase font-black text-slate-500 mb-0.5">Sugar</span>
                            <span className="text-sm font-black text-amber-700">{scannedLabel.sugar || "N/A"}</span>
                          </div>

                          {/* Sodium */}
                          <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="block text-[10px] uppercase font-black text-slate-500 mb-0.5">Sodium</span>
                            <span className="text-sm font-black text-rose-700">{scannedLabel.sodium || "N/A"}</span>
                          </div>

                          {/* Saturated Fat */}
                          <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="block text-[10px] uppercase font-black text-slate-500 mb-0.5">Saturated Fat</span>
                            <span className="text-sm font-black text-slate-700">{scannedLabel.saturatedFat || "N/A"}</span>
                          </div>

                          {/* Fiber */}
                          <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="block text-[10px] uppercase font-black text-slate-500 mb-0.5">Fiber</span>
                            <span className="text-sm font-black text-emerald-700">{scannedLabel.fiber || "N/A"}</span>
                          </div>
                        </div>

                        {/* Overall Summary */}
                        <div className="p-5 bg-slate-900 text-white rounded-2xl border-2 border-slate-950 relative overflow-hidden">
                          <span className="absolute top-2 right-2 p-1.5 bg-indigo-500/10 rounded-full border border-indigo-400/20 text-indigo-400">
                            <Sparkles className="w-4 h-4" />
                          </span>
                          <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">
                            Overall Summary
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-semibold">
                            {scannedLabel.simpleExplanation}
                          </p>
                        </div>

                        {/* Practical Tip */}
                        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-start gap-3">
                          <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-black text-emerald-950 uppercase tracking-widest">
                              Practical Tip
                            </h4>
                            <p className="text-xs text-emerald-950 font-bold leading-relaxed mt-1">
                              {scannedLabel.practicalSuggestion}
                            </p>
                          </div>
                        </div>
                      </div>  </div>

                      {/* Navigation buttons */}
                      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-end">
                        <button
                          onClick={() => setActiveScreen("home")}
                          className="px-6 py-3 bg-slate-100 text-slate-800 hover:bg-slate-200 text-center font-bold text-sm rounded-xl border-2 border-slate-900"
                        >
                          Return Home
                        </button>
                        
                        {ingredients.length > 0 ? (
                          <button
                            onClick={handleGenerateMeals}
                            className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-center text-white font-black text-sm uppercase rounded-xl border-4 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 duration-100"
                          >
                            Generate 3 Meal Ideas ➔
                          </button>
                        ) : (
                          <button
                            onClick={handleOpenScanFridge}
                            className="px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-center text-slate-950 font-black text-sm uppercase rounded-xl border-4 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 duration-100"
                          >
                            Step 2: Scan Ingredients
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 6: MEAL RECOMMENDATIONS */}
        {activeScreen === "meal-ideas" && (
          <div className="flex flex-col gap-6 py-2 animate-fade-in" id="meals-results-panel">
            {isLoading ? (
              <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <Loader type="meals" />
              </div>
            ) : (
              <div className="flex flex-col gap-6" id="meals-list-container">
                {/* Integration Header Summary Card */}
                {scannedLabel && (
                  <div className="bg-slate-900 text-white rounded-3xl p-6 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(16,185,129,1)]" id="label-combined-toast">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-0.5 px-2 bg-indigo-600 rounded text-[9px] font-black border border-indigo-400">
                        NUTRITION ADJUSTMENTS ENABLED
                      </span>
                      <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">
                        SmartBite Active Synthesis
                      </h4>
                    </div>
                    <p className="text-xs text-slate-350 leading-relaxed font-medium">
                      SmartBite combined details of your scanned ingredients with specific nutritional constraints found on the label of <span className="text-emerald-400 font-extrabold">"{scannedLabel.productName}"</span>. Adjustments are itemized beneath each dish configuration!
                    </p>
                  </div>
                )}

                {generatedMeals.length === 0 ? (
                  <div className="bg-white border-4 border-slate-900 rounded-3xl p-8 py-16 text-center" id="empty-recipes-fallback">
                    <Utensils className="w-16 h-16 text-slate-300 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-xl font-black text-slate-800 uppercase italic">No meal ideas found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 font-semibold">
                      We could not generate strong meal ideas from the current list. Try adding a few main ingredients like eggs, rice, pasta, chicken, beans, vegetables, or potatoes.
                    </p>
                    <button
                      onClick={() => setActiveScreen("fridge-results")}
                      className="mt-6 px-6 py-3 bg-indigo-600 text-white font-extrabold text-xs rounded-xl border-2 border-slate-900"
                    >
                      Adjust Ingredients Workspace
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6" id="generated-meals-list">
                    <h3 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic" id="meals-headline-title">
                      Your 3 Personalized Meal Ideas
                    </h3>

                    {generatedMeals.map((meal, index) => (
                      <div
                        key={index}
                        className="bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(79,70,229,1)] hover:translate-y-[-2px] transition-transform duration-150"
                        id={`meal-card-${index}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4 mb-6">
                          <div>
                            <h4 className="text-2xl font-black text-slate-800 leading-tight">
                              {meal.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded border border-slate-950">
                                DIFFICULTY: {meal.difficulty}
                              </span>
                              {meal.tags && meal.tags.map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border-2 border-slate-900"
                                >
                                  {tag.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-start sm:self-center">
                            <span className="text-slate-400 font-extrabold text-3xl italic">
                              0{index + 1}
                            </span>
                          </div>
                        </div>

                        {/* Ingredients used */}
                        <div className="mb-6">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Ingredients Sourced</p>
                          <div className="flex flex-wrap gap-1.5">
                            {meal.ingredientsUsed && meal.ingredientsUsed.map((ing, iKey) => (
                              <span key={iKey} className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-300">
                                {ing}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Step by step directions */}
                        <div className="mb-6">
                          <p className="text-xs font-black text-slate-450 uppercase tracking-wider mb-3">Cooking Instructions</p>
                          <ol className="space-y-3">
                            {meal.directions && meal.directions.map((step, sIdx) => (
                              <li key={sIdx} className="flex gap-3 text-sm">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-black text-indigo-600">
                                  {sIdx + 1}
                                </span>
                                <span className="text-slate-700 font-semibold leading-relaxed">
                                  {step}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Synthesized Advice inside our Brutalist UI */}
                        {meal.combinedAdvice ? (
                          <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl relative overflow-hidden">
                            <span className="absolute -top-3 -right-3 w-10 h-10 bg-amber-200/40 rounded-full blur-xl pointer-events-none"></span>
                            <div className="flex items-start gap-2">
                              <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="text-xs font-black text-amber-950 uppercase tracking-tight">
                                  Healthy Integration Note
                                </h5>
                                <p className="text-xs text-amber-900 leading-relaxed font-semibold mt-1">
                                  {meal.combinedAdvice}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : scannedLabel ? (
                          <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl">
                            <div className="flex items-start gap-2">
                              <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="text-xs font-black text-amber-950 uppercase tracking-tight">
                                  Combined Nutrient Advice
                                </h5>
                                <p className="text-xs text-amber-900 leading-relaxed font-semibold mt-1">
                                  Integrate {scannedLabel.productName} inside this portion safely to preserve flavor while balancing salt/sodium. If this item is high in sodium, use a smaller amount or balance it with vegetables, plain protein, rice, or pasta.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}

                    {/* Simple Bottom actions */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-end pb-8">
                      <button
                        onClick={() => setActiveScreen("home")}
                        className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-center font-bold text-sm rounded-xl border-2 border-slate-900"
                      >
                        Return Home
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-center font-black text-sm uppercase rounded-xl border-4 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
                      >
                        Start Over from Scratch
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {/* FOOTER & PRIVACY NOTE */}
      <footer className="bg-white border-t-4 border-slate-900 px-6 py-6 mt-auto flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10" id="app-footer-bar">
        <div className="flex items-center gap-3 text-left">
          <div className="bg-slate-100 p-2.5 rounded-2xl border-2 border-slate-900 flex-shrink-0 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-600">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">
              Privacy note: Photos are only used to generate your ingredient, nutrition, and meal analysis. They are not saved by this app.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-black text-slate-500">
          <span>SmartBite</span>
        </div>
      </footer>
    </div>
  );
}
