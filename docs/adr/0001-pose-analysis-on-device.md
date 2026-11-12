# Pose analysis runs on the device; video never leaves the phone

The merged app does all pose estimation, alignment and scoring in the browser (TypeScript, MediaPipe), as insured-gains and poc-dance already do. Video is never uploaded. A server may exist only for the AI coach, and it receives a compact summary (scores, faults, timestamps), never video or raw pose data.

We chose this over new-chapter's Python/FastAPI server pipeline because privacy is a core selling point (body video and pain/injury data are sensitive under GDPR), two of three codebases already work this way, and there is no analysis server to host. The cost: new-chapter's Python code (scoring, multi-person tracking, YOLO comparison) is not run in the app. It serves as the algorithm reference and lab, and the parts we need are ported to TypeScript.
