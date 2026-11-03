import { Keypoint, KeypointMap, calculateAngle, calculateDistance, keypointsToMap } from './detector';
import { ExerciseId, DifficultyLevel, FormFeedback } from '../types';

export interface ExerciseCounterState {
  stage: 'idle' | 'up' | 'down' | 'extended' | 'hold';
  reps: number;
  lastRepTimestamp: number;
  holdStartTime: number | null;
  formFeedback: FormFeedback;
}

export interface RepCounterResult {
  reps: number;
  repCompleted: boolean;
  feedback: FormFeedback;
}

export class ExerciseEngine {
  private exerciseId: ExerciseId;
  private difficulty: DifficultyLevel;
  private state: ExerciseCounterState;
  private confidenceThreshold: number;

  constructor(exerciseId: ExerciseId, difficulty: DifficultyLevel = 'intermediate') {
    this.exerciseId = exerciseId;
    this.difficulty = difficulty;
    this.confidenceThreshold = difficulty === 'beginner' ? 0.4 : difficulty === 'advanced' ? 0.6 : 0.5;

    this.state = {
      stage: 'idle',
      reps: 0,
      lastRepTimestamp: 0,
      holdStartTime: null,
      formFeedback: {
        type: 'neutral',
        message: 'Get in position',
        progressPercent: 0,
      },
    };
  }

  public setDifficulty(difficulty: DifficultyLevel) {
    this.difficulty = difficulty;
    this.confidenceThreshold = difficulty === 'beginner' ? 0.4 : difficulty === 'advanced' ? 0.6 : 0.5;
  }

  public reset() {
    this.state = {
      stage: 'idle',
      reps: 0,
      lastRepTimestamp: 0,
      holdStartTime: null,
      formFeedback: {
        type: 'neutral',
        message: 'Get in position',
        progressPercent: 0,
      },
    };
  }

  public processFrame(keypoints: Keypoint[]): RepCounterResult {
    const map = keypointsToMap(keypoints);
    let repCompleted = false;

    switch (this.exerciseId) {
      case 'squats':
        repCompleted = this.processSquats(map);
        break;
      case 'pushups':
        repCompleted = this.processPushups(map);
        break;
      case 'jumping_jacks':
        repCompleted = this.processJumpingJacks(map);
        break;
      case 'lunges':
        repCompleted = this.processLunges(map);
        break;
      case 'burpees':
        repCompleted = this.processBurpees(map);
        break;
      case 'tricep_dips':
        repCompleted = this.processTricepDips(map);
        break;
      case 'high_knees':
        repCompleted = this.processHighKnees(map);
        break;
      case 'plank_hold':
        repCompleted = this.processPlankHold(map);
        break;
      case 'bicycle_crunches':
        repCompleted = this.processBicycleCrunches(map);
        break;
      case 'shoulder_presses':
        repCompleted = this.processShoulderPresses(map);
        break;
      default:
        break;
    }

    return {
      reps: this.state.reps,
      repCompleted,
      feedback: this.state.formFeedback,
    };
  }

  // SQUATS: Knee angle (hip -> knee -> ankle)
  // Standing: ~165-180°, Squat bottom: <= 95°
  private processSquats(map: KeypointMap): boolean {
    const { left_hip, left_knee, left_ankle, right_hip, right_knee, right_ankle } = map;
    if (!left_knee || !right_knee) return false;

    // Use side with higher confidence
    const leftConf = (left_hip?.score ?? 0) + (left_knee.score ?? 0) + (left_ankle?.score ?? 0);
    const rightConf = (right_hip?.score ?? 0) + (right_knee.score ?? 0) + (right_ankle?.score ?? 0);
    const side = leftConf >= rightConf ? 'left' : 'right';

    const hip = side === 'left' ? left_hip : right_hip;
    const knee = side === 'left' ? left_knee : right_knee;
    const ankle = side === 'left' ? left_ankle : right_ankle;

    if (!hip || !knee || !ankle || knee.score! < this.confidenceThreshold) {
      this.state.formFeedback = {
        type: 'warning',
        message: 'Step back to frame your legs and hips',
        progressPercent: 0,
      };
      return false;
    }

    const kneeAngle = calculateAngle(hip, knee, ankle);

    // Progress percentage: 170 deg is 0%, 90 deg is 100%
    const progress = Math.min(100, Math.max(0, Math.round(((170 - kneeAngle) / (170 - 90)) * 100)));

    if (kneeAngle > 155) {
      if (this.state.stage === 'down') {
        // Valid rep completed!
        this.state.stage = 'up';
        this.state.reps += 1;
        this.state.formFeedback = {
          type: 'success',
          message: 'Great Squat! Push up again!',
          progressPercent: 100,
        };
        return true;
      }
      this.state.stage = 'up';
      this.state.formFeedback = {
        type: 'neutral',
        message: 'Lower into a squat (~90°)',
        progressPercent: progress,
      };
    } else if (kneeAngle <= 95) {
      this.state.stage = 'down';
      this.state.formFeedback = {
        type: 'info',
        message: 'Good depth! Now push back up',
        progressPercent: 100,
      };
    } else {
      this.state.formFeedback = {
        type: 'neutral',
        message: this.state.stage === 'down' ? 'Push back up!' : 'Lowering down...',
        progressPercent: progress,
      };
    }
    return false;
  }

