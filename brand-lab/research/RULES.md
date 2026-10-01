# Logo research rules

Every research agent reads this first.

## The brand

SafeAI.watch is a public editorial site that tracks AI safety and security for general readers: research, reported incidents, public warnings, and policy. Every entry links its original source and separates what happened, what the evidence shows, and what remains uncertain. Its stance: hold both at once (AI brings great benefit and great danger from the same capabilities); understand it rather than fear it or dismiss it; no camps, no hype, no doom. Tone: calm, focused, precise, trustworthy, editorial. The name has two parts: "SafeAI" and ".watch" (as in keeping watch, observing, a watchdog).

Current look (see `site-look.md` in this folder): warm paper ground `#d7d7d0`, ink `#1a1614`, accents orange `#ff7733`, amber `#e5a700`, olive `#a89a1a`, mark blue `#253e77`; type Geist, Geist Mono, Newsreader. The current mark is a crosshair (two concentric circles and four tick arms). The owner wants a new logo and gave creative freedom: the current mark is not the base.

## The job

The owner asked for inspiration from https://godly.design/logos/ (a curated gallery of 3,000+ logos, wordmarks and animated logos). Screenshots of the first 304 entries are at `D:\screenshots\SafeAI.Watch\logo-lab\godly\grid-00.png` to `grid-36.png` (1600x1000 each, in page order), and `D:\screenshots\SafeAI.Watch\logo-lab\godly\entries.json` lists each entry's name, source link and image URL (`https://cdn.logosystem.co/logos/<name>.webp`). To study one logo closer, download its image URL with curl to `C:\Users\Home\CoreWise\SafeAI.Watch-worktrees\logo-lab\.tmp\godly\` and view it; if the Read tool cannot open .webp, convert it (for example with a small Node script using the `sharp` package from `C:\Users\Home\CoreWise\SafeAI.Watch-worktrees\about-film\node_modules`, or ffmpeg if `where.exe ffmpeg` finds it) to PNG first.

Look like a designer. For each logo worth noting, name the technique precisely (custom letterform, ligature, negative space, monoline symbol, geometric construction, optical illusion, modular grid, stencil, motion idea, type pairing, lockup), and why it works. Then say whether that technique fits SafeAI.watch's meaning and tone, and how it could be applied, without copying any logo.

## Output

Write exactly one file: `C:\Users\Home\CoreWise\SafeAI.Watch-worktrees\logo-lab\brand-lab\research\<your-slice>.md`:

1. `## Notable logos`: table `Name | Image URL | Type (wordmark, symbol, combination, monogram, animated) | Technique | Why it works | Fit for SafeAI.watch (high, medium, low) and how`. 10 to 25 rows.
2. `## Patterns`: 5 to 10 recurring techniques or trends you saw in your slice, each with 2 or 3 example names.
3. `## Ideas for SafeAI.watch`: 3 to 6 concrete concept seeds in one or two sentences each (what the mark is, what it means, which techniques it borrows). Original ideas only; never a copy or a close variant of a logo you saw.
4. `## Log`: files viewed, anything that failed.

Edit nothing else. The Bash tool's cwd resets; use absolute paths. Return a summary under 100 words: your top 3 concept seeds and the strongest pattern.
