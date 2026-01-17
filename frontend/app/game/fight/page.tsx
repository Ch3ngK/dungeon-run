"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/* ---------------- TYPES & DATA ---------------- */

type Fighter = { name: string; hp: number; maxHp: number; atk: number; image: string; };
type Skill = { name: string; power: number; };
type BiomeKey = "forest" | "ice" | "lava" | "shadow";

const SKILLS: Skill[] = [
  { name: "Slash", power: 1 },
  { name: "Power Strike", power: 1.6 },
  { name: "Quick Jab", power: 0.7 },
  { name: "Fire Hit", power: 2.0 },
];

const BIOMES: Record<BiomeKey, { enemies: { id: string; name: string; image: string; }[] }> = {
  forest: {
    enemies: [
      { id: "e1", name: "Wolf", image: "/enemies/forest/wolf.png" },
      { id: "e2", name: "Treant", image: "/enemies/forest/treant.png" },
      { id: "slime", name: "Slime", image: "/enemies/forest/slime.png" },
      { id: "boss", name: "Forest Boss", image: "/enemies/forest/boss.png" },
    ],
  },
  ice: {
    enemies: [
      { id: "ice1", name: "Frost Spirit", image: "/enemies/ice/spirit.png" }, 
      { id: "ice2", name: "Snow Golem", image: "/enemies/ice/golem.png" },   
      { id: "yeti", name: "Yeti", image: "/enemies/ice/yeti.png" },
      { id: "boss", name: "Ice Boss", image: "/enemies/ice/boss.png" },
    ],
  },
  lava: {
    enemies: [
      { id: "lava1", name: "Magma Imp", image: "/enemies/lava/imp.png" },      
      { id: "lava2", name: "Fire Beast", image: "/enemies/lava/beast.png" },   
      { id: "elemental", name: "Elemental", image: "/enemies/lava/elemental.png" },
      { id: "boss", name: "Lava Boss", image: "/enemies/lava/boss.png" },
    ],
  },
  shadow: {
    enemies: [
      { id: "sh1", name: "Shadow Wraith", image: "/enemies/shadow/wraith.png" }, // Sync with map
      { id: "sh2", name: "Dark Knight", image: "/enemies/shadow/knight.png" },   // Sync with map
      { id: "shade", name: "Shade", image: "/enemies/shadow/shade.png" },
      { id: "boss", name: "Shadow Boss", image: "/enemies/shadow/boss.png" },
    ],
  },
};