  // PUSH-UPS: Elbow angle (shoulder -> elbow -> wrist) with sideways form check
  // Up/Plank: > 150°, Down: <= 95°
  private processPushups(map: KeypointMap): boolean {
    const { left_shoulder, left_elbow, left_wrist, right_shoulder, right_elbow, right_wrist, left_hip, right_hip } = map;
    const leftConf = (left_shoulder?.score ?? 0) + (left_elbow?.score ?? 0) + (left_wrist?.score ?? 0);
    const rightConf = (right_shoulder?.score ?? 0) + (right_elbow?.score ?? 0) + (right_wrist?.score ?? 0);
    const side = leftConf >= rightConf ? 'left' : 'right';

    const shoulder = side === 'left' ? left_shoulder : right_shoulder;
    const elbow = side === 'left' ? left_elbow : right_elbow;
    const wrist = side === 'left' ? left_wrist : right_wrist;
    const hip = side === 'left' ? (left_hip || right_hip) : (right_hip || left_hip);

    if (!shoulder || !elbow || !wrist || (elbow.score ?? 0) < this.confidenceThreshold * 0.75) {
      this.state.formFeedback = {
        type: 'warning',
        message: 'Turn sideways to camera with arms & chest visible',
        progressPercent: 0,
      };
      return false;
    }

    // Sideways check: in sideways view, shoulder and hip are spaced horizontally
    if (hip && (hip.score ?? 0) > 0.35) {
      const horizontalSpan = Math.abs(shoulder.x - hip.x);
      if (horizontalSpan < 35) {
        this.state.formFeedback = {
          type: 'warning',
          message: 'Turn sideways so your full body profile is visible',
          progressPercent: 15,
        };
      }
    }

    const elbowAngle = calculateAngle(shoulder, elbow, wrist);
    const progress = Math.min(100, Math.max(0, Math.round(((160 - elbowAngle) / (160 - 90)) * 100)));

    if (elbowAngle > 148) {
      if (this.state.stage === 'down') {
        this.state.stage = 'up';
        this.state.reps += 1;
        this.state.formFeedback = {
          type: 'success',
          message: 'Solid Push-Up! Keep pressing!',
          progressPercent: 100,
        };
        return true;
      }
      this.state.stage = 'up';
      this.state.formFeedback = {
        type: 'neutral',
        message: 'Lower your chest down to 90°',
        progressPercent: progress,
      };
    } else if (elbowAngle <= 95) {
      this.state.stage = 'down';
      this.state.formFeedback = {
        type: 'info',
        message: 'Great depth! Push the floor away',
        progressPercent: 100,
      };
    } else {
      this.state.formFeedback = {
        type: 'neutral',
        message: this.state.stage === 'down' ? 'Pushing back up...' : 'Lowering chest down...',
        progressPercent: progress,
      };
    }
    return false;
  }

