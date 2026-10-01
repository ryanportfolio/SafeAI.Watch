# BRIEF: AI safety film for SafeAI.watch

Approved by the owner on 2026-09-30. This file is the source of truth for the build. `DIRECTOR-BRIEF.md` holds the full owner direction and rules; `facts.md` holds every usable fact; `pitches/director-c.md` holds the chosen direction and base beat sheet.

## Brief

A shareable, silent JavaScript animation about AI safety as a whole: what AI is doing for people, what has gone wrong, what tests show, what experts warn, what is working, and what nobody knows. It mounts on the About page (above the prose, 1000px column) and is exported to video only after the review loop passes. SafeAI.watch appears only at the end.

Success test: after one viewing, a stranger can say what AI safety is about right now, why it matters to them, and where to follow it, and comes away holding both sides rather than afraid or dismissive.

## Thesis

Hold both at once. The same capability brings great benefit and great danger. Understand it: neither fear it nor dismiss it. Labels (any camp label) reduce a person to one word and colour how they are heard; people are people, not camps. Tone is calm and focused. Progress, benefits and risks meet one evidence standard. Timeless structure; specifics sit in precision lines.

## Direction: C "Charted water", with grafts

Base: `pitches/director-c.md` in full (chart grammar, palette, type, camera, color script, beat structure, risks, hero frame).

Grafts:

1. **Blue caret (from B).** Where a claim needs its limit in the statement itself ("in tests", "during a cyber test"), a mark-blue caret inserts the limit in Newsreader italic (lowercase only, subset K21) and the line reflows; moved words travel as one group.
2. **Checks (from B).** `film/beats.json` is the single source of timing and text. A lint script fails the build when: a statement is shown for less than 250 ms per word plus 1 s (plus precision-line time); a quoted string is not an exact substring of its facts.md row's Exact text (only a terminal period may drop); any on-screen string lacks a row ID or `OWNER` tag; an italic run contains anything outside a to z, space and `.,;:-’`; display text ends in a period or contains an em dash.
3. **Group motion (from A).** Marks the viewer tracks move together with no per-mark stagger; stagger only for ambient marks and caption words.

## Changes to C's beat sheet

- **B1 benefit slot A → B18.** Statement from the row: half of blind or low-vision AI-description users use it daily. Precision line carries the harm side from the same report (users harmed by errors) with AFB, date and "self-reported". Use only figures that appear verbatim in the B18 source; confirm the harm figure against the source before locking.
- **B3 → Harris Q1**, verbatim: "It can give you a positive infinity of new benefits at the same time that it presents almost a negative infinity of risk in the same object." Precision: `Tristan Harris · Center for Humane Technology · with Krista Tippett, July 2026`. Hold about 8 s (27 words). No label near him.
- **B4 labels beat (approved OWNER lines).** Statement: "A label turns everything a person thinks into one word". Second line: "People are people, not camps". Chips `DOOMER` and `ACCELERATIONIST`, identical, anonymous marks only.
- **B13 benefit slot B → B4** (AlphaFold2, Nobel Prize in Chemistry 2024). Statement and precision from the row; the precision line notes predicted structures, not experiments, per its Limits.
- **B15 closing OWNER line:** "Hold both at once".
- **Dropped:** "The same capability can help people and harm them" (Q1 carries it).
- **Chart key labels** `BENEFITS` and `SAFEGUARDS`: OWNER strings, approved by the owner on 2026-09-30.
- **P24 (B8 fork):** "271" is outside the row's quoted text; confirm it in the Mozilla source before use, else show only the 423 figure.
- **Duration:** no target; the owner set no length. Timing follows the reading budget (currently 127.7 s).

## Rules carried from DIRECTOR-BRIEF.md

