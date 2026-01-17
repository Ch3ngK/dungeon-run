"use client";
import { useEffect, useState } from "react";

/* ---------------- TYPES ---------------- */

type Tile = "P" | "T" | "M" | "B" | ".";
type MapEnemy = {
  id: string;
  name: string;
  x: number;
  y: number;
  alive: boolean;
};

type ForestSave = {
  player: { x: number; y: number };
  revealed: boolean[][];
  enemies: MapEnemy[];
};

/* ---------------- CONSTANTS ---------------- */

const TILE_SIZE = 64;
const STORAGE_KEY = "forest_state";
const VISION_RADIUS = 1;

const FOREST_MAP: Tile[][] = [
  ["P", ".", ".", "T", "M"],
  [".", "T", ".", ".", "."],
  [".", ".", "T", "M", "."],
  ["T", ".", ".", ".", "."],
  [".", ".", ".", "T", "B"],
];

const DEFAULT_ENEMIES: MapEnemy[] = [
  { id: "e1", name: "Wolf", x: 4, y: 0, alive: true },
  { id: "e2", name: "Treant", x: 3, y: 2, alive: true },
];

/* ---------------- PAGE COMPONENT ---------------- */

export default function ForestPage() {
  const [map] = useState<Tile[][]>(FOREST_MAP);
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [enemies, setEnemies] = useState<MapEnemy[]>(DEFAULT_ENEMIES);
  const [hasFinished, setHasFinished] = useState(false);
  const [revealed, setRevealed] = useState<boolean[][]>(() =>
    FOREST_MAP.map(row => row.map(() => false))
  );

  /* ---------------- LOAD SAVE & BATTLE RESULTS ---------------- */

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    let currentEnemies = DEFAULT_ENEMIES;
    let currentPlayer = { x: 0, y: 0 };
    let currentRevealed = FOREST_MAP.map(row => row.map(() => false));

    // 1. Load basic save data
    if (raw) {
      const save: ForestSave = JSON.parse(raw);
      currentPlayer = save.player;
      currentEnemies = save.enemies;
      currentRevealed = save.revealed;
    }

    // 2. Check for recent battle victory
    const result = localStorage.getItem("lastBattleResult");
    const defeatedId = localStorage.getItem("lastDefeatedEnemyId");
    const posRaw = localStorage.getItem("lastEnemyPosition");
    const enemyPos = posRaw ? JSON.parse(posRaw) : null;

    if (result === "win" && defeatedId) {
      // Mark enemy as dead
      currentEnemies = currentEnemies.map(e =>
        e.id === defeatedId ? { ...e, alive: false } : e
      );

      // Move player onto the defeated enemy's tile
      if (enemyPos) {
        currentPlayer = { x: enemyPos.x, y: enemyPos.y };
        currentRevealed = computeReveal(currentPlayer.x, currentPlayer.y, currentRevealed);
      }
    }

    // 3. Apply all states
    setPlayer(currentPlayer);
    setEnemies(currentEnemies);
    setRevealed(currentRevealed);
    
    // Initial reveal if new game
    if (!raw && !result) {
        const initialReveal = computeReveal(0, 0, currentRevealed);
        setRevealed(initialReveal);
        saveGame(currentPlayer, initialReveal, currentEnemies);
    } else {
        saveGame(currentPlayer, currentRevealed, currentEnemies);
    }

    // 4. Cleanup battle flags
    localStorage.removeItem("lastBattleResult");
    localStorage.removeItem("lastDefeatedEnemyId");
    localStorage.removeItem("lastEnemyPosition");
  }, []);

  /* ---------------- HELPERS ---------------- */

  function saveGame(p = player, r = revealed, e = enemies) {
    const save: ForestSave = { player: p, revealed: r, enemies: e };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }

  function computeReveal(px: number, py: number, base: boolean[][]) {
    return base.map((row, y) =>
      row.map((cell, x) => {
        const inRange =
          Math.abs(px - x) <= VISION_RADIUS &&
          Math.abs(py - y) <= VISION_RADIUS;
        return cell || inRange;
      })
    );
  }

  /* ---------------- MOVEMENT ---------------- */

  function move(dx: number, dy: number) {
    if (hasFinished) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    // Boundary and Wall Check
    if (ny < 0 || ny >= map.length || nx < 0 || nx >= map[0].length) return;
    if (map[ny][nx] === "T") return;

    // Enemy Encounter Check
    const enemyHere = enemies.find(e => e.x === nx && e.y === ny && e.alive);
    if (enemyHere) {
      localStorage.setItem("currentEnemyId", enemyHere.id);
      localStorage.setItem("lastEnemyPosition", JSON.stringify({ x: nx, y: ny }));
      window.location.href = "/game/fight?biome=forest";
      return; 
    }

    // Update Player & Fog
    const newPos = { x: nx, y: ny };
    setPlayer(newPos);
    
    const nextRevealed = computeReveal(nx, ny, revealed);
    setRevealed(nextRevealed);
    saveGame(newPos, nextRevealed, enemies);

    // Victory Check (Tile "B")
    if (map[ny][nx] === "B") {
      setHasFinished(true);
    }
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div style={S.bgforest}>
      <div style={{ padding: 20, position: "relative" }}>
        <h1 style={S.title}>🌲 Forest Ruins</h1>

        {/* --- THE GRID --- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${map[0].length}, ${TILE_SIZE}px)`,
            gap: 4,
            marginBottom: 20,
            border: "4px solid rgba(255,255,255,0.1)",
            padding: "4px",
            background: "rgba(0,0,0,0.4)"
          }}
        >
          {map.map((row, y) =>
            row.map((cell, x) => {
              const isPlayer = player.x === x && player.y === y;
              const isRevealed = revealed[y]?.[x];
              const isTree = cell === "T";
              const enemyHere = enemies.find(e => e.x === x && e.y === y);

              return (
                <div
                  key={`${x}-${y}`}
                  style={S.tile}
                >
                  {(isRevealed || isTree) && (
                    <>
                      {isPlayer && "🧍"}
                      {!isPlayer && isTree && "🌲"}
                      {!isPlayer && enemyHere?.alive && "👾"}
                      {!isPlayer && enemyHere && !enemyHere.alive && "💀"}
                      {!isPlayer && cell === "B" && "🏁"}
                    </>
                  )}

                  {!isRevealed && !isTree && (
                    <div style={S.fog} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* --- MOVEMENT CONTROLS --- */}
        <div style={S.controls}>
          <div />
          <button style={S.moveBtn} onClick={() => move(0, -1)}>⬆️</button>
          <div />
          <button style={S.moveBtn} onClick={() => move(-1, 0)}>⬅️</button>
          <button style={S.moveBtn} onClick={() => move(0, 1)}>⬇️</button>
          <button style={S.moveBtn} onClick={() => move(1, 0)}>➡️</button>
        </div>

        {/* --- FINISH OVERLAY --- */}
        {hasFinished && (
          <div style={S.finishOverlay}>
            <div style={S.finishCard}>
              <h2 style={{ fontSize: 32, marginBottom: 10 }}>🏁 STAGE CLEAR!</h2>
              <p style={{ marginBottom: 20 }}>You have escaped the Forest Ruins.</p>
              <button 
                style={S.finishBtn} 
                onClick={() => window.location.href = "/game"}
              >
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
  bgforest: {
    minHeight: "100vh",
    width: "100vw",
    backgroundImage: "url('/biomes/forest-fight.png')",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    imageRendering: "pixelated",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    color: "white",
    fontFamily: "sans-serif"
  },
  title: {
    textAlign: "center",
    textShadow: "2px 2px #000",
    marginBottom: "20px"
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    position: "relative",
    background: "#1f2933",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    border: "1px solid rgba(255,255,255,0.1)",
  },
  fog: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.92)",
    zIndex: 5
  },
  controls: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    width: 180,
    margin: "0 auto",
  },
  moveBtn: {
    width: 50,
    height: 50,
    fontSize: 24,
    cursor: "pointer",
    background: "rgba(255,255,255,0.2)",
    border: "2px solid white",
    borderRadius: "8px",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  finishOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    borderRadius: "12px",
    animation: "fadeIn 0.5s ease"
  },
  finishCard: {
    background: "#1e293b",
    padding: "40px",
    border: "4px solid #22c55e",
    textAlign: "center",
    boxShadow: "0 0 30px rgba(34, 197, 94, 0.4)",
    borderRadius: "16px"
  },
  finishBtn: {
    padding: "12px 24px",
    background: "#22c55e",
    border: "none",
    color: "#052e16",
    fontWeight: "bold",
    fontSize: "18px",
    cursor: "pointer",
    borderRadius: "8px",
    transition: "transform 0.2s",
  }
};