  // JUMPING JACKS: Arms overhead (wrist above shoulder) + feet distance
  private processJumpingJacks(map: KeypointMap): boolean {
    const { left_shoulder, right_shoulder, left_wrist, right_wrist, left_ankle, right_ankle } = map;

    if (!left_shoulder || !right_shoulder || !left_wrist || !right_wrist) {
      this.state.formFeedback = {
        type: 'warning',
        message: 'Stand back so full upper body is visible',
        progressPercent: 0,
      };
      return false;
    }

    // Arms overhead check: wrists higher than shoulders (in canvas y is inverted)
    const armsOverhead = left_wrist.y < left_shoulder.y && right_wrist.y < right_shoulder.y;

    // Check leg spread if ankles are visible
    const shoulderWidth = Math.abs(left_shoulder.x - right_shoulder.x) || 1;
    let legsApart = false;
    if (left_ankle && right_ankle && left_ankle.score! > 0.3 && right_ankle.score! > 0.3) {
      const ankleDist = Math.abs(left_ankle.x - right_ankle.x);
      legsApart = ankleDist > shoulderWidth * 1.35;
    } else {
      // fallback to wrists distance
      legsApart = Math.abs(left_wrist.x - right_wrist.x) < shoulderWidth * 2;
    }

    if (armsOverhead && legsApart) {
      this.state.stage = 'extended';
      this.state.formFeedback = {
        type: 'info',
        message: 'Jump back together!',
        progressPercent: 100,
      };
    } else if (left_wrist.y > left_shoulder.y && right_wrist.y > right_shoulder.y) {
      if (this.state.stage === 'extended') {
        this.state.stage = 'idle';
        this.state.reps += 1;
        this.state.formFeedback = {
          type: 'success',
          message: 'Rep! Keep the rhythm!',
          progressPercent: 100,
        };
        return true;
      }
      this.state.stage = 'idle';
      this.state.formFeedback = {
        type: 'neutral',
        message: 'Jump & clap overhead!',
        progressPercent: 0,
      };
    }
    return false;
  }

  // LUNGES: Knee angle on the descending front leg (profile / sideways view)
  private processLunges(map: KeypointMap): boolean {
    const { left_hip, left_knee, left_ankle, right_hip, right_knee, right_ankle, left_shoulder, right_shoulder } = map;
    if (!left_knee || !right_knee || (!left_hip && !right_hip)) {
      this.state.formFeedback = {
        type: 'warning',
        message: 'Turn sideways so both legs and hips are visible',
        progressPercent: 0,
      };
      return false;
    }

    const hipL = left_hip || right_hip;
    const hipR = right_hip || left_hip;

    // Check knee angles for both legs
    const leftKneeAngle = hipL && left_knee ? calculateAngle(hipL, left_knee, left_ankle || left_knee) : 180;
    const rightKneeAngle = hipR && right_knee ? calculateAngle(hipR, right_knee, right_ankle || right_knee) : 180;

    const minKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
    const progress = Math.min(100, Math.max(0, Math.round(((165 - minKneeAngle) / (165 - 90)) * 100)));

    // Sideways orientation warning
    const shoulder = left_shoulder || right_shoulder;
    if (shoulder && hipL) {
      const kneeXDist = Math.abs(left_knee.x - right_knee.x);
      // In a good side lunge, the two knees or feet have clear horizontal separation
      if (kneeXDist < 25 && minKneeAngle > 140) {
        this.state.formFeedback = {
          type: 'warning',
          message: 'Turn sideways to camera and take a split stance',
          progressPercent: 10,
        };
      }
    }

    if (minKneeAngle > 150) {
      if (this.state.stage === 'down') {
        this.state.stage = 'up';
        this.state.reps += 1;
        this.state.formFeedback = {
          type: 'success',
          message: 'Solid lunge! Step up and repeat!',
          progressPercent: 100,
        };
        return true;
      }
      this.state.stage = 'up';
      this.state.formFeedback = {
        type: 'neutral',
        message: 'Lower into a 90° split lunge',
        progressPercent: progress,
      };
    } else if (minKneeAngle <= 102) {
      this.state.stage = 'down';
      this.state.formFeedback = {
        type: 'info',
        message: 'Great lunge depth! Drive back up',
        progressPercent: 100,
      };
    } else {
      this.state.formFeedback = {
        type: 'neutral',
        message: this.state.stage === 'down' ? 'Pushing up...' : 'Lowering down into lunge...',
        progressPercent: progress,
      };
    }
    return false;
  }

  // BURPEES: Transition Squat/Ground -> Stand/Jump
  private processBurpees(map: KeypointMap): boolean {
    const { nose, left_hip, right_hip } = map;
    if (!nose || !left_hip) return false;

    // Detect when user drops low (nose and hips low in frame or horizontal)
    const isDown = nose.y > 280 || (map.left_shoulder && map.left_shoulder.y > 280);
    const isUp = nose.y < 160;

    if (isDown) {
      this.state.stage = 'down';
      this.state.formFeedback = {
        type: 'info',
        message: 'Jump back up with hands overhead!',
        progressPercent: 60,
      };
    } else if (isUp && this.state.stage === 'down') {
      this.state.stage = 'up';
      this.state.reps += 1;
      this.state.formFeedback = {
        type: 'success',
        message: 'Awesome Burpee!',
        progressPercent: 100,
      };
      return true;
    }
    return false;
  }

