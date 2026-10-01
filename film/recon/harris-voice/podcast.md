# Harris voice study: podcast slice

Slice: Center for Humane Technology's "Your Undivided Attention", episodes from 2025 and 2026 where Tristan Harris speaks about AI's benefits and risks together, how to talk about AI without despair or hype, or the public conversation about it. Read 2026-09-30.

Conventions:
- Every quote is a contiguous, verbatim substring of CHT's published transcript. Typographic apostrophes and quotation marks are straightened to match `harris.md`; nothing else is changed. A script check (`.tmp/film/harris-voice/podcast/chk*.mjs`, source files saved alongside) confirmed each quoted string against the saved transcript text; a final pass over this file's block quotes is logged at the end.
- Transcripts are CHT's edited text on its Substack. They have no timestamps and none of these episodes had an official video transcript I could reach, so no quote carries a video time. Attribution to Harris rests on the transcript's own speaker label (`Tristan Harris:` or `Tristan:`).
- Where Harris reads out or cites someone else's words, the quote is tagged (Postman), (Lanier) and so on. These are not his coinages and must be credited to the original author if used.
- Source tags [E1] to [E18] refer to the table below. Dates are the CHT Substack post dates.
- Not re-read, because `harris.md` already covers them: TED 2025, Tippett (2026-07-16), "The Most Hopeful (And Concerning) Moment" (2026-09-17), Javorsky (2026-04-30), and the 2024-08-13 episode. Episodes [E2], [E3], [E4] were fetched in the earlier pass and judged to have nothing usable as fact rows; here they were read for voice.

## Sources read

All published on the CHT Substack at `https://centerforhumanetechnology.substack.com/p/<slug>`; the transcript was pulled from the Substack JSON endpoint (`/api/v1/posts/<slug>`), which returns the same body as the page.

| Tag | Title and guest | Date | Slug | Read |
|---|---|---|---|---|
| E1 | Enough Debate about the AI Jobpocalypse. We Need To Plan for the Messy Middle. (Molly Kinder) | 2026-08-13 | enough-debate-about-the-ai-jobpocalypse | Full |
| E2 | "Magnifica Humanitas:" Pope Leo's Clarion Call on AI (Harris and Aza Raskin) | 2026-07-02 | magnifica-humanitas-pope-leos-clarion | Full |
| E3 | We Need AI Treaties. This is How We Get Them. (Tim Fist, Janet Egan) | 2026-06-18 | we-need-ai-treaties-this-is-how-we | Full. The cold open (Oppenheimer story) has no speaker label, so nothing from it is attributed to Harris. |
| E4 | Anthropic's Mythos Has Changed Cybersecurity Forever. What Now? (security experts) | 2026-05-14 | anthropics-mythos-has-changed-cybersecurity | All 20 Harris turns, each cut at 1,800 characters; guest turns not read |
| E5 | A Conversation with the Team Behind "The AI Doc" (Daniel Kwan, Jonathan Wang, Ted Tremper; Aza co-hosts) | 2026-03-23 | a-conversation-with-the-team-behind | Full |
| E6 | Why the Meta Verdicts Are a Big Deal (Aza) | 2026-03-26 | why-the-meta-verdicts-are-a-big-deal | Harris turns only. Social media case, nothing quoted. |
| E7 | Here's Our Roadmap to a Better AI Future (Camille Carlton, Pete Furlong) | 2026-04-02 | heres-our-roadmap-to-a-better-ai | Harris turns only (10 turns, complete) |
| E8 | The Race to Build God: AI's Existential Gamble (Yoshua Bengio and Harris, Davos panel moderated by Kenneth Cukier, plus Harris and Daniel Barcay intro) | 2026-02-19 | the-race-to-build-god-ais-existential | Full. Panel taped in Davos week (Jan 2026); the transcript gives no exact day. |
| E9 | What Would It Take to Actually Trust Each Other? (Sonja Amadae) | 2026-01-08 | what-would-it-take-to-actually-trust | Harris turns over 200 characters (cut at 2,300) |
| E10 | Feed Drop: "Into the Machine" with Tobias Rose-Stockwell (Harris is the interviewee) | 2025-11-13 | feed-drop-into-the-machine-with-tobias | Full. Original posted on Rose-Stockwell's Substack 2025-10-31 (`tobias.substack.com/p/tristan-harris-spooky-new-ai-abilities`); I could not find a YouTube copy. |
| E11 | Ask Us Anything 2025 (Harris and Aza answer listener questions) | 2025-10-23 | ask-us-anything-2025 | Full |
| E12 | The Crisis That United Humanity, and Why It Matters for AI (Susan Solomon) | 2025-09-11 | the-crisis-that-united-humanityand | Full |
| E13 | "Rogue AI" Was a Sci-Fi Trope. Not Anymore. (Edouard and Jeremie Harris, Gladstone AI) | 2025-08-14 | rogue-ai-was-a-sci-fi-trope-not-anymore | Intro and last third in full; middle located by keyword search over Harris turns |
| E14 | Forecasting the End of Human Dominance (Daniel Kokotajlo) | 2025-07-16 | forecasting-the-end-of-human-dominance | Intro and last third in full; middle (guest scenario detail) unread |
| E15 | Is AI Productivity Worth Our Humanity? (Michael Sandel) | 2025-06-26 | is-ai-productivity-worth-our-humanity | Full |
| E16 | Forever Chemicals, Forever Consequences (Rob Bilott) | 2025-04-03 | forever-chemicals-forever-consequences | Harris intro and the passages from his turns about AI (about two thirds of the transcript) |
| E17 | Weaponizing Uncertainty: How Tech is Recycling Big Tobacco's Playbook (Naomi Oreskes) | 2025-03-20 | weaponizing-uncertainty-how-tech | Intro, closing third, and keyword search of Harris turns |
| E18 | The Man Who Predicted the Downfall of Thinking (Sean Illing, Lance Strate on Neil Postman) | 2025-03-06 | the-man-who-predicted-the-downfall | Full |

