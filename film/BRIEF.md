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
- **Chart key labels** `BENEFITS` and `SAFEGUARDS`: OWNER strings, flagged to the owner at review.
- **P24 (B8 fork):** "271" is outside the row's quoted text; confirm it in the Mozilla source before use, else show only the 423 figure.
- **Duration:** about 93 s with the longer Harris hold; trim only if the lint passes without cutting reading time.

## Rules carried from DIRECTOR-BRIEF.md

Every string and number from `facts.md` or approved `OWNER` lines. No periods in display text, no em dashes. Silent. 16:9. Deterministic `frame(t)` with `seek` and `?t=`; reduced-motion version; flash limits. Headed Chrome on the real GPU for any visual check, offscreen; screenshots under `D:\screenshots\SafeAI.Watch\film\`.