  // TRICEP DIPS: Elbow angle flex/extension
  private processTricepDips(map: KeypointMap): boolean {
    const { left_shoulder, left_elbow, left_wrist, right_shoulder, right_elbow, right_wrist } = map;
    const shoulder = (left_shoulder?.score ?? 0) > (right_shoulder?.score ?? 0) ? left_shoulder : right_shoulder;
    const elbow = (left_elbow?.score ?? 0) > (right_elbow?.score ?? 0) ? left_elbow : right_elbow;
    const wrist = (left_wrist?.score ?? 0) > (right_wrist?.score ?? 0) ? left_wrist : right_wrist;

    if (!shoulder || !elbow || !wrist) return false;
    const angle = calculateAngle(shoulder, elbow, wrist);

    if (angle > 150) {
      if (this.state.stage === 'down') {
        this.state.stage = 'up';
        this.state.reps += 1;
        this.state.formFeedback = {
          type: 'success',
          message: 'Full tricep extension!',
          progressPercent: 100,
        };
        return true;
      }
      this.state.stage = 'up';
    } else if (angle <= 100) {
      this.state.stage = 'down';
      this.state.formFeedback = {
        type: 'info',
        message: 'Press through palms to extend arms',
        progressPercent: 100,
      };
    }
    return false;
  }

  // HIGH KNEES: Knee lifted above hip line
  private processHighKnees(map: KeypointMap): boolean {
    const { left_hip, left_knee, right_hip, right_knee } = map;
    if (!left_hip || !left_knee || !right_hip || !right_knee) return false;

    // A high knee occurs when knee.y is close to or higher than hip.y
    const leftLifted = left_knee.y < left_hip.y + 40;
    const rightLifted = right_knee.y < right_hip.y + 40;

    if (leftLifted || rightLifted) {
      if (this.state.stage !== 'down') {
        this.state.stage = 'down';
        this.state.reps += 1;
        this.state.formFeedback = {
          type: 'success',
          message: 'High Knee hit!',
          progressPercent: 100,
        };
        return true;
      }
    } else {
      this.state.stage = 'up';
      this.state.formFeedback = {
        type: 'neutral',
        message: 'Drive knees up high!',
        progressPercent: 30,
      };
    }
    return false;
  }

