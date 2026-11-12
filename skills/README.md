# Skills

Agent skills shared by the team. Copied from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT, see [LICENSE](LICENSE)) at commit `4ae2317`.

| Skill | Invoke | What it does |
|---|---|---|
| `grill-with-docs` | `/grill-with-docs` | Interviews you about a plan and records decisions as it goes: terms in `GLOSSARY.md`, hard-to-reverse choices as ADRs in `docs/adr/`. ([about](https://www.aihero.dev/skills-grill-with-docs)) |
| `grill-me` | `/grill-me` | The same interview, without writing docs |
| `grilling` | used by both above | The interview itself: rounds of numbered questions, each with a recommended answer |
| `domain-modeling` | used by `grill-with-docs` | Keeps the glossary and ADRs |

`grill-with-docs` and `grill-me` only hand off to `grilling` and `domain-modeling`, so keep all four together.

## Using them

- **Claude Code:** open this repo and they're available automatically (`.claude/skills` links to this folder).
- **Other agents / global install:** copy or symlink the skill folders into your agent's skills directory, e.g. `ln -s "$PWD/skills/grill-with-docs" ~/.claude/skills/`.
