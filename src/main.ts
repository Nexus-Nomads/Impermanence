import { Plugin, PluginSettingTab, Setting, App, TFile } from "obsidian";

// ─── L33t Map ────────────────────────────────────────────────
const L33T_MAP: Record<string, string> = {
	a: "4",
	e: "3",
	i: "1",
	o: "0",
	t: "7",
	s: "5",
	b: "8",
	g: "9",
};

const ELIGIBLE_CHARS = new Set(Object.keys(L33T_MAP));

// ─── Settings ────────────────────────────────────────────────
interface L33tSettings {
	enabled: boolean;
	decayRate: number; // letters per cycle
	intervalHours: number; // hours between decay cycles
	excludedFolders: string[];
	lastDecayTime: number; // epoch ms
}

const DEFAULT_SETTINGS: L33tSettings = {
	enabled: true,
	decayRate: 1,
	intervalHours: 24,
	excludedFolders: [],
	lastDecayTime: 0,
};

// ─── Protected Zone Detection ────────────────────────────────
//
// We must never touch:
//   - YAML frontmatter (between opening and closing ---)
//   - Wikilinks [[...]]
//   - Markdown links [text](url)
//   - Inline code `...`
//   - Code blocks ```...```
//   - Tags #word
//   - URLs starting with http(s)://
//   - HTML tags <...>
//
// Strategy: build a set of character indices that are protected,
// then only consider positions outside that set.

function getProtectedRanges(text: string): [number, number][] {
	const ranges: [number, number][] = [];

	const patterns: RegExp[] = [
		// YAML frontmatter — only at the very start of the file
		/^---\r?\n[\s\S]*?\r?\n---/m,
		// Fenced code blocks (``` or ~~~)
		/(`{3,}|~{3,})[\s\S]*?\1/g,
		// Inline code
		/`[^`\n]+`/g,
		// Wikilinks [[...]]
		/\[\[[^\]]*\]\]/g,
		// Markdown links [text](url)
		/\[[^\]]*\]\([^)]*\)/g,
		// URLs
		/https?:\/\/[^\s)>\]]+/g,
		// Tags — # followed by word chars (but not headings: # at line start followed by space)
		/(?:\s|^)#[^\s#]+/gm,
		// HTML tags
		/<[^>]+>/g,
		// Obsidian embeds ![[...]]
		/!\[\[[^\]]*\]\]/g,
		// Obsidian properties/aliases at top (handled by frontmatter, but just in case)
	];

	for (const pattern of patterns) {
		// Clone the regex so we don't mutate state
		const re = new RegExp(pattern.source, pattern.flags);
		let match;
		if (re.global) {
			while ((match = re.exec(text)) !== null) {
				ranges.push([match.index, match.index + match[0].length]);
			}
		} else {
			match = re.exec(text);
			if (match) {
				ranges.push([match.index, match.index + match[0].length]);
			}
		}
	}

	return ranges;
}

function isProtected(index: number, ranges: [number, number][]): boolean {
	for (const [start, end] of ranges) {
		if (index >= start && index < end) return true;
	}
	return false;
}

// ─── Candidate Finding ───────────────────────────────────────
//
// Returns indices of characters eligible for l33t replacement:
// lowercase letters that exist in L33T_MAP and are NOT in a protected range.

function isSingleLetterWord(text: string, index: number): boolean {
	const before = index === 0 || /\s/.test(text[index - 1]);
	const after = index === text.length - 1 || /\s/.test(text[index + 1]);
	return before && after;
}

function findCandidates(text: string): number[] {
	const protectedRanges = getProtectedRanges(text);
	const candidates: number[] = [];

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (
			ELIGIBLE_CHARS.has(ch) &&
			!isProtected(i, protectedRanges) &&
			!isSingleLetterWord(text, i)
		) {
			candidates.push(i);
		}
	}

	return candidates;
}

// ─── Note Selection (Staleness-Weighted) ─────────────────────
//
// Notes untouched longest have the highest probability of being selected.
// Weight = days since last modification. Minimum weight = 1 (today's notes
// still have a small chance).

function weightedRandomSelect(files: TFile[]): TFile | null {
	if (files.length === 0) return null;

	const now = Date.now();
	const dayMs = 86400000;

	const weights = files.map((f) => {
		const daysSinceModified = Math.max(1, Math.floor((now - f.stat.mtime) / dayMs));
		return daysSinceModified;
	});

	const totalWeight = weights.reduce((sum, w) => sum + w, 0);
	let roll = Math.random() * totalWeight;

	for (let i = 0; i < files.length; i++) {
		roll -= weights[i];
		if (roll <= 0) return files[i];
	}

	return files[files.length - 1];
}

// ─── The Decay ───────────────────────────────────────────────

