"use client";
import { useEffect, useState } from "react";

/* ---------------- TYPES ---------------- */
type Tile = "P" | "T" | "M" | "B" | "."; 
type MapEnemy = { id: string; name: string; x: number; y: number; alive: boolean };

/* ---------------- CONSTANTS ---------------- */
const TILE_SIZE = 64;
const STORAGE_KEY = "lava_state";
const VISION_RADIUS = 1; // Smoke and ash make it hard to see!

const LAVA_MAP: Tile[][] = [
  ["P", ".", ".", "T", "."],
  [".", "T", "M", ".", "."],
  [".", ".", ".", "T", "."],
  ["T", "M", ".", ".", "."],
  [".", ".", "T", ".", "B"],
];

const DEFAULT_ENEMIES: MapEnemy[] = [
  { id: "lava1", name: "Magma Imp", x: 2, y: 1, alive: true },
  { id: "lava2", name: "Fire Beast", x: 1, y: 3, alive: true },
];

export default function LavaCavernPage() {
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [enemies, setEnemies] = useState<MapEnemy[]>(DEFAULT_ENEMIES);
  const [revealed, setRevealed] = useState<boolean[][]>(() => LAVA_MAP.map(r => r.map(() => false)));
  const [crackedTiles, setCrackedTiles] = useState<{x: number, y: number}[]>([]);
  const [hasFinished, setHasFinished] = useState(false);

  /* ---------------- LOAD & SYNC ---------------- */
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const result = localStorage.getItem("lastBattleResult");
    const defeatedId = localStorage.getItem("lastDefeatedEnemyId");
    const posRaw = localStorage.getItem("lastEnemyPosition");

    let currentEnemies = [...DEFAULT_ENEMIES];
    let currentPlayer = { x: 0, y: 0 };
    let currentRevealed = LAVA_MAP.map(row => row.map(() => false));
    let currentCracked: {x: number, y: number}[] = [];

    if (raw) {
      const save = JSON.parse(raw);
      currentPlayer = save.player;
      currentEnemies = save.enemies;
      currentRevealed = save.revealed;
      currentCracked = save.cracked || [];
    }

    if (result === "win" && defeatedId) {
      currentEnemies = currentEnemies.map(e => e.id === defeatedId ? { ...e, alive: false } : e);
      if (posRaw) currentPlayer = JSON.parse(posRaw);
    }

    const finalRevealed = computeReveal(currentPlayer.x, currentPlayer.y, currentRevealed);
    setPlayer(currentPlayer);
    setEnemies(currentEnemies);
    setRevealed(finalRevealed);
    setCrackedTiles(currentCracked);

    saveData(currentPlayer, currentEnemies, finalRevealed, currentCracked);
    
    // Cleanup flags
    localStorage.removeItem("lastBattleResult");
    localStorage.removeItem("lastDefeatedEnemyId");
  }, []);

  /* ---------------- HELPERS ---------------- */
  function saveData(p: any, e: any, r: any, c: any) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ player: p, enemies: e, revealed: r, cracked: c }));
  }

  function computeReveal(px: number, py: number, base: boolean[][]) {
    return base.map((row, y) => row.map((vis, x) => (Math.abs(px - x) <= VISION_RADIUS && Math.abs(py - y) <= VISION_RADIUS) || vis));
  }

  /* ---------------- MOVEMENT (With Floor Crumbling) ---------------- */
  function move(dx: number, dy: number) {
    if (hasFinished) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    // 1. Boundary & Wall Check
    if (ny < 0 || ny >= LAVA_MAP.length || nx < 0 || nx >= LAVA_MAP[0].length || LAVA_MAP[ny][nx] === "T") return;

    // 2. Lava/Cracked Check
    const isAlreadyCracked = crackedTiles.some(t => t.x === nx && t.y === ny);
    if (isAlreadyCracked) {
      alert("The floor collapsed into lava! Returning to start...");
      setPlayer({ x: 0, y: 0 });
      setCrackedTiles([]);
      return;
    }

    // 3. Enemy Check
    const enemy = enemies.find(e => e.x === nx && e.y === ny && e.alive);
    if (enemy) {
      localStorage.setItem("currentEnemyId", enemy.id);
      localStorage.setItem("lastEnemyPosition", JSON.stringify({ x: nx, y: ny }));
      window.location.href = "/game/fight?biome=lava";
      return;
    }

    // 4. Update State
    const newPos = { x: nx, y: ny };
    const newCracked = [...crackedTiles, { x: player.x, y: player.y }]; // Previous tile cracks
    const newRevealed = computeReveal(nx, ny, revealed);

    setPlayer(newPos);
    setCrackedTiles(newCracked);
    setRevealed(newRevealed);
    saveData(newPos, enemies, newRevealed, newCracked);

    if (LAVA_MAP[ny][nx] === "B") setHasFinished(true);
  }

  return (
    <div style={S.bgLava}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h1 style={S.title}>🌋 Lava Cavern</h1>
        
        <div style={S.grid}>
          {LAVA_MAP.map((row, y) => row.map((cell, x) => {
            const isPlayer = player.x === x && player.y === y;
            const isRevealed = revealed[y][x];
            const isCracked = crackedTiles.some(t => t.x === x && t.y === y);
            const enemy = enemies.find(e => e.x === x && e.y === y);

            return (
              <div key={`${x}-${y}`} style={{...S.tile, background: isCracked ? "#7f1d1d" : "#451a03"}}>
                {isRevealed || cell === "T" ? (
                  <>
                    {isPlayer && "🏃"}
                    {!isPlayer && cell === "T" && "⛰️"}
                    {!isPlayer && enemy?.alive && "🔥"}
                    {!isPlayer && enemy && !enemy.alive && "💀"}
                    {!isPlayer && cell === "B" && "🏺"}
                    {isCracked && !isPlayer && <div style={S.cracks}>❌</div>}
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
              <h2>🏆 RELIC ACQUIRED</h2>
              <button style={S.finBtn} onClick={() => window.location.href="/game"}>EXIT CAVERN</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const S: Record<string, React.CSSProperties> = {
  bgLava: { minHeight: "100vh", backgroundImage: "url('/biomes/lava-fight.png')", display: "flex", justifyContent: "center", alignItems: "center", color: "#fca5a5" },
  title: { textAlign: "center", textShadow: "0 0 15px #ef4444" },
  grid: { display: "grid", gridTemplateColumns: `repeat(5, ${TILE_SIZE}px)`, gap: 4, padding: 10, border: "4px solid #991b1b", background: "#000" },
  tile: { width: TILE_SIZE, height: TILE_SIZE, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 },
  cracks: { position: "absolute", fontSize: 12, bottom: 2, right: 2, opacity: 0.5 },
  fog: { position: "absolute", inset: 0, background: "#1a0505" },
  controls: { display: "grid", gridTemplateColumns: "repeat(3, 60px)", gap: 10, justifyContent: "center", marginTop: 20 },
  btn: { width: 60, height: 60, background: "#991b1b", color: "white", border: "none", borderRadius: 8, cursor: "pointer" },
  overlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10 },
  card: { padding: 40, background: "#7f1d1d", border: "4px solid #f87171", textAlign: "center", borderRadius: 16 },
  finBtn: { marginTop: 20, padding: "10px 20px", background: "#f87171", border: "none", fontWeight: "bold", cursor: "pointer" }
};