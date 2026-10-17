import React, { useState, useEffect } from 'react';
import {
  DailyNutritionPlan,
  MealEntry,
  NutritionFoodItem,
} from '../types/workout.ts';
import {
  getNutritionPlan,
  saveNutritionPlan,
  DEFAULT_NUTRITION_PLAN,
} from '../utils/storage.ts';
import {
  Utensils,
  Plus,
  Trash2,
  RotateCcw,
  Flame,
  Check,
  Edit2,
  X,
  FolderPlus,
  Sparkles,
} from 'lucide-react';

interface QuickPresetFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
}

const QUICK_PRESETS: QuickPresetFood[] = [
  { name: 'Blanc de poulet grillé', portion: '150g', calories: 240, protein: 46, carbs: 0, fat: 5, category: 'Protéines' },
  { name: 'Oeufs entiers (3)', portion: '150g', calories: 215, protein: 18, carbs: 1, fat: 15, category: 'Protéines' },
  { name: 'Shaker de Whey Isolate', portion: '30g', calories: 120, protein: 25, carbs: 2, fat: 1, category: 'Protéines' },
  { name: 'Pavé de saumon', portion: '150g', calories: 310, protein: 34, carbs: 0, fat: 19, category: 'Protéines' },
  { name: 'Thon au naturel', portion: '1 boite (130g)', calories: 140, protein: 31, carbs: 0, fat: 1, category: 'Protéines' },
  { name: 'Riz basmati cuit', portion: '200g', calories: 260, protein: 6, carbs: 56, fat: 1, category: 'Glucides' },
  { name: 'Flocons d\'avoine', portion: '80g', calories: 295, protein: 11, carbs: 48, fat: 5, category: 'Glucides' },
  { name: 'Patates douces rôties', portion: '200g', calories: 172, protein: 3, carbs: 40, fat: 0, category: 'Glucides' },
  { name: 'Banane', portion: '1 pièce', calories: 98, protein: 1, carbs: 23, fat: 0, category: 'Glucides' },
  { name: 'Amandes / Noix', portion: '30g', calories: 180, protein: 6, carbs: 3, fat: 16, category: 'Lipides' },
  { name: 'Huile d\'olive vierge', portion: '1 c. à soupe', calories: 90, protein: 0, carbs: 0, fat: 10, category: 'Lipides' },
  { name: 'Avocat', portion: '1/2 avocat', calories: 140, protein: 2, carbs: 5, fat: 13, category: 'Lipides' },
  { name: 'Fromage blanc 0%', portion: '200g', calories: 100, protein: 16, carbs: 8, fat: 0, category: 'Protéines' },
];

const MEAL_SUGGESTIONS = [
  'Collation du matin',
  'Post-workout (Récupération)',
  'Goûter d\'après-midi',
  'Shaker avant coucher',
  'Collation de nuit',
  'Deuxième déjeuner',
];

