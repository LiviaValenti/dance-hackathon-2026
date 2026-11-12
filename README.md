# Dance Hackathon 2026

Shared repo for our Hackathon 2026 dance projects. Each folder is one team member's repo, merged in with its full history via `git subtree`.

All new development happens in [`app/`](app/), the merged app built on insured-gains (see [docs/plan.md](docs/plan.md)). The four source folders below are frozen references.

| Folder | Source | What it is |
|---|---|---|
| `new-chapter/` | [Yan-MX/new-chapter](https://github.com/Yan-MX/new-chapter) | Mirror Dancer: AI dance scoring with stick-figure overlay |
| `insured-gains/` | [daudmohamed/insured-gains](https://github.com/daudmohamed/insured-gains) | AI dance coach prototype |
| `use-case-2-research/` | [LiviaValenti/use-case-2-research](https://github.com/LiviaValenti/use-case-2-research) | Concept, sketches and use case docs (community) |
| `poc-dance/` | [MonikaLu/poc-dance](https://github.com/MonikaLu/poc-dance) | MOVE / Dance studio lab: mobile browser demo (Vite, TypeScript, Three.js, MediaPipe) |

## Skills

[`skills/`](skills/) holds shared agent skills, starting with `/grill-with-docs` and `/grill-me`. In Claude Code they load automatically when you open this repo.

## Pulling updates from the source repos

```bash
./sync.sh               # sync every folder
./sync.sh new-chapter   # sync one folder
```

This runs `git subtree pull` against each source repo and creates a merge commit. Push afterwards with `git push`.
Commit your own changes to a folder in a separate commit from other folders, so they can be pushed back upstream later with `git subtree push` if needed.
