/** Ett landemerke i pikselkoordinater (x mot høyre, y nedover). */
export type Point = { x: number; y: number; visibility: number }

/** t = sekunder i videoen. points = 33 MediaPipe-landemerker, eller null hvis ingen person ble funnet. */
export type PoseFrame = { t: number; points: Point[] | null }

export type PoseSequence = { fps: number; width: number; height: number; frames: PoseFrame[] }
