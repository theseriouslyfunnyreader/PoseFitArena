import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, ArrowLeft, Award, Flame, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExerciseConfig, GameMode, UserProfile, WorkoutSessionRecord } from '../types';
import { initPoseDetector, renderPoseOnCanvas } from '../pose/detector';
import { ExerciseEngine } from '../pose/engine';
import { sound } from '../utils/sound';
import { getStreakMultiplier, recordSession } from '../utils/storage';
import { PoseSilhouetteGuide } from './PoseSilhouetteGuide';

interface ArenaProps {
  exercise: ExerciseConfig;
  mode: GameMode;
  userProfile: UserProfile;
  onBackToMenu: () => void;
  onFinishSession: (record: WorkoutSessionRecord) => void;
}

export const ArenaView: React.FC<ArenaProps> = ({
  exercise,
  mode,
  userProfile,
  onBackToMenu,
  onFinishSession,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [reps, setReps] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ message: string; type: string; progress: number }>({
    message: 'Align yourself in the frame',
    type: 'neutral',
    progress: 0,
  });

  // Screen Flash & Rep Animation
  const [repFlash, setRepFlash] = useState<boolean>(false);
  const [showPlusOne, setShowPlusOne] = useState<boolean>(false);

  // 30-Second Challenge Timer
  const [timeLeft, setTimeLeft] = useState<number>(mode === 'challenge30' ? 30 : 0);
  const [challengeFinished, setChallengeFinished] = useState<boolean>(false);

  // Sound toggle
  const [muted, setMuted] = useState<boolean>(!userProfile.soundEnabled);

  // Pose Engine
  const engineRef = useRef<ExerciseEngine>(new ExerciseEngine(exercise.id, userProfile.difficulty));
  const reqAnimationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const multiplier = getStreakMultiplier(userProfile.currentStreak);

  // Sound mute sync
  useEffect(() => {
    sound.setMuted(muted);
  }, [muted]);

  // Clean-up animation and video streams on unmount
  useEffect(() => {
    return () => {
      if (reqAnimationRef.current) {
        cancelAnimationFrame(reqAnimationRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 30-Second Challenge Timer Interval
  useEffect(() => {
    if (mode !== 'challenge30' || isPaused || isLoadingModel || challengeFinished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          sound.playCelebration();
          setChallengeFinished(true);
          return 0;
        }
        if (prev <= 4) {
          sound.playCountdownTick(prev === 1);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, isPaused, isLoadingModel, challengeFinished]);

  // Finish challenge session when timer reaches 0
  useEffect(() => {
    if (challengeFinished && mode === 'challenge30') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      const bonus = reps >= 30 ? 300 : 0;
      const totalPoints = points + bonus;

      const record = recordSession({
        exerciseId: exercise.id,
        mode: 'challenge30',
        reps,
        points: totalPoints,
        multiplier,
        date: new Date().toISOString().split('T')[0],
        durationSeconds: 30,
      });

      setTimeout(() => {
        onFinishSession(record);
      }, 1500);
    }
  }, [challengeFinished]);

  // Initialize camera and pose detection loop
  useEffect(() => {
    let detectorInstance: any = null;
    let isActive = true;

    async function setupCameraAndPose() {
      try {
        setIsLoadingModel(true);
        setCameraError(null);

        // 1. Camera Access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!isActive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => resolve(true);
            }
          });
          videoRef.current.play();
        }

        // 2. Initialize MoveNet
        detectorInstance = await initPoseDetector();
        setIsLoadingModel(false);

        // 3. Pose Loop
        const detectLoop = async () => {
          if (!isActive) return;

          if (
            videoRef.current &&
            canvasRef.current &&
            videoRef.current.readyState >= 2 &&
            !isPaused &&
            !challengeFinished
          ) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;

              // Clear previous skeleton overlay
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              try {
                const poses = await detectorInstance.estimatePoses(video, {
                  maxPoses: 1,
                  flipHorizontal: false,
                });

                if (poses && poses.length > 0) {
                  const keypoints = poses[0].keypoints;
                  renderPoseOnCanvas(ctx, keypoints, 0.4);

                  // Process with Exercise State Machine
                  const result = engineRef.current.processFrame(keypoints);

                  setFeedback({
                    message: result.feedback.message,
                    type: result.feedback.type,
                    progress: result.feedback.progressPercent,
                  });

                  if (result.repCompleted) {
                    setReps(result.reps);
                    const repPoints = (mode === 'challenge30' ? 20 : 10) * multiplier;
                    setPoints((p) => Math.round(p + repPoints));

                    // Audio & Visual celebratory triggers
                    sound.playRepSuccess();
                    setRepFlash(true);
                    setShowPlusOne(true);
                    setTimeout(() => setRepFlash(false), 300);
                    setTimeout(() => setShowPlusOne(false), 800);
                  }
                }
              } catch (err) {
                console.error('Pose estimation error', err);
              }
            }
          }

          reqAnimationRef.current = requestAnimationFrame(detectLoop);
        };

        reqAnimationRef.current = requestAnimationFrame(detectLoop);
      } catch (err: any) {
        console.error('Camera/TF error:', err);
        setCameraError(err.message || 'Unable to access camera or load pose detector.');
        setIsLoadingModel(false);
      }
    }

    setupCameraAndPose();

    return () => {
      isActive = false;
      if (reqAnimationRef.current) cancelAnimationFrame(reqAnimationRef.current);
    };
  }, [exercise.id, isPaused, challengeFinished]);

  const handleFinishFreePlay = () => {
    const elapsedSec = Math.round((Date.now() - startTimeRef.current) / 1000);
    const record = recordSession({
      exerciseId: exercise.id,
      mode: 'freeplay',
      reps,
      points,
      multiplier,
      date: new Date().toISOString().split('T')[0],
      durationSeconds: Math.max(1, elapsedSec),
    });
    onFinishSession(record);
  };

  const handleResetSession = () => {
    engineRef.current.reset();
    setReps(0);
    setPoints(0);
    setTimeLeft(mode === 'challenge30' ? 30 : 0);
    setChallengeFinished(false);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white flex flex-col select-none">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900/90 backdrop-blur border-b border-slate-800 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToMenu}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition flex items-center gap-1.5"
            title="Return to Menu"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Exit</span>
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {exercise.name}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold uppercase">
                {mode === 'challenge30' ? '30s Challenge' : 'Free Play'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">{exercise.repDefinition}</p>
          </div>
        </div>

        {/* Center / Right Metrics */}
        <div className="flex items-center gap-6">
          {mode === 'challenge30' && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Timer</span>
              <span
                className={`text-2xl font-black font-mono ${
                  timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-amber-300'
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-xl">
            <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
            <span className="text-sm font-bold text-orange-400">
              {userProfile.currentStreak}d ({multiplier}x)
            </span>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{points} pts</span>
          </div>

          <button
            onClick={() => setMuted(!muted)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            {muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Video & Pose Canvas Arena */}
      <div className="flex-1 relative flex items-center justify-center p-4 bg-slate-950 overflow-hidden">
        {/* Fullscreen rep flash overlay */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-200 z-10 ${
            repFlash ? 'bg-emerald-500/25' : 'bg-transparent'
          }`}
        />

        {/* Video & Canvas Container */}
        <div className="relative rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-black max-w-4xl w-full aspect-[4/3] flex items-center justify-center">
          {/* Loading Indicator */}
          {isLoadingModel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-30 gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-200 font-medium tracking-wide">
                Loading MoveNet Neural Detector & Camera...
              </p>
              <p className="text-xs text-slate-400">All processing is 100% private and runs locally in your browser.</p>
            </div>
          )}

          {/* Camera Error Modal */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-30 p-8 text-center max-w-md mx-auto">
              <AlertCircle className="w-14 h-14 text-rose-500 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Camera Access Required</h3>
              <p className="text-sm text-slate-300 mb-6">{cameraError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold transition"
              >
                Retry Camera
              </button>
            </div>
          )}

          {/* Real-time Video Stream */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />

          {/* Skeleton Canvas Overlay */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
          />

          {/* Top-Right Corner Small Pose Silhouette Outline Guide */}
          <div className="absolute top-4 right-4 z-20">
            <PoseSilhouetteGuide
              exerciseId={exercise.id}
              orientation={exercise.orientation}
            />
          </div>

          {/* Live Big Rep Display & +1 Popup */}
          <div className="absolute top-6 left-6 z-20 flex flex-col items-start">
            <div className="bg-slate-900/85 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-700/80 shadow-lg flex items-baseline gap-3">
              <span className="text-5xl font-black font-mono text-emerald-400 drop-shadow-md">
                {reps}
              </span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">REPS</span>
            </div>

            {showPlusOne && (
              <div className="text-3xl font-black text-emerald-400 animate-bounce mt-2 font-mono drop-shadow-[0_4px_10px_rgba(16,185,129,0.8)]">
                +1 REP!
              </div>
            )}
          </div>

          {/* Real-time Rep Meter & Form Guidance Banner */}
          <div className="absolute bottom-6 inset-x-6 z-20 flex flex-col gap-2 max-w-md mx-auto">
            {/* Rep Meter Progress Bar */}
            <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-full h-3 overflow-hidden border border-slate-700/60 p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-green-500 rounded-full transition-all duration-150 ease-out"
                style={{ width: `${feedback.progress}%` }}
              />
            </div>

            {/* Dynamic Form Guidance */}
            <div
              className={`px-4 py-2.5 rounded-xl backdrop-blur-md text-center text-sm font-semibold transition-all border shadow-lg ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/85 text-emerald-200 border-emerald-500/50'
                  : feedback.type === 'warning'
                  ? 'bg-rose-950/85 text-rose-200 border-rose-500/50'
                  : feedback.type === 'info'
                  ? 'bg-blue-950/85 text-blue-200 border-blue-500/50'
                  : 'bg-slate-900/85 text-slate-200 border-slate-700/60'
              }`}
            >
              {feedback.message}
            </div>
          </div>
        </div>
      </div>

      {/* Control Footer */}
      <footer className="px-6 py-4 bg-slate-900/90 backdrop-blur border-t border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition text-sm"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={handleResetSession}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition text-sm"
            title="Reset Session Reps"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        <div>
          {mode === 'freeplay' ? (
            <button
              onClick={handleFinishFreePlay}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/30 text-sm"
            >
              Finish & Save Session
            </button>
          ) : (
            <button
              onClick={() => setChallengeFinished(true)}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-lg shadow-rose-600/30 text-sm"
            >
              End Challenge Early
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

