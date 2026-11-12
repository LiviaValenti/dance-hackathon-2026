/** One landmark (x to the right, y downwards), in pixels in a PoseSequence and normalised (0–1) before scaling. */
export type Point = { x: number; y: number; visibility: number }

/** t = seconds in the video. points = 33 MediaPipe landmarks, or null if no person was found. */
export type PoseFrame = { t: number; points: Point[] | null }

export type PoseSequence = { fps: number; width: number; height: number; frames: PoseFrame[] }
