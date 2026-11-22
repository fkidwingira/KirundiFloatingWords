# Kirundi Floating Words Game — playable prototype

## 1. Try the game

Unzip the package. Open a terminal inside `KirundiFloatingWords` and run:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser. On a Mac you can also double-click `START-MAC.command` (you may need to allow it in macOS security settings). On Windows with Python installed, double-click `START-WINDOWS.bat`.

**Do not double-click `index.html` directly**: browsers usually block loading local JSON through `file://`. Use the local server above, or upload the entire folder to a static web host such as Netlify, GitHub Pages, or Cloudflare Pages.

## 2. Supply your own vocabulary — no code edits

Replace the **entire `vocabulary` folder** with your own folder containing:

```text
vocabulary/
  words.json
  audio/
    amazi.mp3
    umukate.mp3
    ...
```

Create `words.json` as a UTF-8 JSON array **ordered from easiest to hardest**. Each item requires four strings:

```json
[
  {"emoji": "💧", "english": "water", "kirundi": "amazi", "audio": "audio/amazi.mp3"},
  {"emoji": "🍞", "english": "bread", "kirundi": "umukate", "audio": "audio/umukate.mp3"}
]
```

Notes:
- **At least two distinct Kirundi words** are required.
- Every Kirundi answer must be unique in the dataset; the English translation is used for accessibility and validation, not shown during gameplay.
- The `audio` path is relative to `vocabulary/`, not the website root.
- Supply one pronunciation recording per word in MP3 format (WAV/OGG also work in supporting browsers).
- Use actual fluent-speaker recordings for publication. The bundled audio recordings are **machine-generated pronunciation demos**, not verified Kirundi pronunciation.
- You can reorder, add, or delete words just by editing `words.json` and the audio folder. No edits to `src/` or `index.html` are needed.
- Keep each emoji unambiguous and visually distinct where possible. A repeated emoji for different words makes the prompt ambiguous.
- Reload the page after replacing the folder. On the published site, redeploy/upload the new folder contents.

### Fastest way to give ChatGPT your inputs

Upload a spreadsheet/CSV with columns `emoji`, `english`, `kirundi`, and optionally `audio_filename`, **plus a ZIP of MP3 audio recordings**. Ask ChatGPT to build your replacement `vocabulary` folder; missing audio can be identified and reported. You can alternatively upload a complete `vocabulary` ZIP matching the structure above.

## 3. What the prototype implements

- 100-question sessions, scoring, retry on wrong taps, correct/wrong sound effects, pronunciation audio. A correct answer advances immediately to the next emoji; no waiting for the word to reach the top. When a word is missed, its correct spelling is highlighted and its pronunciation plays fully before the next emoji appears.
- Four score-based difficulty levels with 2/3/4/5 options, faster upward movement, more similar decoys, larger vocabulary pool.
- Random target selection, and target does not repeat immediately when possible.
- Runs fully in the browser; no accounts, server backend, or database.
- Changes to difficulty constants: `src/config.js`.

## 4. Pause, Stop and Restart

During a game, use the controls above the play area:

- **Pause:** freezes all floating words and pauses pronunciation audio. Choose **Resume** to continue from exactly where you left off. You can also Stop or Restart from the pause screen.
- **Stop:** ends the current game and shows your score; you can start a new game with **Play again**.
- **Restart:** immediately begins a new 100-question game at zero points.

The controls are unavailable on the initial start screen and after a session has ended.

## 5. Known MVP limitations

- Vocabulary ordering and word similarity are simple heuristics. A small or repetitive vocabulary set may make some decoys obvious.
- A 100-question game can reach the final level after 15 correct answers.
- The demo Kirundi audio is unverified synthetic speech; replace before use in teaching.
- No persistent scores, user accounts, or student progress tracking.


## Version 4 fix (100 questions and missed answers)
- A session has 100 questions.
- On a missed word, the correct answer is highlighted in the middle of the screen and its pronunciation plays **before** the next emoji.
- Pronunciation is played through the browser's AudioContext, unlocked when you press Start; this avoids Safari blocking missed-answer audio.
- Vocabulary MP3 files are requested with `cache: no-store` so replacing recordings takes effect on reload.
- The website uses versioned JavaScript/CSS URLs to prevent an old cached game from appearing.
- To update an existing installation, replace `index.html` and the entire `src` folder but **do not replace the `vocabulary` folder**.


## Version 5: Correct-answer pronunciation

After a correct answer, the game now holds the same emoji and highlights the selected word until the pronunciation recording finishes playing. Only then does it proceed to the next emoji. Missed-answer playback, Pause/Stop/Restart, and the 100-question session remain unchanged. A missing/unplayable recording does not block advancement.


## Version 6 gameplay update

- No target vocabulary word can repeat within the previous five questions when the dataset contains at least six distinct Kirundi words. The easiest six are unlocked from the beginning to enforce that rule. With 2–5 total distinct words, a five-word no-repeat window is mathematically impossible; the game repeats the least recently shown word.
- Floating-word movement speed is constant at every difficulty level (46 pixels/second). Increasing difficulty moves the starting position upward, shortening the distance to the top; it does not increase the movement speed.
- Decoys may still reappear as choices; the no-repeat rule applies to the target emoji/word.
- All custom vocabulary and audio paths are unchanged.
