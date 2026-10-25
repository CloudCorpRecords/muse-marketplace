# Avatar modes

When Muse shares an avatar, the sharing pop-up previews the avatar's **modes** — the same character, animated, in the states an agent actually passes through. A marketplace avatar is a *set* of mode assets, one character, many states.

## Required modes (every avatar)

| Mode | Meaning | Preview cue |
|---|---|---|
| `idle` | Present, waiting, available | Calm expression, gentle breathing/bob |
| `working` | Actively doing a task | Focused expression; laptop/tool prop; the mode from the Muse sharing announcement |
| `thinking` | Reasoning, deciding, reading | Eyes up or narrowed; question/lightbulb prop |
| `celebrating` | A win landed — shipped, solved, booked | Big smile; confetti/stars/sparkles |

## Optional modes

| Mode | Meaning |
|---|---|
| `making` | Building something new (vs. executing a known task) |
| `milestone` | A bigger landmark — launch day, a goal hit |
| `dance` | Pure play. Every avatar deserves one. |
| `error` | Something failed; the avatar owns it honestly |

## Authoring rules

- Same character across all modes — same silhouette, palette, and signature accessory; only expression, props, and motion change.
- One asset file per mode, listed both in `modes[]` and `files[]` (see SPEC.md).
- `loop: true` for ambient modes (idle/working/thinking). One-shot-flavored modes may set `loop: false`; the site preview loops regardless so people can actually see it.
- SVG animation should be self-contained (SMIL or CSS inside the file), subtle enough to sit next to a chat, and must not flash faster than 3 times per second.
- Keep each mode asset small (target < 50 KB) — avatars render in lists, pop-ups, and chat chrome, not billboards.