export default function FightPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const biome = (searchParams.get("biome") as BiomeKey) || "forest";
  
  const [player, setPlayer] = useState<Fighter>({
    name: "Hero", hp: 120, maxHp: 120, atk: 18, image: "/guy.png",
  });

  const [enemy, setEnemy] = useState<(Fighter & { id: string }) | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [gameOver, setGameOver] = useState(false);
  const [playerFlash, setPlayerFlash] = useState(false);
  const [enemyFlash, setEnemyFlash] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [victoryMessage, setVictoryMessage] = useState("");

  /* ---------------- SPAWN ENEMY ---------------- */

  useEffect(() => {
    const targetId = localStorage.getItem("currentEnemyId");
    const biomeData = BIOMES[biome];
    
    // Use targetId if it exists (from map), otherwise pick random from biome
    const enemyTemplate = biomeData.enemies.find(e => e.id === targetId) || 
                          biomeData.enemies[Math.floor(Math.random() * biomeData.enemies.length)];

    const maxHp = Math.floor(player.maxHp * (Math.random() * 0.5 + 0.8));
    const atk = Math.floor(player.atk * (Math.random() * 0.3 + 0.7));

    setEnemy({
      id: enemyTemplate.id,
      name: enemyTemplate.name,
      image: enemyTemplate.image,
      hp: maxHp,
      maxHp,
      atk,
    });

    setLog([`⚔️ A wild ${enemyTemplate.name} appeared!`]);
  }, [biome]);

  /* ---------------- COMBAT ACTIONS ---------------- */

  const triggerFlash = (isPlayer: boolean) => {
    if (isPlayer) { setPlayerFlash(true); setTimeout(() => setPlayerFlash(false), 150); }
    else { setEnemyFlash(true); setTimeout(() => setEnemyFlash(false), 150); }
  };

  function useSkill(skill: Skill) {
    if (!enemy || turn !== "player" || gameOver) return;

    const damage = Math.floor(player.atk * skill.power * (Math.random() * 0.4 + 0.8));
    setEnemyFlash(true);
    setTimeout(() => setEnemyFlash(false), 150);

    const newHp = Math.max(0, enemy.hp - damage);
    setEnemy({ ...enemy, hp: newHp });
    setLog(l => [`⚔️ You used ${skill.name} and dealt ${damage}!`, ...l]);

    if (newHp <= 0) {
        setGameOver(true);
        setIsDead(true); // Trigger Death Animation
        setVictoryMessage(`VICTORY! ${enemy.name.toUpperCase()} HAS FALLEN!`); // Death Message
        
        localStorage.setItem("lastBattleResult", "win");
        localStorage.setItem("lastDefeatedEnemyId", enemy.id);
        
        // Give time for the animation and message to be seen
        setTimeout(() => {
        router.back();
        }, 2000); 
        return;
    }
    setTurn("enemy");
    }

  /* ---------------- ENEMY AI ---------------- */

  useEffect(() => {
    if (!enemy || turn !== "enemy" || gameOver) return;

    const timer = setTimeout(() => {
      const damage = Math.floor(enemy.atk * (Math.random() * 0.4 + 0.8));
      triggerFlash(true);

      const newHp = Math.max(0, player.hp - damage);
      setPlayer(p => ({ ...p, hp: newHp }));
      setLog(l => [`💥 ${enemy.name} deals ${damage} damage!`, ...l]);

      if (newHp <= 0) {
        setGameOver(true);
        setLog(l => [`💀 You died... Returning to start.`, ...l]);
        setTimeout(() => router.push("/game"), 2000);
        return;
      }
      setTurn("player");
    }, 1000);

    return () => clearTimeout(timer);
  }, [turn, enemy, gameOver]);

  if (!enemy) return <div style={S.page}><h1>Finding Enemy...</h1></div>;

  return (
    <main style={S.page}>
      <h1 style={{ textShadow: "4px 4px #000" }}>⚔️ {biome.toUpperCase()} BATTLE</h1>

      <div style={S.arena}>
        {/* PLAYER CARD */}
        <div style={{ ...S.card, background: playerFlash ? "#7f1d1d" : "#111827" }}>
          <h3>{player.name}</h3>
          <img src={player.image} style={S.sprite} />
          <Bar label="HP" value={player.hp} max={player.maxHp} />
          <div style={{marginTop: 5}}>ATK: {player.atk}</div>
        </div>

        <div style={{ fontSize: 40, fontWeight: "bold" }}>VS</div>

        {/* ENEMY CARD */}
        <div style={{ 
            ...S.card, 
            ...(isDead ? S.deathAnim : {}), // Apply animation
            background: enemyFlash ? "#7f1d1d" : "#111827" 
        }}>
        <h3>{enemy.name}</h3>
        <img src={enemy.image} style={S.sprite} />
        {/* Show big message over the enemy if dead */}
        {isDead && <div style={S.killOverlay}>{victoryMessage}</div>}
        <Bar label="HP" value={enemy.hp} max={enemy.maxHp} />
        </div>
      </div>

      <div style={S.controls}>
        {SKILLS.map(s => (
          <button 
            key={s.name} 
            style={S.btn} 
            disabled={turn !== "player" || gameOver} 
            onClick={() => useSkill(s)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div style={S.log}>
        {log.map((msg, i) => <div key={i}>{msg}</div>)}
      </div>
    </main>
  );
}

/* ---------------- UI HELPERS ---------------- */

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, (value / max) * 100);
  return (
    <div style={{ width: "100%", marginTop: 8 }}>
      <div style={{ fontSize: 12 }}>{label}: {value}/{max}</div>
      <div style={{ height: 10, background: "#333", marginTop: 4 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#22c55e", transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

/* ---------------- STYLES (Matching your Biome style) ---------------- */

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    backgroundImage: "url('/biomes/fight.png')", // Can change based on biome
    backgroundSize: "cover",
    color: "white",
    padding: 24,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  arena: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
    marginTop: 20,
    background: "rgba(0,0,0,0.5)",
    padding: "20px",
    borderRadius: "15px"
  },
  card: {
    width: 220,
    padding: 16,
    border: "3px solid white",
    transition: "background 0.1s ease",
  },
  sprite: {
    width: 120,
    height: 120,
    objectFit: "contain",
    imageRendering: "pixelated",
  },
  controls: {
    marginTop: 30,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    width: "100%",
    maxWidth: 400
  },
  btn: {
    padding: "15px",
    fontSize: "16px",
    cursor: "pointer",
    background: "#1e293b",
    color: "white",
    border: "2px solid #334155",
    borderRadius: "8px",
    fontWeight: "bold"
  },
  log: {
    marginTop: 20,
    width: "100%",
    maxWidth: 450,
    height: 120,
    overflowY: "auto",
    background: "rgba(0,0,0,0.8)",
    padding: 15,
    fontSize: 14,
    textAlign: "left",
    borderLeft: "4px solid #3b82f6"
  },
  deathAnim: {
    filter: "grayscale(1) brightness(0.5)",
    transform: "rotate(90deg) translateY(20px)", // Tilts and drops the card
    opacity: 0,
    transition: "all 1.5s ease-out",
  },
  killOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-90deg)", // Counter-rotate text
    color: "#ff0000",
    fontWeight: "bold",
    fontSize: "24px",
    width: "200px",
    textShadow: "2px 2px 0 #000",
    zIndex: 20,
  }
};