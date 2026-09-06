# Hyperframes Composition Brief: IdxBeaver

## Objective
A short launch-style brag video for IdxBeaver, built almost entirely from real screen footage of the extension running in Chrome DevTools on the live site.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape - 1920x1080
- Duration: ~24 seconds

## Source Material
- Project root: `/Users/adityajindal/personal/idxbeaver`
- Primary files read: `README.md`, `package.json`, `src/panel/*`, `landing-site` (live at idxbeaver.portlabs.in)
- Product name: IdxBeaver (v1.3.1)
- Tagline: "IndexedDB viewer, built like a database client."
- Key UI moment to recreate: none - it is captured, not recreated. Six clips of the real extension, recorded by driving the real DevTools frontend over CDP with the unpacked extension loaded and the live site's own demo IndexedDB data:
  - `assets/video/c1_open.mp4` - Elements panel, then the IdxBeaver tab is clicked and the panel loads
  - `assets/video/c2_grid.mp4` - `analytics.events`, 220 rows, real scroll
  - `assets/video/c4_query.mp4` - a MongoDB-style query typed and run, `Query completed · 10 rows · 46ms`
  - `assets/video/c3_inspector.mp4` - row inspector opening with typed fields
  - `assets/video/c5_structure.mp4` - inferred schema (type / nullable / coverage)
  - `assets/video/c6_palette.mp4` - command palette (spare)
- Copy that must appear verbatim:
  - `chrome devtools -> idxbeaver`
  - `220 rows · 55K`
  - `Query completed · 10 rows · 46ms`
  - `idxbeaver`
  - `chrome web store · open source · idxbeaver.portlabs.in`

## Creative Direction
- Tone preset: polished
- Creative direction: quiet premium devtool film
- Interpretation: five long-held scenes, restrained motion, no swooshes. The footage is the argument; overlays are small uppercase mono labels that never cover data.
- Angle: Chrome already ships a storage panel and it is an afterthought. IdxBeaver is one tab over in the same window and behaves like a real database client. Every frame of product footage is real.
- Hook: the DevTools tab strip with a tab that should not be there.
- Outro: the beaver mark, then free / open source / Chrome Web Store.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Any recreated or mocked UI - all product frames are real capture

## Visual Identity
- Background: `#08090a`
- Text: `#f7f8f8`, muted `#8b8f94`
- Accent: `#a78bfa`, secondary `#f472b6` (the hero gradient's pink end)
- Hairline: `#ffffff0f`
- Display font: Geist Variable (fallback: system sans)
- Body font: Geist Mono (fallback: ui-monospace)
- Visual references: the DevTools window itself, the violet glow behind the landing hero mark, the product's uppercase mono micro-labels

## Storyboard
See `brag-output/brag-plan.md`.

Scene summary:
1. Tab that shouldn't be there - 4.6s - Elements panel, cursor clicks IdxBeaver, panel loads
2. 220 rows - 6.0s - the dense grid scrolling, `220 rows · 55K`
3. Query it - 5.6s - the JSON query typed and run, result strip readable
4. Inspect - 3.2s - row inspector with per-field types
5. Infer - 2.0s - the inferred schema table
6. Logo - 3.4s - beaver mark, wordmark, one mono line

## Audio
- Audio role: quiet bed under a continuous voiceover
- Audio arc: bed at ~0.10 for the body, lifts to ~0.22 for the last four seconds, fades to 0 at the end
- Music: `assets/music/bed.mp3` (happy-beats-business-moves-vol-11, 114.84 BPM)
- Music treatment: starts at 0, ducked under narration throughout, lift + fade on the outro
- Music cue guidance: preset cues at 1.60 / 3.70 / 5.80 / 6.34 / 8.96 / 9.50 / 12.65s. Lock the logo landing to the nearest strong cue; beat grid at ~0.53s is too fast for text, use it only for non-text accents.
- Audio-reactive treatment: subtle - violet glow behind the outro mark may breathe with RMS. No waveform or equalizer graphics.
- Voiceover: `assets/vo/vo1..vo6.wav`, generated locally with `hyperframes tts --voice am_michael`. Scene lengths flex to the generated WAV durations.
- Audio-coupled moments:
  - scene 1, the frame where the IdxBeaver tab activates - one soft interface click
  - scene 3, across the typing run - 4 sparse key ticks, not one per character
  - scene 4, inspector panel landing - one soft drop
  - scene 6, mark landing - one soft impact, beat-locked
- SFX selection guidance: sparse and motion-matched. Nothing fires unless the cursor did something on screen.
- SFX analysis guidance: `~/.claude/skills/brag/assets/sfx/sfx-analysis.md` - prefer low HF-risk files.
- Audio files: copied into `brag-output/composition/assets/`.

## Hyperframes Instructions
Standard: one paused GSAP timeline, `data-*` timing, media at any depth, every `<audio>` gets an id, no `crossorigin`, no CSS transform that a tween also drives. Run `npx hyperframes check` and clear every finding before render.
