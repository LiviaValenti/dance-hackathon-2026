# One `app/` folder, built on insured-gains; the original repos are frozen

The merged application lives in a new top-level `app/`, started as a copy of insured-gains (React + Vite web app, plus the coach server). All new development happens there, in this shared repo. The four original folders (`insured-gains/`, `poc-dance/`, `new-chapter/`, `use-case-2-research/`) are frozen references: nobody develops in the source repos any more, and `sync.sh` only picks up leftover changes.

insured-gains was chosen as the base because it has the most complete use case 1 flow, a cleanly split, tested `analysis/` layer and the coach server, and React makes the community and onboarding screens easier. poc-dance features (lesson plan, person selection, 3D figure, recordings) and new-chapter algorithms are ported into `app/` as modules. We rejected developing in four repos and copying between them, because the copies drift apart within a day.