function applyDecay(text: string, count: number): string {
	const candidates = findCandidates(text);
	if (candidates.length === 0) return text;

	// Pick `count` unique random positions
	const picks: Set<number> = new Set();
	const available = [...candidates];

	for (let i = 0; i < Math.min(count, available.length); i++) {
		const idx = Math.floor(Math.random() * available.length);
		picks.add(available[idx]);
		available.splice(idx, 1);
	}

	const chars = text.split("");
	for (const pos of picks) {
		const original = chars[pos];
		if (L33T_MAP[original]) {
			chars[pos] = L33T_MAP[original];
		}
	}

	return chars.join("");
}

// ─── Plugin ──────────────────────────────────────────────────

export default class L33tPlugin extends Plugin {
	settings: L33tSettings = DEFAULT_SETTINGS;
	private timerRef: number | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new L33tSettingTab(this.app, this));
		this.scheduleNextDecay();
	}

	onunload() {
		if (this.timerRef !== null) {
			window.clearTimeout(this.timerRef);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// ── Scheduling ──

	private scheduleNextDecay() {
		if (this.timerRef !== null) {
			window.clearTimeout(this.timerRef);
		}

		if (!this.settings.enabled) return;

		const now = Date.now();
		const intervalMs = this.settings.intervalHours * 3600000;
		const elapsed = now - this.settings.lastDecayTime;
		const remaining = Math.max(0, intervalMs - elapsed);

		// If interval has already passed (e.g. Obsidian was closed), fire immediately
		this.timerRef = window.setTimeout(() => {
			void this.performDecay();
		}, remaining);

		// Register so Obsidian can clean up
		this.registerInterval(this.timerRef);
	}

	// ── The Core ──

	async performDecay() {
		if (!this.settings.enabled) return;

		const files = this.getEligibleFiles();
		const target = weightedRandomSelect(files);

		if (target) {
			const content = await this.app.vault.read(target);
			const decayed = applyDecay(content, this.settings.decayRate);

			if (decayed !== content) {
				await this.app.vault.modify(target, decayed);
			}
		}

		// Update timestamp and schedule next
		this.settings.lastDecayTime = Date.now();
		await this.saveSettings();
		this.scheduleNextDecay();
	}

	private getEligibleFiles(): TFile[] {
		const excluded = this.settings.excludedFolders.map((f) =>
			f.toLowerCase().replace(/\/$/, "")
		);

		return this.app.vault.getMarkdownFiles().filter((file) => {
			const path = file.path.toLowerCase();
			return !excluded.some(
				(ex) => path.startsWith(ex + "/") || path === ex
			);
		});
	}
}

// ─── Settings Tab ────────────────────────────────────────────

class L33tSettingTab extends PluginSettingTab {
	plugin: L33tPlugin;

	constructor(app: App, plugin: L33tPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Impermanence").setHeading();
		containerEl.createEl("p", {
			text: "Your notes decay. Slowly. Silently. One letter per day.",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("Enable decay")
			.setDesc("Turn the entropy on or off.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Decay rate")
			.setDesc("Letters replaced per cycle.")
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.decayRate))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num >= 1) {
							this.plugin.settings.decayRate = num;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Interval (hours)")
			.setDesc("Hours between each decay cycle.")
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.intervalHours))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num >= 1) {
							this.plugin.settings.intervalHours = num;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Excluded folders")
			.setDesc(`Comma-separated folder paths to skip (e.g. templates, ${this.app.vault.configDir}).`)
			.addText((text) =>
				text
					.setPlaceholder("templates, archive")
					.setValue(this.plugin.settings.excludedFolders.join(", "))
					.onChange(async (value) => {
						this.plugin.settings.excludedFolders = value
							.split(",")
							.map((s) => s.trim())
							.filter((s) => s.length > 0);
						await this.plugin.saveSettings();
					})
			);

		// Manual trigger for testing
		new Setting(containerEl)
			.setName("Trigger decay now")
			.setDesc("For testing. Fires one decay cycle immediately.")
			.addButton((btn) =>
				btn.setButtonText("Decay").onClick(async () => {
					await this.plugin.performDecay();
				})
			);

		// ── Support ──
		new Setting(containerEl).setName("Support").setHeading();

		const donateDiv = containerEl.createDiv({ cls: "setting-item" });
		const infoDiv = donateDiv.createDiv({ cls: "setting-item-info" });
		infoDiv.createDiv({ cls: "setting-item-name", text: "Donate" });
		infoDiv.createDiv({
			cls: "setting-item-description",
			text: "If you like this plugin, consider donating to support continued development.",
		});
		const controlDiv = donateDiv.createDiv({ cls: "setting-item-control" });
		const link = controlDiv.createEl("a", {
			href: "https://ko-fi.com/C0C01TNH9S",
			attr: { target: "_blank" },
		});
		link.createEl("img", {
			attr: {
				src: "https://storage.ko-fi.com/cdn/kofi6.png?v=6",
				alt: "Buy Me a Coffee at ko-fi.com",
				style: "border:0px;height:36px;",
			},
		});
	}
}