Every string and number from `facts.md` or approved `OWNER` lines. No periods in display text, no em dashes. Silent. 16:9. Deterministic `frame(t)` with `seek` and `?t=`; reduced-motion version; flash limits. Headed Chrome on the real GPU for any visual check, offscreen; screenshots under `D:\screenshots\SafeAI.Watch\film\`.

## Story spine v2 (owner-approved 2026-09-30, replaces the beat order above)

Owner feedback on animatic v1: the animation is great, but the story was a list of random topics with no throughline. v1 was a catalogue sorted by evidence type. v2 is one argument, each beat answering the one before. Visual language, palette, chart grammar and grafts stay; the beat sheet changes. Fewer facts, one story.

Throughline: a question, the bad answer, the evidence, what it adds up to, what is being done, what is unknown, a better answer.

1. **The question.** OWNER: "Is AI good or bad for us?" over the blank chart.
2. **The one-word answers.** Two identical chips, `DOOMER` and `ACCELERATIONIST`, cover the whole map as the ready-made answers. OWNER: "A label turns everything a person thinks into one word". The chips lift and reveal the chart: from here the film reads the record, not the labels.
3. **Three forks on one current: the same capability, both ways.** Each fork is one neutral ring on the current splitting into a benefit light and a hazard mark, both branches drawn at the same speed. The three forks sit along the one current so the chart visibly accumulates the pattern.
   - Sight: B18. Benefit and harm from the same AFB report (51% of blind or low-vision AI-description users use it daily; 61 of them, 21%, reported harm from an error). Self-reported survey, advocacy body.
   - Code: P24 (Mozilla, 423 security fixes in April, 271 found with Claude Mythos Preview) and H23 (Google GTIG, first zero-day it believes was developed with AI, in criminal hands).
   - Biology: B4 (AlphaFold2, Nobel Prize in Chemistry 2024, used by over two million people) and T5 (SecureBio: models surpassed expert virologists on a wet-lab troubleshooting benchmark; a benchmark, not lab work; headline only).
4. **The synthesis, now earned.** Harris Q1 verbatim, long hold. The whole current with its three forks in view.
5. **So how do we keep it safe?** One chapter, one idea: people test it, catch problems, and set rules. Short OWNER lead-in allowed (for example "So people test it"). Beats: H40 with H42 in the harbor (in a government cyber test, agents targeted real people; a human maintainer caught the code; caret "during a cyber test"); P32 (training cut covert actions 13% to 0.4%, caret "in tests"); L37 with L14 as the blue channel (laws requiring incident reports; EU powers from 2 Aug 2026). Keep precision lines short.
6. **What nobody knows.** W7 in the fog.
7. **The better answer.** OWNER "Hold both at once", then OWNER "People are people, not camps", then the end card (S25, S9/S10, S13). Optionally the question returns faintly for one beat before "Hold both at once" so the answer visibly replies to it.

Cut from v1: H27 (FBI), T72 (red-team competition), W31 (Five Eyes), P34 (METR reviewers), L19 (institutes network), W2 (Bengio). They stay in facts.md.

No length target. Fix the v1 notes while rebuilding: captions over marks in the hero frame, the muddy mid-dusk grey (about 100 s in v1), the crowded label beat. Chart key labels `BENEFITS` and `SAFEGUARDS` were approved by the owner on 2026-09-30.

## Approvals after the script (2026-09-30)

- Chart key labels `BENEFITS` and `SAFEGUARDS`: approved.
- The second Tristan Harris quote (Q12, "clarity creates agency", SCRIPT.md line 21): approved, so the film carries two Harris lines.
- `film/SCRIPT.md` is the source for every on-screen string; `npm run film:lint` fails when `film/beats.json` drifts from it, and runs before every site build.

## Sound

The silent film stays the default. The sound version is an opt-in mode of the animatic: a `Sound off` / `Sound on` toggle in the transport, or `?sound=1`. Audio starts only after a click or key press. With sound off the page creates no `AudioContext` or `OfflineAudioContext` and loads no audio code, so WA-SILENT still holds.

- **Reference cue:** Jon Hopkins, "Abandon Window" (Immunity, 2013). Slow and drum-free, a few soft tuned notes over a warm held pad: calm and attentive, with no alarm and no hype.
- **Key and tempo:** D major, open sus voicings over a pedal bass, never below D3 in the pads. 60 BPM base. The pulse runs in three passages (the two forks, the four steps, the final build), each a whole number of eighths from one cut to the next: 0.50 s eighths in the first two, 0.45 s (about 67 BPM) in the build before the stopdown.
- **Motif:** A4 D5 B4 E5. It is stated as the question appears and ends open on E. The four step headings spell it again, one note each, so "we admit what we don't know" lands on the open E. The question's faint echo replays it just before "Hold both at once". On the end card it returns resolved: E falls to D as the orange marker of the mark lands.
- **Arc:** sparse opening (pad, motif, the chart's readings as soft tuned points). In the labels chapter each label lands on one identical low D, and the readings under it thin and dull; as the run of labels covers the chart they fall silent and the pad closes, then both return when the labels lift and the bass enters with "People are people, not camps". The forks build with the pulse: a neutral ring note, then the benefit light (F#5) and the harm mark (B4) on the same voice at the same level, over the same chord. The Harris quote gets the widest chord so far and both branch notes together. The four steps carry a steady pulse; the pulse rests for the human catch, and the bass lets go as the sounding drops into the fog. After dusk the motif's first notes return and both branch notes glow together. The stopdown is at the cut to "Hold both at once": the pad reverbs out and only the faint question echo sounds. The one full-weight moment is "Hold both at once": low D, the widest chord, and the benefit, ring and harm notes sounding at once. The end card resolves the motif on the landing marker and the reverb tail decays to silence before the last frame.
- **Engine:** `film/animatic/audio/`. `score.js` composes the cue list from `beats.json` and renders it once in an `OfflineAudioContext` with seeded humanization; `synth.js` holds the voices, `mix.js` the bus, reverb, loudness and true-peak limiter, `player.js` the toggle and playback from offset t. `node film/animatic/audio/render-wav.mjs` writes the same render as a 48 kHz stereo 24-bit WAV to `.tmp/film/audio/score.wav` for the video export (`--stem hits`, `--stem pads` and `--stem floor` for the checks); `node film/animatic/audio/check-wav.mjs` runs the scripted checks. Re-render after any change to `beats.json`. `node scripts/film/export-video.mjs` renders the MP4s frame by frame and `node scripts/film/check-export.mjs` checks them.
- **Quiet under the captions (owner, 2026-09-30).** The owner rejected the first draft's sound: "way too much background noise, sounds like I'm under a waterfall and is difficult to concentrate." Calm reading needs quiet. The score has no noise bed or tape hiss (the old one ran the whole film at about -30 dBFS). The reverb is shorter and quieter (RT60 1.8 s, return 0.3, smaller sends), the pads are thinner and darker (two voices a note, lower level, lower cutoff), and the held bass is lower. Check: the chain with every note removed must stay at or below -60 dBFS (it renders digital silence).
