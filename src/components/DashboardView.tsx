import React, { useState } from 'react';
import {
  Trophy,
  Flame,
  Zap,
  Play,
  Timer,
  Settings,
  ShieldCheck,
  CheckCircle,
  Activity,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ExerciseConfig, ExerciseId, GameMode, UserProfile } from '../types';
import { EXERCISES } from '../utils/exercises';
import { getStreakMultiplier, loadExerciseStats, loadLeaderboard, loadSessions, saveUserProfile } from '../utils/storage';
import { PoseSilhouetteGuide } from './PoseSilhouetteGuide';

interface DashboardProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onStartWorkout: (exercise: ExerciseConfig, mode: GameMode) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({
  userProfile,
  onUpdateProfile,
  onStartWorkout,
}) => {
  const [selectedExerciseId, setSelectedExerciseId] = useState<ExerciseId>('squats');
  const [activeTab, setActiveTab] = useState<'exercises' | 'stats' | 'leaderboard' | 'settings'>('exercises');

  const stats = loadExerciseStats();
  const sessions = loadSessions();
  const leaderboard = loadLeaderboard(selectedExerciseId);
  const streakMultiplier = getStreakMultiplier(userProfile.currentStreak);

  const selectedExercise = EXERCISES[selectedExerciseId];

  // Filter exercises available for current difficulty
  const exerciseList = Object.values(EXERCISES).filter((ex) => {
    if (userProfile.difficulty === 'beginner') {
      return ['squats', 'jumping_jacks', 'high_knees', 'shoulder_presses'].includes(ex.id);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="w-6 h-6 text-slate-950 font-black" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                PoseFit <span className="text-emerald-400">Arena</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">
                Zero-Upload Local Computer Vision
              </span>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/25 px-3 py-1.5 rounded-xl">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
              <div className="text-xs">
                <span className="font-bold text-orange-300">{userProfile.currentStreak} Day Streak</span>
                <span className="text-orange-400/80 font-mono ml-1">({streakMultiplier}x)</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300 font-mono">
                {userProfile.totalLifetimePoints} PTS
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner with Privacy Guarantee */}
      <div className="bg-gradient-to-b from-slate-900/90 to-slate-950 border-b border-slate-800/80 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
              Welcome back, <span className="text-emerald-400">{userProfile.userName}</span>!
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Train with real-time pose tracking. Select an exercise, hit your reps, and build your streak!
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs text-emerald-400/90">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Private: Video never leaves your browser</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="max-w-7xl mx-auto mt-6 flex gap-2 border-b border-slate-800 pb-1">
          <button
            onClick={() => setActiveTab('exercises')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === 'exercises'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Exercise Arena
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === 'stats'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Stats & History
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === 'leaderboard'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Leaderboards
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* TAB 1: EXERCISE SELECTION & LAUNCH */}
        {activeTab === 'exercises' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Exercises List (Left 2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-white">Choose an Exercise</h2>
                <span className="text-xs text-slate-400">
                  {exerciseList.length} of 10 available ({userProfile.difficulty} mode)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {exerciseList.map((ex) => {
                  const isSelected = ex.id === selectedExerciseId;
                  const exStat = stats[ex.id];

                  return (
                    <div
                      key={ex.id}
                      onClick={() => setSelectedExerciseId(ex.id)}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-500/10'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-base font-bold text-white">{ex.name}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ex.difficulty === 'Easy'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : ex.difficulty === 'Medium'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {ex.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                          {ex.repDefinition}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                        <span>Best: {exStat?.bestChallengeReps || 0} reps (30s)</span>
                        <span className="text-emerald-400 font-semibold">{ex.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Exercise Action Card (Right Col) */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold uppercase tracking-wider">
                        {selectedExercise.category}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-semibold">
                        {selectedExercise.difficulty}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white">{selectedExercise.name}</h3>
                  </div>

                  <PoseSilhouetteGuide
                    exerciseId={selectedExercise.id}
                    orientation={selectedExercise.orientation}
                    className="shrink-0 scale-90 sm:scale-100"
                  />
                </div>

                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                  {selectedExercise.description}
                </p>

                {/* Form Tip Callout */}
                <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl mb-4 text-xs text-emerald-200">
                  <span className="font-bold uppercase tracking-wider text-emerald-400 mr-1.5">Camera Form Tip:</span>
                  {selectedExercise.tips}
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 mb-6 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Target Muscles
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExercise.targetMuscles.map((muscle) => (
                      <span
                        key={muscle}
                        className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 mb-6 space-y-1">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Rep Requirement
                  </div>
                  <div className="text-xs text-emerald-400 font-medium">
                    {selectedExercise.repDefinition}
                  </div>
                </div>
              </div>

              {/* Mode Launcher Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => onStartWorkout(selectedExercise, 'challenge30')}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 text-base"
                >
                  <Timer className="w-5 h-5" />
                  <span>Start 30-Second Challenge</span>
                </button>

                <button
                  onClick={() => onStartWorkout(selectedExercise, 'freeplay')}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 text-sm border border-slate-700"
                >
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  <span>Start Free Play Mode</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STATS & SESSIONS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Reps</span>
                  <div className="text-2xl font-black font-mono text-white">
                    {userProfile.totalLifetimeReps}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Points</span>
                  <div className="text-2xl font-black font-mono text-white">
                    {userProfile.totalLifetimePoints}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Current Streak</span>
                  <div className="text-2xl font-black font-mono text-white">
                    {userProfile.currentStreak} Days
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Workouts Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Recent Workout History</h3>
              {sessions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No workouts recorded yet. Pick an exercise to log your first session!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                        <th className="py-3 px-4">Exercise</th>
                        <th className="py-3 px-4">Mode</th>
                        <th className="py-3 px-4">Reps</th>
                        <th className="py-3 px-4">Points</th>
                        <th className="py-3 px-4">Multiplier</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {sessions.slice(0, 10).map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-semibold text-white">
                            {EXERCISES[s.exerciseId]?.name || s.exerciseId}
                          </td>
                          <td className="py-3 px-4 capitalize text-slate-300">
                            {s.mode === 'challenge30' ? '30s Challenge' : 'Free Play'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">{s.reps}</td>
                          <td className="py-3 px-4 font-mono text-amber-400">+{s.points}</td>
                          <td className="py-3 px-4 text-orange-400 font-mono">{s.multiplier}x</td>
                          <td className="py-3 px-4 text-slate-400">{s.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Local Personal Records</h3>
                <p className="text-xs text-slate-400">Top 30-Second Challenge high scores</p>
              </div>

              {/* Exercise Selector */}
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value as ExerciseId)}
                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2"
              >
                {Object.values(EXERCISES).map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No high scores logged for this exercise yet. Complete a 30s Challenge!
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border ${
                      idx === 0
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : idx === 1
                        ? 'bg-slate-800/80 border-slate-700'
                        : 'bg-slate-950/60 border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                          idx === 0
                            ? 'bg-amber-500 text-black'
                            : idx === 1
                            ? 'bg-slate-400 text-black'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-bold text-white">{entry.userName}</span>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400 text-lg">
                          {entry.reps}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">reps</span>
                      </div>
                      <span className="text-xs text-slate-400 hidden sm:inline">{entry.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white mb-4">App & Gameplay Settings</h3>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Athlete Name
              </label>
              <input
                type="text"
                value={userProfile.userName}
                onChange={(e) => {
                  const updated = { ...userProfile, userName: e.target.value };
                  onUpdateProfile(updated);
                  saveUserProfile(updated);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      const updated = { ...userProfile, difficulty: lvl };
                      onUpdateProfile(updated);
                      saveUserProfile(updated);
                    }}
                    className={`py-2.5 px-3 rounded-xl capitalize font-semibold text-xs border transition ${
                      userProfile.difficulty === lvl
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {userProfile.difficulty === 'beginner' &&
                  'Beginner: Confidence 0.4, ±15% tolerance, 4 core exercises.'}
                {userProfile.difficulty === 'intermediate' &&
                  'Intermediate: Confidence 0.5, ±10% tolerance, all 10 exercises.'}
                {userProfile.difficulty === 'advanced' &&
                  'Advanced: Confidence 0.6, strict form verification, all 10 exercises.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-sm font-semibold text-white">Audio Feedback & Sound Effects</span>
              <button
                onClick={() => {
                  const updated = { ...userProfile, soundEnabled: !userProfile.soundEnabled };
                  onUpdateProfile(updated);
                  saveUserProfile(updated);
                }}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300"
              >
                {userProfile.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-red-400" />
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

