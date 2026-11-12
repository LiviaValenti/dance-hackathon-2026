# Fixed rules change the Plan; the Coach only phrases the feedback

After each Attempt, deterministic rules on the Score decide the next step in the Plan (move on, repeat, repeat slower, suggest an easier Choreography). The Coach (an LLM behind the coach server) receives that decision plus the weakest body areas and writes the feedback in the Mascot's voice. Without the coach server, a built-in text is used and the Plan still advances.

We chose this over letting the LLM decide because the Plan must behave the same every time (testable, safe on stage, works offline), and because of a constraint not visible in the code: claims to prevent, predict or diagnose injury can make the product a medical device under the EU MDR (applies in Norway through the EEA). Aches from onboarding therefore only steer which moves the rules pick. The Coach may encourage care ("take it easy on your knee") but never diagnoses or promises injury prevention.
