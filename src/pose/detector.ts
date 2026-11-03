import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';

let detector: poseDetection.PoseDetector | null = null;
let isInitializing = false;

export async function initPoseDetector(): Promise<poseDetection.PoseDetector> {
  if (detector) {
    return detector;
  }

  if (isInitializing) {
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (detector) return detector;
  }

  isInitializing = true;
  try {
    await tf.ready();
    await tf.setBackend('webgl');

    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      }
    );
    return detector;
  } finally {
    isInitializing = false;
  }
}

export type Keypoint = poseDetection.Keypoint;

// MoveNet Keypoint Index Map:
// 0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear
// 5: left_shoulder, 6: right_shoulder, 7: left_elbow, 8: right_elbow
// 9: left_wrist, 10: right_wrist, 11: left_hip, 12: right_hip
// 13: left_knee, 14: right_knee, 15: left_ankle, 16: right_ankle

export interface KeypointMap {
  [name: string]: Keypoint;
}

export function keypointsToMap(keypoints: Keypoint[]): KeypointMap {
  const map: KeypointMap = {};
  for (const kp of keypoints) {
    if (kp.name) {
      map[kp.name] = kp;
    }
  }
  return map;
}

// Calculate angle ABC between three 2D points in degrees
export function calculateAngle(a: Keypoint, b: Keypoint, c: Keypoint): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return angle;
}

// Euclidean distance between 2 keypoints
export function calculateDistance(a: Keypoint, b: Keypoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Skeleton Connections
export const SKELETON_PAIRS: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

export function renderPoseOnCanvas(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  minConfidence: number = 0.4
) {
  const map = keypointsToMap(keypoints);

  // Draw lines
  ctx.lineWidth = 4;
  for (const [partA, partB] of SKELETON_PAIRS) {
    const kpA = map[partA];
    const kpB = map[partB];

    if (kpA && kpB && (kpA.score ?? 0) >= minConfidence && (kpB.score ?? 0) >= minConfidence) {
      const avgScore = ((kpA.score ?? 0) + (kpB.score ?? 0)) / 2;
      ctx.strokeStyle = avgScore > 0.6 ? '#22c55e' : '#eab308'; // green or yellow
      ctx.beginPath();
      ctx.moveTo(kpA.x, kpA.y);
      ctx.lineTo(kpB.x, kpB.y);
      ctx.stroke();
    }
  }

  // Draw keypoint dots
  for (const kp of keypoints) {
    const score = kp.score ?? 0;
    if (score >= minConfidence) {
      ctx.fillStyle = score > 0.6 ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
}