Eighteen episodes in all, all beyond the four `harris.md` covers; ten were read in full and the rest in the passages noted.

## How he frames it

### 1. Benefit and danger as one capability, not two lists

The clearest 2026 statement is the Davos panel. He builds the benefit first, then shows it cannot be separated from the danger.

> the same AI that knows biology well enough, knows immuno-oncology well enough to develop those cures for cancer, that AI can't be separated from the AI that also knows how to build new kinds of biological weapons. You can't separate the promise from the peril. [E8, 2026-02-19]

A thought experiment that makes the listener feel both at once:

> if a nuclear bomb was blowing up in 10 seconds, but the same nuclear bomb in 10 seconds was also going to give you cures to cancer and solve climate change and build unbelievable abundance and energy, what would you do with those two things hitting your brain at the same time? [E10, 2025-11-13]

The "positive infinity / negative infinity" line existed earlier than the Tippett episode that `harris.md` cites. Here it is in the Solomon episode:

> AI represents both a positive infinity of new scientific and technology development you couldn't even imagine, at the same time that it also represents a negative infinity of new ways that things could go wrong that you could never even imagine. [E12, 2025-09-11]

A short image for the same idea:

> AI is like steroids that also gives you organ failure. [E8]

### 2. He credits the benefit side in his own voice

He says he uses the tool and likes it, and that the benefit side may be underrated.

> which by the way, I use AI every day and I enjoy those benefits every day, and I'm not denying that set of benefits. [E12]

> So I think the optimists are underselling how amazing it could be. But at the same time, AI represents a negative infinity of crazy things that could also go wrong. [E10]

He also grants the historical reassurance on jobs before asking whether this time differs:

> And so that does provide a grounded reason for reassurance. But then it comes back to, is this fundamentally a different kind of thing or not? [E1, 2026-08-13]

### 3. Why people hold only one side

He describes the flip as a feature of minds under pressure, not a flaw in one camp.

> our mind is sitting inside of this literally psychological superposition of both seeing AI as controllable and uncontrollable at the same time, which is a contradiction that we don't even acknowledge. [E13, 2025-08-14]

> My friend has cancer, and I want him to have the cancer drug, so I'm just going to tune my attention to the positive side. Just not look over there and assume that everything's going to be okay. But what you look away from does not mean that it doesn't happen. [E10]

