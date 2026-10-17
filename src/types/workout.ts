export type MuscleGroup =
  | 'Pectoraux'
  | 'Dos'
  | 'Épaules'
  | 'Biceps'
  | 'Triceps'
  | 'Jambes'
  | 'Abdos'
  | 'Cardio'
  | 'Corps complet';

export type ExerciseIconKey =
  | 'bench_press'
  | 'squat'
  | 'deadlift'
  | 'pullup'
  | 'row'
  | 'shoulder_press'
  | 'curl'
  | 'dip'
  | 'plank'
  | 'lunge'
  | 'generic';

export interface ExerciseDefinition {
  id: string;
  name: string;
  category: MuscleGroup;
  targetMuscle: string;
  secondaryMuscles?: string[];
  equipment: string;
  description: string;
  tips: string;
  iconKey: ExerciseIconKey;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number; // in kg (0 for bodyweight)
  restSeconds: number;
  isCalisthenics?: boolean;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  targetReps: number;
  weight: number;
  reps: number;
  completed: boolean;
  completedAt?: number;
  previousWeight?: number;
  previousReps?: number;
}

export type ExerciseExecutionMode = 'ordinaire' | 'superset' | 'drop_set';

export interface ActiveExerciseItem {
  id: string;
  exerciseId: string;
  name: string;
  category: MuscleGroup;
  targetMuscle: string;
  description: string;
  tips: string;
  iconKey: ExerciseIconKey;
  restSeconds: number;
  sets: WorkoutSet[];
  supersetGroup?: string;
  executionMode?: ExerciseExecutionMode;
}

export interface RoutineExerciseItem {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
  restSeconds: number;
  supersetGroup?: string;
  executionMode?: ExerciseExecutionMode;
  notes?: string;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  description: string;
  targetMuscles: string[];
  estimatedDurationMinutes: number;
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé';
  programId?: string;
  exercises: RoutineExerciseItem[];
  isCustom?: boolean;
  createdAt?: string;
}

export interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  frequency: string; // e.g. "3x par semaine (1 jour sur 2)"
  workoutIds: string[];
  isCustom?: boolean;
}

export interface CompletedSetLog {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface CompletedExerciseLog {
  exerciseName: string;
  category: MuscleGroup;
  sets: CompletedSetLog[];
}

export interface WorkoutSessionLog {
  id: string;
  routineId?: string;
  routineName: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  exercises: CompletedExerciseLog[];
  totalVolumeKg: number;
  totalSetsCompleted: number;
  dateString: string; // YYYY-MM-DD
  notes?: string;
  feeling?: '🔥 Top' | '💪 Bon' | '😐 Moyen' | '🥵 Difficile';
  newPrs?: { exerciseName: string; weight: number; reps: number }[];
}

export interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  maxRepsAtMaxWeight: number;
  achievedDate: string;
  initialWeight?: number; // to compute percentage increase
}

// Nutrition Types
export interface NutritionFoodItem {
  id: string;
  name: string;
  portion: string; // e.g. "150g", "2 oeufs", "30g"
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface MealEntry {
  id: string;
  mealType: string;
  foods: NutritionFoodItem[];
}

export interface DailyNutritionPlan {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: MealEntry[];
}
