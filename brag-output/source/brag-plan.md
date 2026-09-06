# Brag Plan: IdxBeaver

## What is this app?
A Chrome DevTools extension that turns browser storage (IndexedDB, LocalStorage, SessionStorage, Cookies, Cache Storage) into a real database client: dense grid, MongoDB-style queries with index-aware plans, row inspector, schema inference, import/export.

## The angle
Chrome already ships an Application panel. It is an afterthought: no filtering, no schema awareness, no query history, no exports that survive a refresh. IdxBeaver sits one tab over in the same DevTools window and behaves like TablePlus. The whole video is real footage captured from the live extension running on idxbeaver.portlabs.in, so the brag is "this is the actual thing, not a mockup."

## Hook (first 2-3 seconds)
Open on the real Chrome DevTools tab strip, Elements panel showing. The cursor moves right past Console, Sources, Network, Performance, Memory, Application, and clicks a tab that should not be there: **IdxBeaver**. A 220-row data grid fills the window. The hook is the recognition beat: that is DevTools, and that grid does not belong in DevTools.

## Key moments (the middle)
- The dense grid: 220 real rows from `analytics.events`, id / name / userId / ts / props, scrolling under a real cursor.
- The row inspector sliding in: per-field editor with `number` / `string` / `object` type labels and syntax-highlighted nested JSON.
- Typing a MongoDB-style query into the CodeMirror editor and hitting run: `Query completed · 10 rows · 46ms`.
- The Structure view: inferred schema with type, nullable, coverage per column.
- `⌘K` command palette over the grid.

## Outro / punchline
The beaver mark on black, the product name, and the one fact that closes it: free, open source, in the Chrome Web Store.

## User flow worth showing
Entry: open DevTools on any page, click the IdxBeaver tab.
Key action: pick a database and store, then query it MongoDB-style.
Result: 10 rows in 46ms, with the row inspector and inferred schema one click away.
All three beats are captured as real screen footage.

## Tone
- Preset: polished
- Creative direction: quiet premium devtool film - the confidence of a paid database client applied to a free extension
- Interpretation: few scenes, long holds, no jokes, no swooshes. Motion is restrained (soft scale, gentle crossfades). The product footage does the talking; type is small, mono, and out of the way.

## Format: landscape - 1920x1080
## Duration: ~23 seconds

