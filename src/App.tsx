import React, { useState } from 'react';
import { ExerciseConfig, GameMode, UserProfile, WorkoutSessionRecord } from './types';
import { EXERCISES } from './utils/exercises';
import { loadUserProfile, saveUserProfile } from './utils/storage';
import { DashboardView } from './components/DashboardView';
import { ArenaView } from './components/ArenaView';
import { CalibrationModal } from './components/CalibrationModal';
import { SessionSummaryModal } from './components/SessionSummaryModal';

export function App() {
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [currentView, setCurrentView] = useState<'dashboard' | 'arena'>('dashboard');

  const [activeExercise, setActiveExercise] = useState<ExerciseConfig>(EXERCISES.squats);
  const [activeMode, setActiveMode] = useState<GameMode>('freeplay');

  // Modals
  const [showCalibration, setShowCalibration] = useState<boolean>(false);
  const [completedSession, setCompletedSession] = useState<WorkoutSessionRecord | null>(null);

  const handleStartWorkout = (exercise: ExerciseConfig, mode: GameMode) => {
    setActiveExercise(exercise);
    setActiveMode(mode);
    setShowCalibration(true);
  };

  const handleCalibrationComplete = () => {
    setShowCalibration(false);
    setCurrentView('arena');
  };

  const handleFinishSession = (record: WorkoutSessionRecord) => {
    // Refresh user profile with updated points and streaks
    setUserProfile(loadUserProfile());
    setCompletedSession(record);
  };

  const handlePlayAgain = () => {
    setCompletedSession(null);
    setCurrentView('arena');
  };

  const handleReturnMenu = () => {
    setCompletedSession(null);
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {currentView === 'dashboard' ? (
        <DashboardView
          userProfile={userProfile}
          onUpdateProfile={(updated) => {
            setUserProfile(updated);
            saveUserProfile(updated);
          }}
          onStartWorkout={handleStartWorkout}
        />
      ) : (
        <ArenaView
          exercise={activeExercise}
          mode={activeMode}
          userProfile={userProfile}
          onBackToMenu={() => setCurrentView('dashboard')}
          onFinishSession={handleFinishSession}
        />
      )}

      {/* 3-second Calibration Screen */}
      {showCalibration && (
        <CalibrationModal
          exercise={activeExercise}
          onComplete={handleCalibrationComplete}
          onCancel={() => setShowCalibration(false)}
        />
      )}

      {/* Post-Workout Summary Screen */}
      {completedSession && (
        <SessionSummaryModal
          record={completedSession}
          onPlayAgain={handlePlayAgain}
          onReturnMenu={handleReturnMenu}
        />
      )}
    </div>
  );
}

export default App;