He ties the split to people's own experience of the topic, using the film he appears in:

> Because the other thing going on is that some people have this knowledge about one aspect, but they don't know that other people do. [E5, 2026-03-23]

> I'm worried about AI, but then I talk to my family [E5]

(The sentence continues: "...and they're talking about something completely different, like how useful it is to vibe code.")

His two-risk framing in the Rogue AI episode is the clearest "neither extreme" statement:

> there's really two risks here. There's the risk of building AI, which is the uncontrollability catastrophes, all the stuff we've been laying out. And then essentially the risk of not building AI. And the narrow path is how do you build AI and not build AI at the same time? [E13]

### 4. Camps and labels: he describes stances and what the fight costs, and refuses the two mood labels

He rejects optimist versus pessimist as a way to sort himself:

> People ask you, are you an optimist or a pessimist? Both are about abandoning agency. What I care about is reality. [E8]

He answers the "pessimist" tag by turning it around, quoting Jaron Lanier:

> I know we often sound like we're pessimistic or something about exposing all these risks of a technology [E11, 2025-10-23]

> the critics are the true optimists (Lanier, via Harris) [E11]

> So the good future might just simply be one where the bad doesn't happen. [E11]

On the doomer tag, recalling what critics said when CHT gave its AI Dilemma talk, and then to Rose-Stockwell:

> people said, "But these guys profit from speaking about risk and doomerism [E17, 2025-03-20]

> I'm not trying to leave people in some doomer perspective. It's use that clarity to say, "Okay, therefore what do we want to do instead?" [E10]

On why people stay silent, he names the fear of a label:

> people are afraid to be the Luddite. They're afraid to be anti-technology. [E11]

On the jobs debate (Kinder episode), he lays out the two sides with their own clips, then says what the fight does to ordinary people:

> But if you believe the AI CEOs, they'll say, "Well, we'll just solve the unemployment problem. [E1]

> On the other hand, you hear from some techno optimist that there's nothing to see here. AI is actually creating more jobs than it destroys. [E1]

> And when these facts get traded back and forth, no one can know what's actually true and then nothing actually happens. [E1]

> And as long as that debate stays alive, nobody plans or takes action for what's coming. [E1]

He closes that frame by endorsing the "messy middle" and a skeptic's stance toward both camps:

> The whole overall point is that it's not this black and white all or nothing job apocalypse or everyone's just going to keep getting jobs and finding new things to do. [E1]

> you have a healthy skepticism of both the timelines of the kind of AGI believers and of the economists and techno optimists who say there's nothing to worry about here. [E1]

He pre-empts a cheap reading of his own argument:

> Now I want to just head off the take here that what we're saying might be seen as classist. [E1]

Fit note for the essay: Harris is not neutral. He uses "techno optimist", "AGI believers" and "optimists" as plain descriptions of stances, and he ends nearly every episode saying the current path is unacceptable. The both-sides move is in how he states the object and treats opponents; the conclusion still leans to caution.

### 5. Fear and agency: name the overwhelm, then give a first step

> So we have to be compassionate to the fact that this feels like adding to an already insurmountable amount of overwhelm. [E10]

> Now, it all starts with, first of all, just not feeling overwhelmed. [E7, 2026-04-02]

> Well, I feel like the answer to that question has to start with a deep breath. [E14, 2025-07-16]

> I wish I could say that this is total embellishment, this is exaggeration, this is just alarmism, Chicken Little [E14]

> But the point of this episode is not to do fearmongering, it's to actually take seriously how would this risk actually happen? [E13]

On his Vatican screening, how people moved from shock to action over a few days:

> leaning more into the hope and wegency side of things rather than just the kind of disempowered side of things [E2, 2026-07-02]