  // PLANK HOLD: Hold straight line shoulder -> hip -> knee/ankle in sideways orientation
  // Every 3 seconds in proper form adds 1 "rep"
  private processPlankHold(map: KeypointMap): boolean {
    const {
      left_shoulder,
      right_shoulder,
      left_hip,
      right_hip,
      left_knee,
      right_knee,
      left_ankle,
      right_ankle,
      left_wrist,
      right_wrist,
      left_elbow,
      right_elbow,
    } = map;

    // Pick best visible side or combination
    const shoulder = (left_shoulder?.score ?? 0) >= (right_shoulder?.score ?? 0) ? left_shoulder : right_shoulder;
    const hip = (left_hip?.score ?? 0) >= (right_hip?.score ?? 0) ? left_hip : right_hip;
    const legEnd =
      ((left_ankle?.score ?? 0) > 0.35 ? left_ankle : null) ||
      ((right_ankle?.score ?? 0) > 0.35 ? right_ankle : null) ||
      ((left_knee?.score ?? 0) > 0.35 ? left_knee : null) ||
      ((right_knee?.score ?? 0) > 0.35 ? right_knee : null);

    if (!shoulder || !hip || (shoulder.score ?? 0) < 0.3 || (hip.score ?? 0) < 0.3) {
      this.state.formFeedback = {
        type: 'warning',
        message: 'Turn sideways: keep shoulders and hips visible',
        progressPercent: 0,
      };
      this.state.holdStartTime = null;
      return false;
    }

    // Sideways verification: horizontal distance between shoulder and hip must be significant
    const horizontalSpan = Math.abs(shoulder.x - hip.x);
    const verticalSpan = Math.abs(shoulder.y - hip.y);

    if (horizontalSpan < 45 && verticalSpan > 50) {
      this.state.formFeedback = {
        type: 'warning',
        message: 'Turn sideways to the camera and get into plank position',
        progressPercent: 10,
      };
      this.state.holdStartTime = null;
      return false;
    }

    // If leg end (ankle/knee) is visible, measure straight body line angle
    let isStraight = false;
    let bodyAngle = 180;

    if (legEnd) {
      bodyAngle = calculateAngle(shoulder, hip, legEnd);
      // Plank body angle typically ~150° to 210°
      isStraight = bodyAngle >= 145 && bodyAngle <= 215;
    } else {
      // If legs are slightly out of frame or obscured on floor, verify torso horizontal flatness
      // Torso in plank is roughly horizontal (shoulder.y and hip.y within reasonable delta)
      const torsoAngle = Math.abs(shoulder.y - hip.y) / (horizontalSpan || 1);
      isStraight = torsoAngle < 0.7; // slope is relatively low
    }

    if (isStraight) {
      const now = Date.now();
      if (!this.state.holdStartTime) {
        this.state.holdStartTime = now;
      }
      const elapsedSec = (now - this.state.holdStartTime) / 1000;
      const progress = Math.min(100, Math.round(((elapsedSec % 3) / 3) * 100));

      if (elapsedSec >= 3) {
        this.state.reps += 1;
        this.state.holdStartTime = now; // reset interval for next 3 seconds
        this.state.formFeedback = {
          type: 'success',
          message: 'Solid Plank! Hold it steady!',
          progressPercent: 100,
        };
        return true;
      }

      this.state.formFeedback = {
        type: 'info',
        message: `Holding strong (${elapsedSec.toFixed(1)}s / 3.0s)`,
        progressPercent: progress,
      };
    } else {
      this.state.holdStartTime = null;
      if (legEnd && bodyAngle < 145) {
        this.state.formFeedback = {
          type: 'warning',
          message: "Don't sag hips! Squeeze glutes and core",
          progressPercent: 20,
        };
      } else if (legEnd && bodyAngle > 215) {
        this.state.formFeedback = {
          type: 'warning',
          message: 'Hips too high! Lower hips to a straight line',
          progressPercent: 20,
        };
      } else {
        this.state.formFeedback = {
          type: 'warning',
          message: 'Hold a straight line from shoulders to heels',
          progressPercent: 0,
        };
      }
    }
    return false;
  }

  // BICYCLE CRUNCHES: Alternating elbow to opposite knee
  private processBicycleCrunches(map: KeypointMap): boolean {
    const { left_elbow, right_knee, right_elbow, left_knee } = map;
    if (!left_elbow || !right_knee || !right_elbow || !left_knee) return false;

    const dist1 = calculateDistance(left_elbow, right_knee);
    const dist2 = calculateDistance(right_elbow, left_knee);
    const isCrossed = dist1 < 85 || dist2 < 85;

    if (isCrossed) {
      if (this.state.stage !== 'down') {
        this.state.stage = 'down';
        this.state.reps += 1;
        this.state.formFeedback = {
          type: 'success',
          message: 'Crunch connection!',
          progressPercent: 100,
        };
        return true;
      }
    } else if (dist1 > 140 && dist2 > 140) {
      this.state.stage = 'up';
      this.state.formFeedback = {
        type: 'neutral',
        message: 'Rotate elbow to opposite knee',
        progressPercent: 40,
      };
    }
    return false;
  }

  // SHOULDER PRESSES: Overhead arm press (elbow angle + wrist height above shoulder)
  private processShoulderPresses(map: KeypointMap): boolean {
    const { left_shoulder, left_elbow, left_wrist, right_shoulder, right_elbow, right_wrist } = map;
    if (!left_shoulder || !left_elbow || !left_wrist) return false;

    const angle = calculateAngle(left_shoulder, left_elbow, left_wrist);
    const overhead = left_wrist.y < left_shoulder.y;

    const progress = Math.min(100, Math.max(0, Math.round(((angle - 85) / (165 - 85)) * 100)));

    if (overhead && angle > 155) {
      if (this.state.stage === 'down') {
        this.state.stage = 'up';
        this.state.reps += 1;
        this.state.formFeedback = {
          type: 'success',
          message: 'Full lockout! Lower to shoulders',
          progressPercent: 100,
        };
        return true;
      }
      this.state.stage = 'up';
    } else if (angle <= 95) {
      this.state.stage = 'down';
      this.state.formFeedback = {
        type: 'info',
        message: 'Press straight overhead!',
        progressPercent: 10,
      };
    } else {
      this.state.formFeedback = {
        type: 'neutral',
        message: this.state.stage === 'down' ? 'Pressing up...' : 'Lowering down...',
        progressPercent: progress,
      };
    }
    return false;
  }
}

