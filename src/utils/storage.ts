import { UserProfile, ExerciseStat, WorkoutSessionRecord, LeaderboardEntry, ExerciseId, DifficultyLevel } from '../types';

const USER_KEY = 'posefit_user_profile';
const STATS_KEY = 'posefit_exercise_stats';
const SESSIONS_KEY = 'posefit_sessions';
const LEADERBOARD_KEY = 'posefit_leaderboard';

export const getTodayDateString = (): string => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const loadUserProfile = (): UserProfile => {
  const raw = localStorage.getItem(USER_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fallback
    }
  }

  const defaultUser: UserProfile = {
    userName: 'Athlete',
    currentStreak: 1,
    totalLifetimePoints: 0,
    totalLifetimeReps: 0,
    lastActiveDate: null,
    difficulty: 'intermediate',
    soundEnabled: true,
    theme: 'dark',
  };
  saveUserProfile(defaultUser);
  return defaultUser;
};

export const saveUserProfile = (profile: UserProfile): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
};

export const loadExerciseStats = (): Record<string, ExerciseStat> => {
  const raw = localStorage.getItem(STATS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  return {};
};

export const saveExerciseStats = (stats: Record<string, ExerciseStat>): void => {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

export const loadSessions = (): WorkoutSessionRecord[] => {
  const raw = localStorage.getItem(SESSIONS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  return [];
};

export const recordSession = (session: Omit<WorkoutSessionRecord, 'id'>): WorkoutSessionRecord => {
  const sessions = loadSessions();
  const newSession: WorkoutSessionRecord = {
    ...session,
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  sessions.unshift(newSession);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 100))); // keep last 100

  // Update exercise stats
  const stats = loadExerciseStats();
  const current = stats[session.exerciseId] || {
    totalReps: 0,
    bestFreePlaySession: 0,
    bestChallengeReps: 0,
    lastPerformed: null,
  };

  current.totalReps += session.reps;
  current.lastPerformed = session.date;

  if (session.mode === 'freeplay') {
    if (session.reps > current.bestFreePlaySession) {
      current.bestFreePlaySession = session.reps;
    }
  } else if (session.mode === 'challenge30') {
    if (session.reps > current.bestChallengeReps) {
      current.bestChallengeReps = session.reps;
    }
    // Also record to local leaderboard
    recordLeaderboardEntry(session.exerciseId, session.reps, session.points);
  }

  stats[session.exerciseId] = current;
  saveExerciseStats(stats);

  // Update user profile streaks & lifetime totals
  const user = loadUserProfile();
  user.totalLifetimePoints += session.points;
  user.totalLifetimeReps += session.reps;

  // Streak logic
  const today = getTodayDateString();
  if (!user.lastActiveDate) {
    user.currentStreak = 1;
    user.lastActiveDate = today;
  } else if (user.lastActiveDate !== today) {
    const lastDate = new Date(user.lastActiveDate);
    const currentDate = new Date(today);
    const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      user.currentStreak += 1;
    } else if (diffDays > 1) {
      user.currentStreak = 1; // streak reset after missed day
    }
    user.lastActiveDate = today;
  }
  saveUserProfile(user);

  return newSession;
};

export const getStreakMultiplier = (currentStreak: number): number => {
  if (currentStreak >= 30) return 2.0;
  if (currentStreak >= 14) return 1.75;
  if (currentStreak >= 7) return 1.5;
  return 1.0;
};

export const loadLeaderboard = (exerciseId?: ExerciseId): LeaderboardEntry[] => {
  const raw = localStorage.getItem(LEADERBOARD_KEY);
  let list: LeaderboardEntry[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }

  if (exerciseId) {
    return list
      .filter((e) => e.exerciseId === exerciseId)
      .sort((a, b) => b.reps - a.reps)
      .slice(0, 10);
  }
  return list.sort((a, b) => b.points - a.points).slice(0, 20);
};

export const recordLeaderboardEntry = (
  exerciseId: ExerciseId,
  reps: number,
  points: number
): void => {
  const user = loadUserProfile();
  const raw = localStorage.getItem(LEADERBOARD_KEY);
  let list: LeaderboardEntry[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }

  list.push({
    id: `lb_${Date.now()}`,
    userName: user.userName || 'Player',
    exerciseId,
    reps,
    points,
    date: getTodayDateString(),
  });

  // Sort and keep top 100 overall
  list.sort((a, b) => b.reps - a.reps);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list.slice(0, 100)));
};

