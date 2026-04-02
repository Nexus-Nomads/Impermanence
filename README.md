# Impermanence

An Obsidian plugin for practicing impermanence in your second brain.

> *"They treat their notes like monuments, when they should treat them like morning dew."*

---

## What It Does

Your notes decay. Slowly. Silently. One letter per day.

Every cycle, the plugin selects a random note — weighted toward the ones you haven't visited in a while — and replaces a single character with its l33t equivalent. `meditation` becomes `meditati0n`. `thought` becomes `7hought`. `obsession` becomes `o85ession`.

No notification. No log. No fanfare. Just a quiet shift in the text you thought was permanent.

You either notice or you don't. **Catching yourself is the practice.**

---

## The Practice

When you discover that a character has changed, you pause. In that pause lives the practice.

The character breaks the trance of permanence. You remember: nothing remains — not even these precious crystallized thoughts.

See how easily form shifts? Notice how meaning persists despite change? Feel the impulse to fix it, then feel what lies beneath that impulse. The grasping. The desire for control. The illusion of permanence.

Now let go. Or don't. Either way, you've practiced.

---

## The Paradox

By allowing your notes to decay slightly, you preserve them more deeply.

The fear of loss makes you visit them more often. The imperfection invites correction, which requires reading, which deepens encoding. What appears as corruption becomes cultivation.

The bug *is* the feature.

---

## How It Works

- Every cycle (default: 24 hours), one random note is selected
- Notes untouched longest have the highest probability of being chosen
- One letter is replaced with its l33t equivalent
- Links, tags, frontmatter, code blocks, URLs, and embeds are never touched
- Single-letter words are never touched
- It does not notify you. It does not log. It just does it.

### The L33t Map

| Original | Becomes |
|----------|---------|
| a | 4 |
| e | 3 |
| i | 1 |
| o | 0 |
| t | 7 |
| s | 5 |
| b | 8 |
| g | 9 |

At some point the word is still readable. Then it tips. Then it's noise.

---

## Installation

### Manual

1. Download the latest release from [Releases](https://github.com/Nexus-Nomads/Impermanence/releases)
2. Extract into your vault's `.obsidian/plugins/obsidian-l33t/` folder
3. Enable **Impermanence** in Settings → Community Plugins

### Build from Source

```bash
git clone git@github.com:Nexus-Nomads/Impermanence.git
cd Impermanence
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/obsidian-l33t/` folder.

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Enable decay | On | Turn the entropy on or off |
| Decay rate | 1 | Letters replaced per cycle (1–5) |
| Interval | 24 hours | Hours between each decay cycle (1–168) |
| Excluded folders | — | Comma-separated folder paths to skip |
| Trigger decay now | — | Manual trigger for testing |

---

## What It Protects

The web must hold. These are never touched:

- YAML frontmatter
- Wikilinks `[[...]]` and embeds `![[...]]`
- Markdown links `[text](url)`
- Code blocks and inline code
- Tags `#tag`
- URLs
- HTML tags
- Single-letter words

Everything else is fair game. Everything else flows.

---

## Philosophy

The natural world knows no permanence. Every leaf returns to soil. Every wave reshapes the shore. Your notes, too, must return to the cycle.

This plugin doesn't destroy — it reminds. One character shifts, one letter transforms, like a single cell in your body replacing itself. The message remains readable, yet subtly changed.

The ancient dharma mice of Tibet could nibble wisdom daily because it grew everywhere like grass. But you — you modern dharma camels — must store it differently, carry it through deserts of distraction.

So we wondered: how do we weave impermanence meditation into the very fabric of knowledge management? How do we make PKM practice into dharma practice without anyone noticing the transformation?

The answer came like morning dew forming on silk: **Let the notes themselves become the teacher.**

---

## The Oldest Truth

*The web remembers everything, yet holds nothing.*
*Each morning brings new dew.*
*Each character shift whispers the oldest truth:*
*This too shall pass.*

---

## License

MIT

---

*What if your notes reminded you they're temporary?*
