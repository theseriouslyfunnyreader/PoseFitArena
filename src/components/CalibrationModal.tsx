import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { initPoseDetector, renderPoseOnCanvas } from '../pose/detector';
import { ExerciseConfig } from '../types';
import { PoseSilhouetteGuide } from './PoseSilhouetteGuide';

interface CalibrationModalProps {
  exercise: ExerciseConfig;
  onComplete: () => void;
  onCancel: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({ exercise, onComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [poseDetected, setPoseDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detector: any = null;
    let animId: number | null = null;
    let active = true;

    async function init() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((r) => {
            if (videoRef.current) videoRef.current.onloadedmetadata = () => r(true);
          });
          videoRef.current.play();
        }

        detector = await initPoseDetector();
        setLoading(false);

        const checkLoop = async () => {
          if (!active) return;
          if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

              const poses = await detector.estimatePoses(videoRef.current);
              if (poses && poses.length > 0 && poses[0].keypoints) {
                renderPoseOnCanvas(ctx, poses[0].keypoints, 0.4);
                // check if key joints like shoulders/hips/knees are in frame
                const validJoints = poses[0].keypoints.filter(
                  (k: any) => (k.score ?? 0) > 0.45
                ).length;

                if (validJoints >= 8) {
                  setPoseDetected(true);
                } else {
                  setPoseDetected(false);
                }
              } else {
                setPoseDetected(false);
              }
            }
          }
          animId = requestAnimationFrame(checkLoop);
        };

        animId = requestAnimationFrame(checkLoop);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }

    init();

    return () => {
      active = false;
      if (animId) cancelAnimationFrame(animId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 3-second hold countdown once pose is detected
  useEffect(() => {
    let timer: any = null;
    if (poseDetected) {
      setCountdown(3);
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c === null || c <= 1) {
            clearInterval(timer);
            onComplete();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      setCountdown(null);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [poseDetected, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Pose Calibration</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded"
          >
            Skip
          </button>
        </div>

        <p className="text-sm text-slate-300 mb-4 text-center">
          {exercise.orientation === 'side'
            ? `Turn SIDEWAYS to the camera so your full profile is visible for ${exercise.name}.`
            : `Face directly towards the camera so your full body is visible for ${exercise.name}.`}
        </p>

        <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-800 mb-4 flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Calibrating webcam...</span>
            </div>
          )}

          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
          />

          {/* Outline Silhouette Guide in Corner */}
          <div className="absolute top-3 right-3 z-20">
            <PoseSilhouetteGuide
              exerciseId={exercise.id}
              orientation={exercise.orientation}
            />
          </div>

          {/* Guide Overlay Box */}
          <div className="absolute inset-6 border-2 border-dashed border-emerald-500/40 rounded-xl pointer-events-none flex items-center justify-center">
            {countdown !== null && countdown > 0 && (
              <div className="bg-emerald-600/90 text-white font-black text-6xl w-24 h-24 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                {countdown}
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 text-sm font-semibold mb-6">
          {poseDetected ? (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
              <span>Full pose detected! Hold still...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
              <span>Adjust your position to fit inside the frame</span>
            </div>
          )}
        </div>

        <div className="flex w-full gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onComplete}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm"
          >
            <span>Proceed to Arena</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