(The transcript spells it "wegency"; this is CHT's text, and likely a "we" plus "agency" blend.)

### 6. Inevitability is the thing he works hardest to dissolve

> AI isn't coming from physics. It's coming from humans making choices inside of structures that, because of competition, drive us to collectively make this bad outcome happen [E10]

> The only way out of this starts with stepping outside the logic of inevitability and understanding that it's very, very hard, but it's not impossible. [E10]

> But it's not physically impossible. It's just unbelievably extraordinarily difficult. [E10]

> They are casting a spell, that means they will never even seek another path. [E12]

> we have to break the trance of inevitability. [E7]

Postman's line, which he reads out near the close of the Postman episode:

> To ask is to break the spell. (Postman, read by Harris) [E18, 2025-03-06]

### 7. Honest about what is unknown, and about changing his mind

> Now, no one knows the future, but we know that automation from AI is coming [E1]

> I don't spend my time speculating about exactly when different things are going to happen. I just look at the incentives that are driving everything to happen, and then extrapolate from there. [E10]

> you don't have to agree with the specific events that happen in AI 2027 [E14]

> I'm not confident. [E8]

> if I said that just three months ago, you would've called me crazy. [E3, 2026-06-18]

> I'm not saying this is easy, but you run the logic yourself. [E10]

### 8. Where his hope comes from

> hope or optimism comes from the unknown unknown set. [E5]

> I just think there's a really optimistic story here that technology and solutions evolve over time [E12]

> I will say I think there's actually a way to get to a good world. [E18]

> that's still the optimist in me [E18]

> This could end better than it did with social media. [E4, 2026-05-14]

> Now, none of this is perfect, but we need to start somewhere and we can make it better over time. [E3]

### 9. What he asks of the listener

Do not try to solve the whole thing; join a larger effort.

> your role is not to solve the whole problem, but to be part of humanity's collective immune system against the kind of blindness and naivete of the current path. [E12]

Tell the people near you.

> this is why conversations matter. [E5]

> if you just imagine for a moment, close your eyes. [E11]

See your daily choices as part of one movement.

> When you grayscale your phone and turn off notifications, that's the human movement. [E7]

Ask better questions of each new technology. He praises Postman's seven questions and applies the first one to AI:

> this is the Neil Postman question to what is the problem to which this new technology is actually the solution? [E15, 2025-06-26]

## How he builds an explanation

### Openers

He rarely opens with a thesis. He opens with a scene, a story, or both camps on tape, then turns.

- Before/after concrete scene, benefit first, then the break:

> Now, a generation ago, your bank had a vault. Your medical records were in a filing cabinet. [E4]

> And in a world where all these systems are mostly secure, life just gets more convenient and efficient because of all this. But all that comes into question when suddenly an AI system can break through the security that runs the world. [E4]

- A historical story that carries the argument:

> So in the fall of 1983, ABC aired this film called The Day After. [E5]

- Familiar fiction, to show the danger is old and now real:

> Whether it's 2001: A Space Odyssey, Ex Machina, Skynet from Terminator, I, Robot, Westworld, or The Matrix [E13]

- Both camps as clips (Musk and Altman, then David Friedberg), followed by the "But if you tune..." turn [E1].
- A personal admission about his own earlier view:

> And I used to be someone who really deeply believed just in this, tech is only good, we can only do good with it, it's the most powerful way to make positive change in the world. [E18]

### Sequence

The Kinder opening [E1] shows his usual order: (1) state the debate; (2) play each side at its most confident; (3) say what the tug-of-war costs a person ("Should my kid actually go to college? Will my job be safe?"); (4) name what is missing (systems thinking, feedback loops); (5) promise a way through.

The exact words of step 3:

> just trying to figure out what does this mean for me and my family right now? Should my kid actually go to college? Will my job be safe? [E1]

### The "grant, then turn" move

He gives the other view its due in the same sentence, then turns.

> Now, AI itself is not toxic in its own right but I think the pattern is very similar. [E16, 2025-04-03]

> I'm not trying to be a techno-solutionist or say that AI can fix everything [E17]

> one of the things that actually excites me about AI is the ability to use it to more quickly augment society's ability to see the downsides and externalities [E18]

He steelmans before critiquing, and says so:

> just sort of steelman for a second. Let's talk briefly about the excitement of chemistry. [E16]

> There are some people who criticize that Claude Mythos is just hype [E4]

> to steelman the case for the billionaires [E1]

### Analogies and metaphors

- Chimpanzees who cannot picture what a smarter species will do. First use in the Kokotajlo intro, retold at length with Rose-Stockwell:

> Imagine chimpanzees birthed a new species called homo sapiens [E14]

> we are the chimpanzees trying to speculate about what the AI could or couldn't create. I think that we should come with a level of humility about this [E10]

- Frog in warming water, for slow change:

> I think that it's like a frog boiling in water. [E10]

- A hidden system under a visible one, in the Kinder episode on job swaps:

> almost like the invisible health of the soil. [E1]

- Two horses and a Model T, as an AI-generated cartoon:

> two horses in a carriage saying, "There's more horses hired today than ever before," right next to a Model T sitting next to it. [E1]

- A small firm, to make a macro claim countable:

> Imagine some company, Acme Corp, and it has 100 employees. [E10]

- A heads-up display for invisible harms:

> make the invisible, not just visible but visceral [E16]

- Moving harm through technology as a trade, not a fault:

> all technologies are a Faustian bargain. They give us something, but they also take something else away. [E16]

- "Hyper-object" (Timothy Morton), glossed with three ordinary scenes:

> Just define for people the word hyper-object is referring to Timothy Morton. [E5]

> you see a data center go up in your backyard on farmland that used to be there for a hundred years. That's AI. [E5]

- Film references as shorthand for futures people already know:

> Let's just rotate the entire problem from the lens of, haven't we seen this movie before? [E7]

- Borrowed lines, always credited to the source: E.O. Wilson ("paleolithic brains, medieval institutions, God-like tech" [E12]), Lanier, Postman, Carl Jung ([E10]):

> Carl Jung said, I think near the end of his life, when he was asked, "Will humanity make it?" and his answer was, "If we're willing to confront our shadow." [E10]

### Concrete versus abstract

Abstract term, then a plain scene, then the point. "Attachment" is the best example:

> A good test for what you have attachment to is, when you come home from a good day or a bad day, who do you want to call? [E10]

For the present, he lists dated facts with the same opening word:

> Today we have AIs that are aware of how to build complex biological weapons and getting past screening methods. [E10]

He explains tech terms to a general listener as he goes:

> just to remind listeners the difference between a chip that knows that it's training GPT6 [E3]

### Rhythm, second person, questions, repetition

- Long spoken sentences with run-ons, broken by a short one ("That's AI." "Yes.").
- Yes/no chains, when facts pile up:

> Do companies have an incentive to race as fast as possible? Yes. Is the technology controllable? No [E10]

> Can we learn the lessons of social media? Yes. Can we do something different? Yes. [E10]

- Anaphora in the roadmap episode: four "that's the human movement" sentences in a row, each a daily act. First of them in section 9 above, last of them:

> that's the human movement. [E7]

- Questions that hand the listener the decision:

> So I ask you, is there a precedent for something that is both a positive infinity and a negative infinity in one object? Do we have anything like that? [E10]

> Given the multiple faces of that object, which of the faces do we want? [E5]

- Imperatives of attention ("Imagine", "close your eyes") appear throughout.

### Register

Warm, fast, informal. Gratitude for guests, jokes at his own expense, no lecturing tone.

> Two tech pros, we can definitely do it, right? [E11]

> We've obviously done an amazing job. [E8]

(The second is sarcasm about CHT's record on social media regulation.) In the Rose-Stockwell interview his language gets stronger and includes profanity; our essay should not copy that.

### Closes

- A backcast story that ends on a measured line: after a hopeful narration in which the world "woke up", he closes on

> Now, none of this is perfect, but we need to start somewhere and we can make it better over time. [E3]

- A long quote from another thinker as the last word (Postman [E18]).
- Thanks plus a hope line:

> hopefully leaving listeners with some hope and also increased appreciation for the complexity and nuance of how we navigate really difficult terrain. [E12]

- A sign-off:

> Onward and upward. [E2]

## Signature phrases

Each is his own phrase unless the tag says borrowed. Quote and attribute if used; do not turn them into our wording.

| Phrase | Where (exact words in the quote) | Note |
|---|---|---|
| "clarity creates agency" | "If we can see clearly, clarity creates agency" [E14]; "If we are clear-eyed, we always say in our work, clarity creates agency." [E13]; "this is our theory of change, right? Clarity creates agency." [E2]; "in essence, what we're trying to do is create clarity that will create agency." [E7] | Already in `harris.md` from TED. New: the "theory of change" label (2026-07-02). |
| positive infinity and negative infinity (label, not a quote) | [E12], [E10] (full lines in section 1) | Used by Sept 2025, so earlier than Tippett. |
| "narrow path" | "And the narrow path is how do you build AI and not build AI at the same time?" [E13]; "There is a narrow path, but it takes doing this very, very differently." [E10] | In the TED talk (see `harris.md`) it means power matched with responsibility. Here it is also about doing AI differently. |
| "default path" | "the default path is not a pro human future." [E7] | |
| spell / trance of inevitability | "They are casting a spell" [E12]; "we have to break the trance of inevitability." [E7]; "the spell of inevitability" appears in the same sense in [E10] | |
| "the human movement" | "that's the human movement." [E7] | CHT campaign name as well. |
| "the complexity gap" | "the complexity gap" [E2] | He says the complexity of what must be known grows faster than what society understands. |
| "make the invisible, not just visible but visceral" | [E16] | |
| "the harder, righter thing" | "dedicate themselves to the harder, righter thing" [E16] | |
| "govern by train wreck" | "we can govern by train wreck like we always do" [E10] | |
| "How many warning shots do you need?" | "I'm just saying, how many warning shots do you need?" [E10] | Alarm register. |
| "AI arms every other arms race" | [E9] | |
| "race to the bottom of the brain stem" | [E8] | Social-media phrase, extended to AI. |
| "the receipts" | "So basically now we have the receipts is the difference." [E8] | Casual; explains why Davos in 2026 listened more. |
| "If you show me the incentive, I will show you the outcome." | [E10] | Munger's line; Harris repeats it as a CHT motto and attributes it to Munger in [E18]. |
| "there are no adults" | "we are the adults we've been waiting for. There's no secret room adults that's going to figure this out for us." [E5] | |
| more mature relationship with technology (label, not a quote) | "It's inviting us to a more mature relationship with the way we deploy technology in general." [E10] | Same idea as the TED talk's technological maturity (see `harris.md`). |

Borrowed lines he quotes (credit the author, not Harris): "clarity is courage" (Postman) [E11]; "the critics are the true optimists" (Lanier) [E11]; "To ask is to break the spell" (Postman) [E18]; "paleolithic brains, medieval institutions, God-like tech" (E.O. Wilson) [E12]; "If we're willing to confront our shadow" (Jung) [E10]; "the problem to which this new technology is actually the solution" (Postman) [E15].

## Lessons for a calm, plain-language essay

1. State benefit and danger as one capability, and say why they cannot be pulled apart. Pick one concrete case (the same biology knowledge that finds a cancer treatment also lets someone build a weapon) and let it do the both-sides work. Do not write two paragraphs, one hopeful and one worried. [E8, E10]
2. Credit the benefit side in the writer's own voice before the warning. One sentence saying you use the tools and gain from them makes the caution believable. [E12, E10]
3. Describe the argument between camps by what it does to an ordinary person, not by who is in it. Show the two confident claims, then the reader trapped between them (in E1, a parent asking "Should my kid actually go to college?"). Say why minds flip between the two views. This keeps the essay on stances and consequences, not on people. [E1, E13]
4. Treat fear as a normal reaction with a next step. Name the overwhelm, give permission to breathe, then offer one small thing a reader can do (tell someone, ask a question, join others). Skip the lecture on how bad it is. [E7, E10, E12]
5. Say what is known and what is not in one clean sentence, then reason from mechanism. The pattern in "no one knows the future, but we know that automation from AI is coming" (E1) is worth studying: one clause for the unknown, one for the known. Avoid dates and odds. [E1, E10]
6. Give each abstract claim one image or one countable case, and define each term at first use. The hyper-object explanation (three ordinary scenes, one label) and the 100-employee company are the models. [E5, E10]
7. Grant the opposing point inside the same sentence, then turn. Examples in his speech: say you use the tools daily, then raise the concern; say you are not a techno-solutionist, then make the case for AI helping with one task; say the reader need not accept a forecast, then ask whether the pressures point the same way. This lowers the temperature without hiding the claim. [E12, E17, E14]
8. When facts are many, put them in a short yes/no chain or a repeated sentence frame, then end on a measured line ("none of this is perfect, but we need to start somewhere"). Credit any borrowed line to its author each time. [E10, E3]

Cautions on fit: Harris's register is a campaign voice (urgent, some profanity in E10, "this is not okay"). The About essay should keep his structure and drop that heat. He also ends on a verdict (the default path is unacceptable); the essay's "understand rather than fear or dismiss" is a gentler stance than his, so quote him for the framing, not the conclusion.

## Log

Working folder: `C:\Users\Home\CoreWise\SafeAI.Watch-worktrees\about-film\.tmp\film\harris-voice\podcast\` (transcripts as `<slug>.txt`; quote lists `quotes.json`, `quotes2.json`, `quotes3.json`; checkers `chk.mjs`, `chk2.mjs`, `chk3.mjs`).

Fetched:

| URL | Route | Result |
|---|---|---|
| `https://centerforhumanetechnology.substack.com/api/v1/archive?sort=new&limit=50&offset=0,50,100` | curl | 123 posts back to 2022-02-10; used to list 2025 and 2026 posts |
| `https://centerforhumanetechnology.substack.com/api/v1/archive?search=<term>` | curl | used to find slugs for AI Doc, Davos, roadmap, Meta, Possible, Into the Machine, Future of Work, game theory |
| `https://centerforhumanetechnology.substack.com/api/v1/posts/<slug>` for the 18 slugs in the table, plus `feed-drop-possible-with-reid-hoffman`, `the-ai-doc-premieres-at-sundance`, `ai-and-the-future-of-work` | `get.mjs` (Node fetch) | 200; full text body saved |
| `https://tobias.substack.com/api/v1/posts/tristan-harris-spooky-new-ai-abilities` | curl | Metadata only (title, date 2025-10-31); no YouTube link in body |
| `https://www.humanetech.com/podcast?page=2` to `?page=6` | `fetch.mjs` (headless Chrome) | Episode lists for episodes 116 to 136; used to find episodes the Substack archive search missed |
| `https://www.humanetech.com/podcast/feed-drop-into-the-machine-with-tobias-rose-stockwell` | `fetch.mjs` | Show notes; no video link |
| `https://www.humanetech.com/podcast/our-ai-town-hall-with-oprah-winfrey` | `fetch.mjs` | Show notes only (bonus episode, 2026-04-09); no transcript |
| Web search for the Rose-Stockwell video | WebSearch, `yt-dlp ytsearch` | Found the audio/Spotify page only; no YouTube copy located |

Final check (`final-check.mjs`): every block quote and every quoted table string in this file (118 strings) matches the saved transcript text. Four table labels that were not verbatim were de-quoted.

Not read, and why:
- "FEED DROP: Possible with Reid Hoffman and Aria Finger" (2026-02-05): the transcript has no Harris turns (Aza on the show).
- "AGI Beyond the Buzz" (2025-04-30), "The Narrow Path: Sam Hammond" (2025-06-12): Aza hosts, no Harris turns.
- "AI and the Future of Work" (2025-12-04, Kinder and Mollick): the transcript has no `Tristan` turns.
- "America and China Are Racing to Different AI Futures" (2025-12-18), "Attachment Hacking and the Rise of AI Psychosis" (ep. 124, date not checked), "How OpenAI's ChatGPT Guided a Teen to His Death" (2025-08-26): guest-led topics off the thesis; not fetched.
- Lead for the video slice: "Our AI Town Hall with Oprah Winfrey" (The Oprah Podcast, taped before a live audience, bonus episode 2026-04-09). Plain-language, general-audience delivery from Harris and Aza; no CHT transcript, and auto-captions would carry no speaker labels, so it needs the "solo or clearly identified" check before use.
- Middle of E13 and E14, and the guest-heavy middle of E16 and E17: located by keyword search over Harris's turns, not read in full.
- Podcast audio and video not listened to. Substack transcripts are CHT-edited, so small wording differences from the audio are possible.
- Quotes touch unverified news facts (e.g. "13% drop" for entry-level work, Anthropic and Department of War events, "18 months to recursive self-improvement" in E3 by guests). None is used here as a fact.
