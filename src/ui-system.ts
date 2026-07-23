import {
  createSystem,
  World,
  Entity,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  eq,
} from '@iwsdk/core';
import { GameSystem, ACHIEVEMENTS, saveSave, Difficulty } from './game-system';

export class UISystem extends createSystem({
  menuPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/menu.json')] },
  hudPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/hud.json')] },
  resultsPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/results.json')] },
  levelSelectPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/levelselect.json')] },
  settingsPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/settings.json')] },
  pausePanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pause.json')] },
  achievementsPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/achpanel.json')] },
  tutorialPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/tutorial.json')] },
}) {
  world!: World;
  game!: GameSystem;
  panelEntities: Record<string, Entity> = {};
  panelPositions: Record<string, [number, number, number]> = {};
  lastState = '';
  lastMoves = -1;
  lastTimer = -1;
  hudDoc: UIKitDocument | null = null;
  resultsDoc: UIKitDocument | null = null;
  levelSelectDoc: UIKitDocument | null = null;
  settingsDoc: UIKitDocument | null = null;
  achievementsDoc: UIKitDocument | null = null;

  setRefs(refs: { world: World; game: GameSystem; panelEntities: Record<string, Entity>; panelPositions: Record<string, [number, number, number]> }) {
    this.world = refs.world;
    this.game = refs.game;
    this.panelEntities = refs.panelEntities;
    this.panelPositions = refs.panelPositions;
    this.game.onStateChange = () => this.onStateChange();
    this.queries.menuPanel.subscribe('qualify', (e) => this.onMenuReady(e));
    this.queries.hudPanel.subscribe('qualify', (e) => this.onHudReady(e));
    this.queries.resultsPanel.subscribe('qualify', (e) => this.onResultsReady(e));
    this.queries.levelSelectPanel.subscribe('qualify', (e) => this.onLevelSelectReady(e));
    this.queries.settingsPanel.subscribe('qualify', (e) => this.onSettingsReady(e));
    this.queries.pausePanel.subscribe('qualify', (e) => this.onPauseReady(e));
    this.queries.achievementsPanel.subscribe('qualify', (e) => this.onAchievementsReady(e));
    this.queries.tutorialPanel.subscribe('qualify', (e) => this.onTutorialReady(e));
  }

  getDoc(e: Entity): UIKitDocument | null {
    return (e.getValue(PanelDocument, 'document') as UIKitDocument) || null;
  }

  setText(doc: UIKitDocument | null, id: string, text: string) {
    if (!doc) return;
    (doc.getElementById(id) as UIKit.Text | undefined)?.setProperties({ text });
  }

  showPanel(key: string, show: boolean) {
    const entity = this.panelEntities[key];
    const pos = this.panelPositions[key];
    if (!entity || !pos) return;
    entity.object3D!.position.set(pos[0], show ? pos[1] : -50, pos[2]);
  }

  onStateChange() {
    const s = this.game.state;
    if (s === this.lastState) return;
    this.lastState = s;
    this.showPanel('menu', s === 'menu');
    this.showPanel('hud', s === 'playing');
    this.showPanel('results', s === 'won');
    this.showPanel('levelSelect', s === 'levelselect');
    this.showPanel('settings', s === 'settings');
    this.showPanel('pause', s === 'paused');
    this.showPanel('achievements', s === 'achievements');
    this.showPanel('tutorial', s === 'tutorial');
    if (s === 'won') this.updateResults();
  }

  onMenuReady(e: Entity) {
    const d = this.getDoc(e);
    if (!d) return;
    (d.getElementById('btn-classic') as UIKit.Text)?.addEventListener('click', () => { this.game.mode = 'classic'; this.game.state = 'levelselect'; this.onStateChange(); this.updateLevelSelect(); });
    (d.getElementById('btn-speed') as UIKit.Text)?.addEventListener('click', () => { this.game.mode = 'speed'; this.game.state = 'levelselect'; this.onStateChange(); this.updateLevelSelect(); });
    (d.getElementById('btn-zen') as UIKit.Text)?.addEventListener('click', () => { this.game.mode = 'zen'; this.game.state = 'levelselect'; this.onStateChange(); this.updateLevelSelect(); });
    (d.getElementById('btn-challenge') as UIKit.Text)?.addEventListener('click', () => { this.game.mode = 'challenge'; this.game.state = 'levelselect'; this.onStateChange(); this.updateLevelSelect(); });
    (d.getElementById('btn-settings') as UIKit.Text)?.addEventListener('click', () => { this.game.state = 'settings'; this.onStateChange(); this.updateSettings(); });
    (d.getElementById('btn-achievements') as UIKit.Text)?.addEventListener('click', () => { this.game.state = 'achievements'; this.onStateChange(); this.updateAchievements(); });
    (d.getElementById('btn-tutorial') as UIKit.Text)?.addEventListener('click', () => { this.game.state = 'tutorial'; this.onStateChange(); });
  }

  onHudReady(e: Entity) {
    this.hudDoc = this.getDoc(e);
    if (!this.hudDoc) return;
    (this.hudDoc.getElementById('btn-undo') as UIKit.Text)?.addEventListener('click', () => this.game.undoMove());
    (this.hudDoc.getElementById('btn-pause') as UIKit.Text)?.addEventListener('click', () => { this.game.state = 'paused'; this.onStateChange(); });
    (this.hudDoc.getElementById('btn-restart') as UIKit.Text)?.addEventListener('click', () => this.game.startGame(this.game.mode, this.game.difficulty, this.game.level));
  }

  onResultsReady(e: Entity) {
    this.resultsDoc = this.getDoc(e);
    if (!this.resultsDoc) return;
    (this.resultsDoc.getElementById('btn-next') as UIKit.Text)?.addEventListener('click', () => {
      let nl = this.game.level < 5 ? this.game.level + 1 : 1;
      let nd = this.game.difficulty;
      if (this.game.level >= 5) { const ds = ['easy', 'medium', 'hard'] as const; const i = ds.indexOf(this.game.difficulty); if (i < 2) nd = ds[i + 1]; }
      this.game.startGame(this.game.mode, nd, nl);
    });
    (this.resultsDoc.getElementById('btn-replay') as UIKit.Text)?.addEventListener('click', () => this.game.startGame(this.game.mode, this.game.difficulty, this.game.level));
    (this.resultsDoc.getElementById('btn-menu') as UIKit.Text)?.addEventListener('click', () => { this.game.clearPieces(); this.game.state = 'menu'; this.onStateChange(); });
  }

  onLevelSelectReady(e: Entity) {
    this.levelSelectDoc = this.getDoc(e);
    if (!this.levelSelectDoc) return;
    const d = this.levelSelectDoc;
    (d.getElementById('btn-easy') as UIKit.Text)?.addEventListener('click', () => { this.game.difficulty = 'easy'; this.updateLevelSelect(); });
    (d.getElementById('btn-medium') as UIKit.Text)?.addEventListener('click', () => { this.game.difficulty = 'medium'; this.updateLevelSelect(); });
    (d.getElementById('btn-hard') as UIKit.Text)?.addEventListener('click', () => { this.game.difficulty = 'hard'; this.updateLevelSelect(); });
    (d.getElementById('btn-back') as UIKit.Text)?.addEventListener('click', () => { this.game.state = 'menu'; this.onStateChange(); });
    for (let i = 1; i <= 5; i++) {
      const lvl = i;
      (d.getElementById(`btn-level-${i}`) as UIKit.Text)?.addEventListener('click', () => this.game.startGame(this.game.mode, this.game.difficulty, lvl));
    }
  }

  onSettingsReady(e: Entity) {
    this.settingsDoc = this.getDoc(e);
    if (!this.settingsDoc) return;
    for (const s of ['cyan', 'green', 'magenta', 'gold']) {
      (this.settingsDoc.getElementById(`btn-${s}`) as UIKit.Text)?.addEventListener('click', () => { this.game.setColorScheme(s); this.updateSettings(); });
    }
    (this.settingsDoc.getElementById('btn-back') as UIKit.Text)?.addEventListener('click', () => { this.game.state = 'menu'; this.onStateChange(); });
  }

  onPauseReady(e: Entity) {
    const d = this.getDoc(e);
    if (!d) return;
    (d.getElementById('btn-resume') as UIKit.Text)?.addEventListener('click', () => { this.game.state = 'playing'; this.onStateChange(); });
    (d.getElementById('btn-restart') as UIKit.Text)?.addEventListener('click', () => this.game.startGame(this.game.mode, this.game.difficulty, this.game.level));
    (d.getElementById('btn-quit') as UIKit.Text)?.addEventListener('click', () => { this.game.clearPieces(); this.game.state = 'menu'; this.onStateChange(); });
  }

  onAchievementsReady(e: Entity) {
    this.achievementsDoc = this.getDoc(e);
    if (!this.achievementsDoc) return;
    (this.achievementsDoc.getElementById('btn-back') as UIKit.Text)?.addEventListener('click', () => { this.game.state = 'menu'; this.onStateChange(); });
  }

  onTutorialReady(e: Entity) {
    const d = this.getDoc(e);
    if (!d) return;
    (d.getElementById('btn-back') as UIKit.Text)?.addEventListener('click', () => { this.game.state = 'menu'; this.onStateChange(); });
  }

  updateLevelSelect() {
    if (!this.levelSelectDoc) return;
    const names: Record<string, string> = { classic: 'Classic', speed: 'Speed', zen: 'Zen', challenge: 'Challenge' };
    this.setText(this.levelSelectDoc, 'title', `${names[this.game.mode] || 'Classic'} Mode`);
    for (const d of ['easy', 'medium', 'hard']) {
      (this.levelSelectDoc.getElementById(`btn-${d}`) as UIKit.Text)?.setProperties({ backgroundColor: d === this.game.difficulty ? '#00aacc' : '#1a1a3a' });
    }
    for (let i = 1; i <= 5; i++) {
      const k = `${this.game.mode}-${this.game.difficulty}-${i}`;
      const b = this.game.save.bestMoves[k];
      (this.levelSelectDoc.getElementById(`btn-level-${i}`) as UIKit.Text)?.setProperties({ text: b ? `Level ${i} -- ${b} moves` : `Level ${i}` });
    }
  }

  updateSettings() {
    if (!this.settingsDoc) return;
    for (const s of ['cyan', 'green', 'magenta', 'gold']) {
      (this.settingsDoc.getElementById(`btn-${s}`) as UIKit.Text)?.setProperties({ backgroundColor: s === this.game.save.colorScheme ? '#00aacc' : '#1a1a3a' });
    }
  }

  updateAchievements() {
    if (!this.achievementsDoc) return;
    const ul = Object.keys(this.game.save.achievements).filter(k => this.game.save.achievements[k]).length;
    this.setText(this.achievementsDoc, 'ach-count', `${ul} / ${ACHIEVEMENTS.length}`);
    for (let i = 0; i < ACHIEVEMENTS.length && i < 20; i++) {
      const a = ACHIEVEMENTS[i], done = this.game.save.achievements[a.id];
      (this.achievementsDoc.getElementById(`ach-${i}`) as UIKit.Text)?.setProperties({ text: `${done ? '[*]' : '[ ]'} ${a.name} - ${a.desc}` });
    }
  }

  updateResults() {
    if (!this.resultsDoc) return;
    const won = this.game.isSolved();
    this.setText(this.resultsDoc, 'result-title', won ? 'Tangram Complete!' : 'Time/Moves Up!');
    if (won) {
      const st = this.game.getStars();
      this.setText(this.resultsDoc, 'stars', '*'.repeat(st) + '-'.repeat(3 - st));
      this.setText(this.resultsDoc, 'result-moves', `Moves: ${this.game.moves}`);
      const m = Math.floor(this.game.timer / 60), s = Math.floor(this.game.timer % 60);
      this.setText(this.resultsDoc, 'result-time', `Time: ${m}:${s < 10 ? '0' : ''}${s}`);
      const k = `${this.game.mode}-${this.game.difficulty}-${this.game.level}`;
      const b = this.game.save.bestMoves[k];
      this.setText(this.resultsDoc, 'result-best', b ? `Best: ${b} moves` : '');
    } else {
      this.setText(this.resultsDoc, 'stars', '');
      this.setText(this.resultsDoc, 'result-moves', `Moves: ${this.game.moves}`);
      this.setText(this.resultsDoc, 'result-time', 'Try again!');
      this.setText(this.resultsDoc, 'result-best', '');
    }
  }

  update() {
    if (this.game.state === 'playing' && this.hudDoc) {
      const mv = this.game.moves;
      if (mv !== this.lastMoves) {
        this.lastMoves = mv;
        this.setText(this.hudDoc, 'moves', this.game.mode === 'challenge' && this.game.moveLimit > 0 ? `Moves: ${mv} / ${this.game.moveLimit}` : `Moves: ${mv}`);
      }
      const ti = Math.floor(this.game.timer);
      if (ti !== this.lastTimer) {
        this.lastTimer = ti;
        if (this.game.mode === 'speed') {
          const rem = Math.max(0, 120 - ti);
          this.setText(this.hudDoc, 'timer', `${Math.floor(rem / 60)}:${(rem % 60 < 10 ? '0' : '')}${rem % 60}`);
        } else if (this.game.mode !== 'zen') {
          this.setText(this.hudDoc, 'timer', `${Math.floor(ti / 60)}:${(ti % 60 < 10 ? '0' : '')}${ti % 60}`);
        } else this.setText(this.hudDoc, 'timer', 'Zen');
      }
      const dn: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
      this.setText(this.hudDoc, 'level', `${dn[this.game.difficulty]} Lv${this.game.level}`);
    }
  }
}