## Visual identity (from the project)
- Background: `#08090a`
- Accent: `#a78bfa` (violet), with the hero gradient running violet to pink
- Text: `#f7f8f8`, muted `#8b8f94`
- Hairline: `#ffffff0f`
- Display font: Geist Variable
- Body / label font: Geist Mono (the product's own label style is uppercase mono)
- Strongest visual element: the real DevTools window with the IdxBeaver panel open, plus the beaver-on-a-database mark from the landing page

## Share copy (draft)
Chrome's Application panel treats IndexedDB as an afterthought. IdxBeaver turns it into a real database client - dense grid, Mongo-style queries with index plans, row inspector, schema inference. Free and open source, in the Chrome Web Store.

## Audio direction
- Role: quiet bed under a voiceover
- Music: `happy-beats-business-moves-vol-11-by-ende-dot-app.mp3`
- Music treatment: starts at 0, ducked to ~0.10 under the voiceover for the whole body, lifts to ~0.22 in the last 2s under the logo, fades out at the end
- Music cue guidance: preset read from `cues/happy-beats-business-moves-vol-11-...music-cues.json`, 114.84 BPM. Strong cues in window: 1.60, 3.70, 5.80, 6.34, 8.96, 9.50, 12.65. Lock the panel reveal near 3.70s and the logo landing near the closest strong cue. Beat grid spacing is ~0.53s - too fast for readable text, so use it only for non-text accents.
- Audio-reactive treatment: not applied. The extraction helper needs a Python audio stack that was not worth another install for one glow; the violet glow is animated deterministically on the timeline instead (quiet under the footage, opens for the lockup).
- SFX posture: sparse. One soft click on the tab switch, one soft key tick cluster under the query typing, one soft impact on the logo landing. Nothing else.
- Audio-coupled moments: tab click, query typing, results landing, logo landing
- Restraint rule: no swooshes, no risers, no stingers between every scene. If a cue is not attached to something the user actually did on screen, it does not go in.

## Voiceover script
Generated locally with `hyperframes tts --voice am_michael --speed 1.10` (Kokoro-82M, no API keys).

1. "Chrome's Application panel treats browser storage as an afterthought." (4.12s)
2. "IdxBeaver makes it a real database client, inside DevTools." (4.37s)
3. "Every store, every row, in a grid that's actually dense." (3.63s)
4. "Query it MongoDB style. It picks the index and shows the plan." (4.44s)
5. "Inspect any row field by field. Let it infer the schema." (3.69s)
6. "IdxBeaver. Free, open source, in the Chrome Web Store." (3.61s)

## Storyboard

### Scene 1 - The tab that shouldn't be there - 4.0s
Real DevTools footage (`c1_open.mp4`): Elements panel, then the IdxBeaver tab is clicked and the panel loads. Overlay: nothing for the first 1.2s, then a single mono line low in frame: `chrome devtools -> idxbeaver`.
Sequential/interaction: yes - the footage is a real cursor clicking a real tab.
Audio intent: one soft interface click on the actual tab click; VO line 1 over it.
Audio-coupled idea: click SFX matched to the frame where the tab activates.
Music: quiet bed from 0.
Transition mood: clean cut -> Scene 2

### Scene 2 - 220 rows - 4.5s
Real footage (`c2_grid.mp4`): the `analytics.events` grid, 220 rows, scrolling. Slight punch-in on the grid area. Overlay right side, small: `220 rows · 55K` and below it `analytics · events`.
Sequential/interaction: yes - real scroll.
Audio intent: VO lines 2-3; music stays under.
Audio-coupled idea: none, the scroll is silent on purpose.
Transition mood: soft crossfade -> Scene 3

### Scene 3 - Query it - 5.5s
Real footage (`c4_query.mp4`): the JSON query is typed into the editor character-run by character-run, `⌘↵`, and the result strip reads `Query completed · 10 rows · 46ms`. Punch-in on the editor line during typing, pull back when results land.
Sequential/interaction: yes - real typing, real run.
Audio intent: VO line 4. Sparse key ticks under the typing, nothing on the run.
Audio-coupled idea: 4-5 keyboard ticks spread across the typing run, not one per character.
Transition mood: clean cut -> Scene 4

### Scene 4 - Inspect and infer - 5.0s
Two real clips cut together: `c3_inspector.mp4` (row inspector slides in with typed fields) then `c5_structure.mp4` (inferred schema table). Overlay: `row inspector` then `inferred schema`, small mono, bottom-left, one at a time.
Sequential/interaction: yes - the inspector panel opening is a real interaction.
Audio intent: VO line 5.
Audio-coupled idea: one soft drop when the inspector panel lands.
Transition mood: hard cut between the two clips, then crossfade -> Scene 5

### Scene 5 - Logo - 4.0s
Black. The beaver-on-a-database mark scales up softly with a violet glow behind it, `idxbeaver` in Geist beneath, then a mono line: `chrome web store · open source · idxbeaver.portlabs.in`.
Sequential/interaction: the mark, then the wordmark, then the mono line - three staged reveals with real holds.
Audio intent: VO line 6. Music lifts. One soft impact as the mark lands, beat-locked.
Audio-coupled idea: mark landing on a strong cue.
Transition mood: end

**Music mood for this video:** understated upbeat, kept low as a bed under narration
**Audio summary:** a quiet music bed the whole way, three sparse interaction sounds tied to things the cursor actually does, and a steady voiceover that carries the story; music lifts only for the last four seconds.
