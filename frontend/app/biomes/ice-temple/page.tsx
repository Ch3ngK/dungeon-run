"use client";
import { useEffect, useState } from "react";

/* ---------------- TYPES ---------------- */
type Tile = "P" | "T" | "M" | "B" | ".";
type MapEnemy = { id: string; name: string; x: number; y: number; alive: boolean };

/* ---------------- CONSTANTS ---------------- */
const TILE_SIZE = 64;
const STORAGE_KEY = "ice_state"; 
const VISION_RADIUS = 2;

const ICE_MAP: Tile[][] = [
  ["P", ".", ".", ".", "T"],
  ["T", "T", ".", ".", "."],
  [".", "M", ".", "T", "."],
  [".", ".", ".", "M", "."],
  ["T", ".", ".", ".", "B"],
];

const DEFAULT_ENEMIES: MapEnemy[] = [
  { id: "ice1", name: "Frost Spirit", x: 1, y: 2, alive: true },
  { id: "ice2", name: "Snow Golem", x: 3, y: 3, alive: true },
];

export default function IceTemplePage() {
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [enemies, setEnemies] = useState<MapEnemy[]>(DEFAULT_ENEMIES);
  const [revealed, setRevealed] = useState<boolean[][]>(() =>
    ICE_MAP.map(row => row.map(() => false))
  );
  const [hasFinished, setHasFinished] = useState(false);
  const [isSliding, setIsSliding] = useState(false);

  /* ---------------- LOAD & BATTLE LOGIC ---------------- */
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const result = localStorage.getItem("lastBattleResult");
    const defeatedId = localStorage.getItem("lastDefeatedEnemyId");
    const posRaw = localStorage.getItem("lastEnemyPosition");

    let currentEnemies = [...DEFAULT_ENEMIES];
    let currentPlayer = { x: 0, y: 0 };
    let currentRevealed = ICE_MAP.map(row => row.map(() => false));

    // 1. Load from Storage
    if (raw) {
      const save = JSON.parse(raw);
      currentPlayer = save.player;
      currentEnemies = save.enemies;
      currentRevealed = save.revealed;
    }

    // 2. Apply Victory (Changes Ghost to Skull)
    if (result === "win" && defeatedId) {
      currentEnemies = currentEnemies.map(e =>
        e.id === defeatedId ? { ...e, alive: false } : e
      );
      if (posRaw) currentPlayer = JSON.parse(posRaw);
    }

    // 3. Update Vision
    const finalRevealed = computeReveal(currentPlayer.x, currentPlayer.y, currentRevealed);

    // 4. Set State
    setPlayer(currentPlayer);
    setEnemies(currentEnemies);
    setRevealed(finalRevealed);

    // 5. Lock it into Storage (Crucial for the Skull to stay)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      player: currentPlayer,
      enemies: currentEnemies,
      revealed: finalRevealed
    }));

    // 6. Cleanup Battle Flags
    localStorage.removeItem("lastBattleResult");
    localStorage.removeItem("lastDefeatedEnemyId");
    localStorage.removeItem("lastEnemyPosition");
  }, []);

  /* ---------------- HELPERS ---------------- */
  function computeReveal(px: number, py: number, base: boolean[][]) {
    return base.map((row, y) =>
      row.map((vis, x) => {
        const inRange = Math.abs(px - x) <= VISION_RADIUS && Math.abs(py - y) <= VISION_RADIUS;
        return vis || inRange;
      })
    );
  }

  /* ---------------- MOVEMENT ---------------- */
  async function move(dx: number, dy: number) {
    if (hasFinished || isSliding) return;
    setIsSliding(true);

    let cx = player.x;
    let cy = player.y;

    while (true) {
      const nx = cx + dx;
      const ny = cy + dy;

      // Hit boundary or Wall
      if (ny < 0 || ny >= ICE_MAP.length || nx < 0 || nx >= ICE_MAP[0].length) break;
      if (ICE_MAP[ny][nx] === "T") break;

      cx = nx;
      cy = ny;

      // Encounter Enemy
      const enemy = enemies.find(e => e.x === cx && e.y === cy && e.alive);
      if (enemy) {
        localStorage.setItem("currentEnemyId", enemy.id);
        localStorage.setItem("lastEnemyPosition", JSON.stringify({ x: cx, y: cy }));
        window.location.href = "/game/fight?biome=ice";
        return;
      }

      setPlayer({ x: cx, y: cy });
      if (ICE_MAP[cy][cx] === "B") break;
      await new Promise(r => setTimeout(r, 60)); // Sliding speed
    }

    const nextRevealed = computeReveal(cx, cy, revealed);
    setRevealed(nextRevealed);
    
    // Save current state including dead enemies
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      player: { x: cx, y: cy },
      enemies: enemies,
      revealed: nextRevealed
    }));

    if (ICE_MAP[cy][cx] === "B") setHasFinished(true);
    setIsSliding(false);
  }

  /* ---------------- RENDER ---------------- */
  return (
    <div style={S.bgIce}>
      <div style={{ padding: 20, position: "relative" }}>
        <h1 style={S.title}>❄️ Ice Temple</h1>

        <div style={S.grid}>
          {ICE_MAP.map((row, y) =>
            row.map((cell, x) => {
              const isPlayer = player.x === x && player.y === y;
              const isRevealed = revealed[y][x];
              const isWall = cell === "T";
              const enemy = enemies.find(e => e.x === x && e.y === y);

              return (
                <div key={`${x}-${y}`} style={S.tile}>
                  {(isRevealed || isWall) ? (
                    <>
                      {isPlayer && "🎿"}
                      {!isPlayer && isWall && "🧊"}
                      {!isPlayer && enemy?.alive && "👻"}
                      {!isPlayer && enemy && !enemy.alive && "💀"}
                      {!isPlayer && cell === "B" && "🚪"}
                    </>
                  ) : (
                    <div style={S.fog} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* --- CONTROLS --- */}
        <div style={S.controls}>
          <div /> <button style={S.btn} onClick={() => move(0, -1)}>⬆️</button> <div />
          <button style={S.btn} onClick={() => move(-1, 0)}>⬅️</button>
          <button style={S.btn} onClick={() => move(0, 1)}>⬇️</button>
          <button style={S.btn} onClick={() => move(1, 0)}>➡️</button>
        </div>

        {/* --- VICTORY --- */}
        {hasFinished && (
          <div style={S.overlay}>
            <div style={S.card}>
              <h2 style={{ color: "#38bdf8" }}>🏁 TEMPLE CLEARED</h2>
              <p>You found the frozen passage!</p>
              <button style={S.finBtn} onClick={() => window.location.href = "/game"}>
                RETURN TO HUB
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const S: Record<string, React.CSSProperties> = {
  bgIce: {
    minHeight: "100vh",
    width: "100vw",
    backgroundImage: "url('/biomes/ice-fight.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "white"
  },
  title: { textAlign: "center", textShadow: "2px 2px #000", marginBottom: "20px" },
  grid: { 
    display: "grid", 
    gridTemplateColumns: `repeat(5, ${TILE_SIZE}px)`, 
    gap: 4, 
    background: "rgba(0,0,0,0.5)", 
    padding: 10, 
    borderRadius: 8 
  },
  tile: { 
    width: TILE_SIZE, 
    height: TILE_SIZE, 
    background: "rgba(14, 165, 233, 0.4)", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    fontSize: 28, 
    position: "relative",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  fog: { position: "absolute", inset: 0, background: "#020617", zIndex: 10 },
  controls: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: 180, margin: "20px auto" },
  btn: { 
    width: 60, height: 60, fontSize: 24, cursor: "pointer", 
    background: "rgba(3, 105, 161, 0.9)", border: "2px solid #38bdf8", color: "white", borderRadius: 8 
  },
  overlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 },
  card: { background: "#0f172a", padding: 40, border: "4px solid #38bdf8", textAlign: "center", borderRadius: 16 },
  finBtn: { marginTop: 20, padding: "12px 24px", background: "#38bdf8", border: "none", color: "#0f172a", fontWeight: "bold", cursor: "pointer", borderRadius: 8 }
};