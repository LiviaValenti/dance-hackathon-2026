/** One landmark in pixel coordinates (x to the right, y downwards). */
export type Point = { x: number; y: number; visibility: number }

/** t = seconds in the video. points = 33 MediaPipe landmarks, or null if no person was found. */
export type PoseFrame = { t: number; points: Point[] | null }

export type PoseSequence = { fps: number; width: number; height: number; frames: PoseFrame[] }
