export type ExerciseId =
  | 'squats'
  | 'pushups'
  | 'jumping_jacks'
  | 'lunges'
  | 'burpees'
  | 'tricep_dips'
  | 'high_knees'
  | 'plank_hold'
  | 'bicycle_crunches'
  | 'shoulder_presses';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type GameMode = 'freeplay' | 'challenge30';

export interface ExerciseConfig {
  id: ExerciseId;
  name: string;
  category: 'Legs' | 'Upper Body' | 'Cardio' | 'Core' | 'Full Body';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  repDefinition: string;
  targetMuscles: string[];
  recommendedPaceSec: number;
  orientation: 'front' | 'side';
  tips: string;
}

export interface UserProfile {
  userName: string;
  currentStreak: number;
  totalLifetimePoints: number;
  totalLifetimeReps: number;
  lastActiveDate: string | null;
  difficulty: DifficultyLevel;
  soundEnabled: boolean;
  theme: 'dark' | 'light';
}

export interface ExerciseStat {
  totalReps: number;
  bestFreePlaySession: number;
  bestChallengeReps: number;
  lastPerformed: string | null;
}

export interface WorkoutSessionRecord {
  id: string;
  exerciseId: ExerciseId;
  mode: GameMode;
  reps: number;
  points: number;
  multiplier: number;
  date: string;
  durationSeconds: number;
}

export interface LeaderboardEntry {
  id: string;
  userName: string;
  exerciseId: ExerciseId;
  reps: number;
  points: number;
  date: string;
}

export interface FormFeedback {
  type: 'neutral' | 'success' | 'warning' | 'info';
  message: string;
  progressPercent: number; // 0 to 100 towards rep completion
}