export const NutritionView: React.FC = () => {
  const [plan, setPlan] = useState<DailyNutritionPlan>(() => getNutritionPlan());
  const [isEditingTargets, setIsEditingTargets] = useState(false);

  // Target edit fields
  const [targetCalories, setTargetCalories] = useState(plan.targetCalories);
  const [targetProtein, setTargetProtein] = useState(plan.targetProtein);
  const [targetCarbs, setTargetCarbs] = useState(plan.targetCarbs);
  const [targetFat, setTargetFat] = useState(plan.targetFat);

  // Add custom meal modal
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [newMealName, setNewMealName] = useState('');

  // Add food modal
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string>('meal-1');
  const [foodName, setFoodName] = useState('');
  const [foodPortion, setFoodPortion] = useState('');
  const [foodCalories, setFoodCalories] = useState<number>(150);
  const [foodProtein, setFoodProtein] = useState<number>(20);
  const [foodCarbs, setFoodCarbs] = useState<number>(10);
  const [foodFat, setFoodFat] = useState<number>(5);

  // Inline delete confirmations
  const [confirmDeleteFoodId, setConfirmDeleteFoodId] = useState<string | null>(null);
  const [confirmDeleteMealId, setConfirmDeleteMealId] = useState<string | null>(null);

  useEffect(() => {
    saveNutritionPlan(plan);
  }, [plan]);

  // Totals calculation
  const totalCalories = plan.meals.reduce(
    (acc, m) => acc + m.foods.reduce((fAcc, f) => fAcc + f.calories, 0),
    0
  );
  const totalProtein = plan.meals.reduce(
    (acc, m) => acc + m.foods.reduce((fAcc, f) => fAcc + f.proteinGrams, 0),
    0
  );
  const totalCarbs = plan.meals.reduce(
    (acc, m) => acc + m.foods.reduce((fAcc, f) => fAcc + f.carbsGrams, 0),
    0
  );
  const totalFat = plan.meals.reduce(
    (acc, m) => acc + m.foods.reduce((fAcc, f) => fAcc + f.fatGrams, 0),
    0
  );

  const calProgress = Math.min(100, Math.round((totalCalories / plan.targetCalories) * 100));
  const proteinProgress = Math.min(100, Math.round((totalProtein / plan.targetProtein) * 100));
  const carbsProgress = Math.min(100, Math.round((totalCarbs / plan.targetCarbs) * 100));
  const fatProgress = Math.min(100, Math.round((totalFat / plan.targetFat) * 100));

  const handleSaveTargets = () => {
    setPlan((prev) => ({
      ...prev,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
    }));
    setIsEditingTargets(false);
  };

  const handleAddPresetFood = (mealId: string, preset: QuickPresetFood) => {
    const newItem: NutritionFoodItem = {
      id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: preset.name,
      portion: preset.portion,
      calories: preset.calories,
      proteinGrams: preset.protein,
      carbsGrams: preset.carbs,
      fatGrams: preset.fat,
    };

    setPlan((prev) => ({
      ...prev,
      meals: prev.meals.map((m) =>
        m.id === mealId ? { ...m, foods: [...m.foods, newItem] } : m
      ),
    }));
  };

  const handleCreateCustomFoodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;

    const newItem: NutritionFoodItem = {
      id: `custom-food-${Date.now()}`,
      name: foodName.trim(),
      portion: foodPortion.trim() || '1 portion',
      calories: Number(foodCalories) || 0,
      proteinGrams: Number(foodProtein) || 0,
      carbsGrams: Number(foodCarbs) || 0,
      fatGrams: Number(foodFat) || 0,
    };

    setPlan((prev) => ({
      ...prev,
      meals: prev.meals.map((m) =>
        m.id === selectedMealId ? { ...m, foods: [...m.foods, newItem] } : m
      ),
    }));

    setShowAddFoodModal(false);
    setFoodName('');
    setFoodPortion('');
  };

  const handleDeleteFood = (mealId: string, foodId: string) => {
    setPlan((prev) => ({
      ...prev,
      meals: prev.meals.map((m) =>
        m.id === mealId ? { ...m, foods: m.foods.filter((f) => f.id !== foodId) } : m
      ),
    }));
    setConfirmDeleteFoodId(null);
  };

  // Add a new custom meal
  const handleCreateMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName.trim()) return;

    const newMeal: MealEntry = {
      id: `meal-${Date.now()}`,
      mealType: newMealName.trim(),
      foods: [],
    };

    setPlan((prev) => ({
      ...prev,
      meals: [...prev.meals, newMeal],
    }));

    setShowAddMealModal(false);
    setNewMealName('');
  };

  const handleDeleteMeal = (mealId: string) => {
    setPlan((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.id !== mealId),
    }));
    setConfirmDeleteMealId(null);
  };

  const handleResetToDefault = () => {
    setPlan(DEFAULT_NUTRITION_PLAN);
    setTargetCalories(DEFAULT_NUTRITION_PLAN.targetCalories);
    setTargetProtein(DEFAULT_NUTRITION_PLAN.targetProtein);
    setTargetCarbs(DEFAULT_NUTRITION_PLAN.targetCarbs);
    setTargetFat(DEFAULT_NUTRITION_PLAN.targetFat);
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header with Goals and Quick Edit */}
      <div className="bg-[#111a2e] border border-[#233556] rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f47b20]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#f47b20]">
                Plan nutritionnel quotidien
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Équilibre calorique et macronutriments
            </h2>
            <p className="text-xs text-slate-400">
              Adaptez vos apports pour soutenir vos séances de calisthénie et de musculation.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAddMealModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#f47b20] hover:bg-[#e06810] text-xs font-bold text-white shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter un repas</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditingTargets(!isEditingTargets)}
              className="px-3 py-1.5 rounded-xl bg-[#16223b] hover:bg-[#233556] text-xs font-semibold text-slate-200 hover:text-white border border-[#233556] transition flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#f47b20]" />
              <span>{isEditingTargets ? 'Fermer' : 'Ajuster les cibles'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="p-2 rounded-xl bg-[#16223b] hover:bg-[#233556] text-slate-400 hover:text-white border border-[#233556] transition"
              title="Réinitialiser au plan athlète par défaut"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Target Editing Drawer */}
        {isEditingTargets && (
          <div className="p-3 bg-[#0d1424] rounded-xl border border-[#233556] grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-150">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Calories (kcal)
              </label>
              <input
                type="number"
                value={targetCalories}
                onChange={(e) => setTargetCalories(Number(e.target.value))}
                className="w-full bg-[#16223b] border border-[#233556] rounded-lg px-2.5 py-1 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Protéines (g)
              </label>
              <input
                type="number"
                value={targetProtein}
                onChange={(e) => setTargetProtein(Number(e.target.value))}
                className="w-full bg-[#16223b] border border-[#233556] rounded-lg px-2.5 py-1 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Glucides (g)
              </label>
              <input
                type="number"
                value={targetCarbs}
                onChange={(e) => setTargetCarbs(Number(e.target.value))}
                className="w-full bg-[#16223b] border border-[#233556] rounded-lg px-2.5 py-1 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Lipides (g)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={targetFat}
                  onChange={(e) => setTargetFat(Number(e.target.value))}
                  className="w-full bg-[#16223b] border border-[#233556] rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveTargets}
                  className="px-2.5 bg-[#f47b20] text-white rounded-lg text-xs font-bold"
                  title="Enregistrer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Macro Progress Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Calories */}
          <div className="bg-[#0d1424] border border-[#233556] rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold text-[11px]">Calories</span>
              <span className="font-mono text-white font-bold text-xs">
                {totalCalories} / {plan.targetCalories}
              </span>
            </div>
            <div className="w-full h-2 bg-[#16223b] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#f47b20] to-[#ff9f4d] rounded-full transition-all"
                style={{ width: `${calProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block">
              {Math.max(0, plan.targetCalories - totalCalories)} kcal restantes
            </span>
          </div>

          {/* Protéines */}
          <div className="bg-[#0d1424] border border-[#233556] rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold text-[11px]">Protéines</span>
              <span className="font-mono text-white font-bold text-xs">
                {totalProtein}g / {plan.targetProtein}g
              </span>
            </div>
            <div className="w-full h-2 bg-[#16223b] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${proteinProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block">
              {proteinProgress}% de la cible
            </span>
          </div>

          {/* Glucides */}
          <div className="bg-[#0d1424] border border-[#233556] rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-semibold text-[11px]">Glucides</span>
              <span className="font-mono text-white font-bold text-xs">
                {totalCarbs}g / {plan.targetCarbs}g
              </span>
            </div>
            <div className="w-full h-2 bg-[#16223b] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${carbsProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block">
              {carbsProgress}% de la cible
            </span>
          </div>

          {/* Lipides */}
          <div className="bg-[#0d1424] border border-[#233556] rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-sky-400 font-semibold text-[11px]">Lipides</span>
              <span className="font-mono text-white font-bold text-xs">
                {totalFat}g / {plan.targetFat}g
              </span>
            </div>
            <div className="w-full h-2 bg-[#16223b] rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all"
                style={{ width: `${fatProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block">
              {fatProgress}% de la cible
            </span>
          </div>
        </div>
      </div>

      {/* Meals List */}
      <div className="space-y-4">
        {plan.meals.map((meal) => {
          const mealCals = meal.foods.reduce((acc, f) => acc + f.calories, 0);
          const mealProtein = meal.foods.reduce((acc, f) => acc + f.proteinGrams, 0);
          const mealCarbs = meal.foods.reduce((acc, f) => acc + f.carbsGrams, 0);
          const mealFat = meal.foods.reduce((acc, f) => acc + f.fatGrams, 0);
          const isDeletingMeal = confirmDeleteMealId === meal.id;

          return (
            <div
              key={meal.id}
              className="bg-[#111a2e] border border-[#233556] rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Meal Header */}
              <div className="p-3.5 bg-[#142038] border-b border-[#233556] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[#f47b20]" />
                  <h3 className="font-bold text-white text-sm">{meal.mealType}</h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    ({meal.foods.length} aliment{meal.foods.length > 1 ? 's' : ''})
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-white">{mealCals} kcal</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-400 font-semibold">{mealProtein}g P</span>
                    <span className="text-amber-400 font-semibold">{mealCarbs}g G</span>
                    <span className="text-sky-400 font-semibold">{mealFat}g L</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMealId(meal.id);
                      setShowAddFoodModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#f47b20] hover:bg-[#e06810] text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter aliment</span>
                  </button>

                  {/* Delete entire meal button */}
                  {isDeletingMeal ? (
                    <div className="flex items-center gap-1 bg-[#200f14] border border-rose-800 p-0.5 rounded-lg">
                      <span className="text-[9px] text-rose-300 font-bold px-1">Supprimer repas ?</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteMealId(null)}
                        className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px]"
                      >
                        Non
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteMealId(meal.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      title="Supprimer ce repas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Foods List */}
              <div className="p-3 space-y-2">
                {meal.foods.length > 0 ? (
                  meal.foods.map((food) => {
                    const isConfirming = confirmDeleteFoodId === food.id;

                    return (
                      <div
                        key={food.id}
                        className="bg-[#0d1424] border border-[#233556] rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-white block truncate">
                            {food.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Portion : {food.portion}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right font-mono text-xs">
                            <span className="font-bold text-white block">
                              {food.calories} kcal
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {food.proteinGrams}g P • {food.carbsGrams}g G • {food.fatGrams}g L
                            </span>
                          </div>

                          {isConfirming ? (
                            <div className="flex items-center gap-1 bg-[#1a0f18] border border-rose-800/60 p-1 rounded-lg">
                              <span className="text-[10px] text-rose-300 font-bold px-1">
                                Supprimer ?
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteFood(meal.id, food.id)}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                              >
                                Oui
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteFoodId(null)}
                                className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px]"
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteFoodId(food.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                              title="Retirer cet aliment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-4 text-xs text-slate-500 italic">
                    Aucun aliment dans ce repas. Cliquez sur "+ Ajouter aliment" pour composer votre repas.
                  </p>
                )}

                {/* Quick Add Presets Bar */}
                <div className="pt-2 border-t border-[#1c2a44]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Ajout rapide :
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {QUICK_PRESETS.slice(0, 5).map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleAddPresetFood(meal.id, preset)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[#16223b] hover:bg-[#233556] text-slate-300 hover:text-white border border-[#233556] transition flex items-center gap-1 font-medium"
                      >
                        <Plus className="w-2.5 h-2.5 text-[#f47b20]" />
                        <span>{preset.name}</span>
                        <span className="text-[9px] text-[#f47b20] font-mono">
                          ({preset.calories}kcal)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Big Add Meal Button at bottom */}
        <button
          type="button"
          onClick={() => setShowAddMealModal(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-[#233556] hover:border-[#f47b20] bg-[#111a2e]/50 hover:bg-[#111a2e] text-slate-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2"
        >
          <FolderPlus className="w-4 h-4 text-[#f47b20]" />
          <span>+ Ajouter un repas supplémentaire (Collation, Post-workout, etc.)</span>
        </button>
      </div>

      {/* ADD MEAL MODAL */}
      {showAddMealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111a2e] border border-[#233556] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#233556]">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-[#f47b20]" />
                <h3 className="font-bold text-white text-sm">Ajouter un repas</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMealModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMealSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Nom du repas
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Collation du matin, Shaker nuit..."
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f47b20]"
                />
              </div>

              {/* Suggestions chips */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                  Suggestions rapides :
                </span>
                <div className="flex flex-wrap gap-1">
                  {MEAL_SUGGESTIONS.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setNewMealName(sug)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-[#0d1424] hover:bg-[#16223b] border border-[#233556] text-slate-300 hover:text-white"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!newMealName.trim()}
                className="w-full py-2.5 rounded-xl bg-[#f47b20] hover:bg-[#e06810] text-white text-xs font-bold shadow-md transition disabled:opacity-40"
              >
                Créer le repas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Food Modal */}
      {showAddFoodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111a2e] border border-[#233556] rounded-2xl max-w-md w-full p-5 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#233556]">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-[#f47b20]" />
                <h3 className="font-bold text-white text-sm">Ajouter un aliment</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFoodModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Sélection rapide d'aliments courants :
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {QUICK_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFoodName(p.name);
                      setFoodPortion(p.portion);
                      setFoodCalories(p.calories);
                      setFoodProtein(p.protein);
                      setFoodCarbs(p.carbs);
                      setFoodFat(p.fat);
                    }}
                    className="w-full text-left p-1.5 rounded-lg bg-[#0d1424] hover:bg-[#16223b] border border-[#233556] flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <span className="font-semibold text-white block">{p.name}</span>
                      <span className="text-[10px] text-slate-400">{p.portion}</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#f47b20] font-bold">
                      {p.calories} kcal ({p.protein}g P)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateCustomFoodSubmit} className="space-y-3 pt-2 border-t border-[#233556]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Nom de l'aliment
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Riz, Poisson..."
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Portion
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 150g, 1 verre..."
                    value={foodPortion}
                    onChange={(e) => setFoodPortion(e.target.value)}
                    className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={foodCalories}
                    onChange={(e) => setFoodCalories(Number(e.target.value))}
                    className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                    Protéines (g)
                  </label>
                  <input
                    type="number"
                    value={foodProtein}
                    onChange={(e) => setFoodProtein(Number(e.target.value))}
                    className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                    Glucides (g)
                  </label>
                  <input
                    type="number"
                    value={foodCarbs}
                    onChange={(e) => setFoodCarbs(Number(e.target.value))}
                    className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                    Lipides (g)
                  </label>
                  <input
                    type="number"
                    value={foodFat}
                    onChange={(e) => setFoodFat(Number(e.target.value))}
                    className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#f47b20] hover:bg-[#e06810] text-white text-xs font-bold shadow-md transition"
              >
                Ajouter au repas
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
