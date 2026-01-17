"use client";
import { useEffect, useState } from "react";

/* ---------------- TYPES & CONSTANTS ---------------- */
type Tile = "P" | "T" | "M" | "B" | ".";
type MapEnemy = { id: string; name: string; x: number; y: number; alive: boolean };

const TILE_SIZE = 64;
const STORAGE_KEY = "shadow_state";
const VISION_RADIUS = 2;

const SHADOW_MAP: Tile[][] = [
  ["P", ".", ".", ".", "."],
  [".", "T", "T", "T", "."],
  [".", "T", "M", ".", "."],
  [".", "T", ".", "T", "."],
  [".", ".", ".", "M", "B"],
];

const DEFAULT_ENEMIES: MapEnemy[] = [
  { id: "sh1", name: "Shadow Wraith", x: 2, y: 2, alive: true },
  { id: "sh2", name: "Dark Knight", x: 3, y: 4, alive: true },
];

export default function ShadowDungeonPage() {
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [enemies, setEnemies] = useState<MapEnemy[]>(DEFAULT_ENEMIES);
  const [revealed, setRevealed] = useState<boolean[][]>(() => SHADOW_MAP.map(r => r.map(() => false)));
  const [hasFinished, setHasFinished] = useState(false);

  /* ---------------- LOAD & SYNC ---------------- */
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const result = localStorage.getItem("lastBattleResult");
    const defeatedId = localStorage.getItem("lastDefeatedEnemyId");
    const posRaw = localStorage.getItem("lastEnemyPosition");

    let currentEnemies = [...DEFAULT_ENEMIES];
    let currentPlayer = { x: 0, y: 0 };
    let currentRevealed = SHADOW_MAP.map(row => row.map(() => false));

    if (raw) {
      const save = JSON.parse(raw);
      currentPlayer = save.player;
      currentEnemies = save.enemies;
      currentRevealed = save.revealed;
    }

    if (result === "win" && defeatedId) {
      currentEnemies = currentEnemies.map(e => e.id === defeatedId ? { ...e, alive: false } : e);
      if (posRaw) currentPlayer = JSON.parse(posRaw);
    }

    const finalRevealed = computeReveal(currentPlayer.x, currentPlayer.y, currentRevealed);
    setPlayer(currentPlayer);
    setEnemies(currentEnemies);
    setRevealed(finalRevealed);
    saveData(currentPlayer, currentEnemies, finalRevealed);

    localStorage.removeItem("lastBattleResult");
    localStorage.removeItem("lastDefeatedEnemyId");
  }, []);

  /* ---------------- HELPERS ---------------- */
  function saveData(p: any, e: any, r: any) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ player: p, enemies: e, revealed: r }));
  }

  function computeReveal(px: number, py: number, base: boolean[][]) {
    return base.map((row, y) => row.map((vis, x) => (Math.abs(px - x) <= VISION_RADIUS && Math.abs(py - y) <= VISION_RADIUS) || vis));
  }

  /* ---------------- PURSUIT LOGIC (AI Movement) ---------------- */
  function moveEnemies(px: number, py: number, currentEnemies: MapEnemy[]) {
    return currentEnemies.map(enemy => {
      if (!enemy.alive) return enemy;

      let nx = enemy.x;
      let ny = enemy.y;

      // Simple AI: Move 1 step closer on either X or Y axis
      if (nx < px) nx++;
      else if (nx > px) nx--;
      else if (ny < py) ny++;
      else if (ny > py) ny--;

      // Don't move into walls
      if (SHADOW_MAP[ny][nx] === "T") return enemy;

      return { ...enemy, x: nx, y: ny };
    });
  }

  /* ---------------- PLAYER MOVEMENT ---------------- */
  function move(dx: number, dy: number) {
    if (hasFinished) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (ny < 0 || ny >= SHADOW_MAP.length || nx < 0 || nx >= SHADOW_MAP[0].length || SHADOW_MAP[ny][nx] === "T") return;

    // 1. Move Player
    const newPos = { x: nx, y: ny };
    
    // 2. Check for encounter AFTER player moves
    let encounteredEnemy = enemies.find(e => e.x === nx && e.y === ny && e.alive);
    
    // 3. Move Enemies (Stalking mechanic)
    let updatedEnemies = moveEnemies(nx, ny, enemies);
    
    // 4. Check for encounter AFTER enemies move (they might step on you!)
    if (!encounteredEnemy) {
        encounteredEnemy = updatedEnemies.find(e => e.x === nx && e.y === ny && e.alive);
    }

    if (encounteredEnemy) {
      localStorage.setItem("currentEnemyId", encounteredEnemy.id);
      localStorage.setItem("lastEnemyPosition", JSON.stringify({ x: nx, y: ny }));
      // Use the updatedEnemies list for the save so positions stay consistent
      saveData(newPos, updatedEnemies, revealed);
      window.location.href = "/game/fight?biome=shadow";
      return;
    }

    const newRevealed = computeReveal(nx, ny, revealed);
    setPlayer(newPos);
    setEnemies(updatedEnemies);
    setRevealed(newRevealed);
    saveData(newPos, updatedEnemies, newRevealed);

    if (SHADOW_MAP[ny][nx] === "B") setHasFinished(true);
  }

  return (
    <div style={S.bgShadow}>
      <div style={{ position: "relative" }}>
        <h1 style={S.title}>🌑 Shadow Dungeon</h1>
        
        <div style={S.grid}>
          {SHADOW_MAP.map((row, y) => row.map((cell, x) => {
            const isPlayer = player.x === x && player.y === y;
            const isRevealed = revealed[y][x];
            const enemy = enemies.find(e => e.x === x && e.y === y);

            return (
              <div key={`${x}-${y}`} style={S.tile}>
                {isRevealed ? (
                  <>
                    {isPlayer && "🕯️"}
                    {!isPlayer && cell === "T" && "🧱"}
                    {!isPlayer && enemy?.alive && "👁️"}
                    {!isPlayer && enemy && !enemy.alive && "💀"}
                    {!isPlayer && cell === "B" && "💎"}
                  </>
                ) : <div style={S.fog} />}
              </div>
            );
          }))}
        </div>

        <div style={S.controls}>
          <div /><button style={S.btn} onClick={() => move(0, -1)}>⬆️</button><div />
          <button style={S.btn} onClick={() => move(-1, 0)}>⬅️</button>
          <button style={S.btn} onClick={() => move(0, 1)}>⬇️</button>
          <button style={S.btn} onClick={() => move(1, 0)}>➡️</button>
        </div>

        {hasFinished && (
          <div style={S.overlay}>
            <div style={S.card}>
              <h2 style={{color: "#a855f7"}}>🔮 REALM ESCAPED</h2>
              <button style={S.finBtn} onClick={() => window.location.href="/game"}>LEAVE SHADOWS</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const S: Record<string, React.CSSProperties> = {
  bgShadow: { minHeight: "100vh", backgroundImage: "url('/biomes/shadow-fight.png')", display: "flex", justifyContent: "center", alignItems: "center", color: "#e9d5ff" },
  title: { textAlign: "center", textShadow: "0 0 10px #7e22ce", marginBottom: 20 },
  grid: { display: "grid", gridTemplateColumns: `repeat(5, ${TILE_SIZE}px)`, gap: 4, background: "#000", padding: 10, border: "2px solid #6b21a8" },
  tile: { width: TILE_SIZE, height: TILE_SIZE, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, background: "#1e1b4b" },
  fog: { position: "absolute", inset: 0, background: "#000" },
  controls: { display: "grid", gridTemplateColumns: "repeat(3, 60px)", gap: 10, justifyContent: "center", marginTop: 20 },
  btn: { width: 60, height: 60, background: "#4c1d95", color: "white", border: "1px solid #7e22ce", borderRadius: 8, cursor: "pointer" },
  overlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10 },
  card: { padding: 40, background: "#2e1065", border: "2px solid #a855f7", textAlign: "center", borderRadius: 16 },
  finBtn: { marginTop: 20, padding: "10px 20px", background: "#a855f7", border: "none", fontWeight: "bold", cursor: "pointer", color: "white" }
};