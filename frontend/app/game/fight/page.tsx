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

const BOSS_DROPS: Record<BiomeKey, string> = {
  forest: "wood_sword",
  ice: "ice_sword",
  lava: "magma_blade",
  shadow: "shadow_reaper",
};

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
      { id: "sh1", name: "Shadow Wraith", image: "/enemies/shadow/wraith.png" },
      { id: "sh2", name: "Dark Knight", image: "/enemies/shadow/knight.png" },
      { id: "shade", name: "Shade", image: "/enemies/shadow/shade.png" },
      { id: "boss", name: "Shadow Boss", image: "/enemies/shadow/boss.png" },
    ],
  },
};

export default function FightPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const biome = (searchParams.get("biome") as BiomeKey) || "forest";

  // State
  const [player, setPlayer] = useState<Fighter | null>(null);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [enemy, setEnemy] = useState<(Fighter & { id: string }) | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [gameOver, setGameOver] = useState(false);
  const [playerFlash, setPlayerFlash] = useState(false);
  const [enemyFlash, setEnemyFlash] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [victoryMessage, setVictoryMessage] = useState("");

  /* ---------------- LOAD PLAYER & SPAWN ENEMY ---------------- */
  useEffect(() => {
  /* 1. LOAD PLAYER DATA */
  const equipRaw = localStorage.getItem("character_equipment");
  const workoutRaw = localStorage.getItem("dr_stats");
  const equip = equipRaw ? JSON.parse(equipRaw) : { level: 1, xp: 0, slots: {}, gender: "guy" };
  const workout = workoutRaw ? JSON.parse(workoutRaw) : { strength: 10, agility: 0 };

  const level = equip.level || 1;
  const slots = equip.slots || {};
  const equippedItems = Object.values(slots).filter(Boolean) as any[];
  const bonusAtk = equippedItems.reduce((sum, it) => sum + (it.damage ?? 0), 0);
  const workoutAtk = (workout.strength - 10) * 1; 
  
  const finalAtk = (5 + (level - 1) * 2) + bonusAtk + workoutAtk;
  const finalHp = 100 + (level - 1) * 10;

  setPlayer({
    name: "Hero",
    hp: finalHp,
    maxHp: finalHp,
    atk: finalAtk,
    image: equip.gender === "girl" ? "/girl.png" : "/guy.png",
  });
  setPlayerLevel(level);

  /* 2. ENEMY SPAWNING & ELITE CHECK */
  const targetId = localStorage.getItem("currentEnemyId");
  const biomeData = BIOMES[biome];
  let enemyTemplate;

  if (targetId) {
    enemyTemplate = biomeData.enemies.find(e => e.id === targetId);
    localStorage.removeItem("currentEnemyId");
  } 
  
  if (!enemyTemplate) {
    const randomPool = biomeData.enemies.filter(e => e.id !== "boss");
    enemyTemplate = randomPool[Math.floor(Math.random() * randomPool.length)];
  }

  /* 3. DIFFICULTY & VARIANCE */
  const isElite = Math.random() < 0.05; // 5% chance
  const biomeDifficultyMultiplier = { forest: 1, ice: 1.5, lava: 2.2, shadow: 3 };
  const mult = biomeDifficultyMultiplier[biome];
  
  // Base variance +/- 15%
  const variance = () => (Math.random() * 0.3 + 0.85);

  // Elite modifiers: 1.5x HP, 1.3x ATK
  const eliteHpMult = isElite ? 1.5 : 1;
  const eliteAtkMult = isElite ? 1.3 : 1;

  const enemyMaxHp = Math.floor(((80 + (level * 10)) * mult) * variance() * eliteHpMult);
  const enemyAtk = Math.floor(((4 + (level * 2)) * mult) * variance() * eliteAtkMult);

  setEnemy({
    ...enemyTemplate,
    name: isElite ? `🌟 ELITE ${enemyTemplate.name}` : enemyTemplate.name,
    hp: enemyMaxHp,
    maxHp: enemyMaxHp,
    atk: enemyAtk,
    // Add custom property to track elite status for the XP reward later
    isElite: isElite 
  } as any);

  setLog([
    isElite 
      ? `⚠️ DANGER! A powerful ${enemyTemplate.name} appeared!` 
      : `⚔️ A wild ${enemyTemplate.name} appeared!`
  ]);
}, [biome]);

  /* ---------------- COMBAT ACTIONS ---------------- */

  const triggerFlash = (isPlayer: boolean) => {
    if (isPlayer) { setPlayerFlash(true); setTimeout(() => setPlayerFlash(false), 150); }
    else { setEnemyFlash(true); setTimeout(() => setEnemyFlash(false), 150); }
  };

  function useSkill(skill: Skill) {
    if (!enemy || !player || turn !== "player" || gameOver) return;

    const damage = Math.floor(player.atk * skill.power * (Math.random() * 0.4 + 0.8));
    triggerFlash(false);

    const newHp = Math.max(0, enemy.hp - damage);
    setEnemy({ ...enemy, hp: newHp });
    setLog(l => [`⚔️ You used ${skill.name} and dealt ${damage}!`, ...l]);

    if (newHp <= 0) {
        handleVictory(enemy);
        return;
    }
    setTurn("enemy");
  }

function handleVictory(defeatedEnemy: any) {
  setGameOver(true);
  setIsDead(true);

  // 1. Dynamic XP based on biome
  const biomeXpMult: Record<string, number> = { forest: 20, ice: 40, lava: 70, shadow: 120 };
  let xpGained = (biomeXpMult[biome] || 20);
  if (defeatedEnemy.isElite) xpGained *= 2.5;

  const equipRaw = localStorage.getItem("character_equipment");
  const equip = equipRaw ? JSON.parse(equipRaw) : { level: 1, xp: 0, inventory: [], slots: {}, gender: "guy" };

  // 2. Level Up Logic
  let currentXp = (equip.xp || 0) + xpGained;
  let currentLevel = equip.level || 1;
  while (currentXp >= currentLevel * 100) {
    currentXp -= currentLevel * 100;
    currentLevel++;
  }

  // 3. Dynamic Loot Table
  const LOOT_TABLE: Record<string, any> = {
    forest: {
      shield: { id: "wood_shield", name: "Wooden Shield", icon: "🛡️", type: "armor", armor: 4 },
      head: { id: "wood_helm", name: "Wooden Helm", icon: "🪖", type: "helmet", armor: 2 },
      weapon: { id: "wood_sword", name: "Wooden Sword", icon: "🗡️", type: "weapon", damage: 6 }
    },
    ice: {
      shield: { id: "ice_shield", name: "Ice Shield", icon: "🛡️", type: "armor", armor: 9 },
      head: { id: "ice_crown", name: "Ice Crown", icon: "👑", type: "helmet", armor: 5 },
      weapon: { id: "ice_sword", name: "Ice Sword", icon: "⚔️", type: "weapon", damage: 12 }
    },
    // You can add lava and shadow here later...
  };

  let dropMessage = "";
  const updatedInventory = [...(equip.inventory || [])];

  if (defeatedEnemy.id === "boss") {
    // Mark specific boss as defeated
    localStorage.setItem(`boss_defeated_${biome}`, "true");

    const roll = Math.random();
    let droppedItem = null;
    const biomeDrops = LOOT_TABLE[biome];

    if (biomeDrops) {
      if (roll <= 0.3) droppedItem = biomeDrops.shield;
      else if (roll <= 0.5) droppedItem = biomeDrops.head;
      else if (roll <= 0.6) droppedItem = biomeDrops.weapon;
    }

    if (droppedItem) {
      const alreadyOwned = updatedInventory.find(item => item.id === droppedItem.id);
      const currentlyEquipped = Object.values(equip.slots || {}).find((s: any) => s?.id === droppedItem.id);

      if (!alreadyOwned && !currentlyEquipped) {
        updatedInventory.push(droppedItem);
        dropMessage = ` & FOUND ${droppedItem.name.toUpperCase()}!`;
      } else {
        dropMessage = " (Duplicate item discarded)";
      }
    } else {
      dropMessage = " (No items dropped)";
    }
  }

  // 4. Save and Exit
  localStorage.setItem("character_equipment", JSON.stringify({
    ...equip,
    xp: currentXp,
    level: currentLevel,
    inventory: updatedInventory
  }));

  setVictoryMessage(`VICTORY! +${xpGained} XP${dropMessage}`);
  localStorage.setItem("lastBattleResult", "win");
  localStorage.setItem("lastDefeatedEnemyId", defeatedEnemy.id);

  setTimeout(() => router.back(), 3000);
}
  /* ---------------- ENEMY AI ---------------- */
  useEffect(() => {
    if (!enemy || !player || turn !== "enemy" || gameOver) return;

    const timer = setTimeout(() => {
      const damage = Math.floor(enemy.atk * (Math.random() * 0.4 + 0.8));
      triggerFlash(true);

      const newHp = Math.max(0, player.hp - damage);
      setPlayer(p => p ? { ...p, hp: newHp } : null);
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
  }, [turn, enemy, player, gameOver]);

  if (!enemy || !player) return <div style={S.page}><h1>Finding Enemy...</h1></div>;

  return (
    <main style={S.page}>
      <h1 style={{ textShadow: "4px 4px #000" }}>⚔️ {biome.toUpperCase()} BATTLE</h1>

      <div style={S.arena}>
        <div style={{ ...S.card, background: playerFlash ? "#7f1d1d" : "#111827" }}>
          <h3>{player.name} (LV {playerLevel})</h3>
          <img src={player.image} style={{ ...S.sprite, transform: "translateX(15px)", marginLeft: 15 }} />
          <Bar label="HP" value={player.hp} max={player.maxHp} color="#22c55e" />
          <div style={{marginTop: 5}}>ATK: {player.atk}</div>
        </div>

        <div style={{ fontSize: 40, fontWeight: "bold" }}>VS</div>

        <div style={{ 
            ...S.card, 
            background: enemyFlash ? "#7f1d1d" : "#111827",
            border: (enemy as any)?.isElite ? "3px solid #fbbf24" : "3px solid white",
            boxShadow: (enemy as any)?.isElite ? "0 0 20px #fbbf24" : "none",
            ...(isDead ? S.deathAnim : {}),
        }}>
          <h3>{enemy.name}</h3>
          <img src={enemy.image} style={{ ...S.sprite, transform: "translateX(15px)", marginLeft: 15 }} />
          {isDead && <div style={S.killOverlay}>{victoryMessage}</div>}
          <Bar label="HP" value={enemy.hp} max={enemy.maxHp} color="#ef4444" />
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

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, (value / max) * 100);
  return (
    <div style={{ width: "100%", marginTop: 8 }}>
      <div style={{ fontSize: 12 }}>{label}: {value}/{max}</div>
      <div style={{ height: 10, background: "#333", marginTop: 4 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundImage: "url('/biomes/fight.png')",
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
    borderRadius: "15px",
    position: "relative"
  },
  card: {
    width: 220,
    padding: 16,
    border: "3px solid white",
    transition: "all 1.5s ease-in-out, background 0.1s ease",
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
    filter: "grayscale(1) brightness(0.2)",
    transform: "rotate(90deg) translateY(50px)",
    opacity: 0,
  },
  killOverlay: {
    position: "absolute",
    top: "40%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: "#fbbf24",
    fontWeight: "900",
    fontSize: "28px",
    width: "100%",
    textShadow: "0px 0px 10px #000, 2px 2px 0 #000",
    zIndex: 100,
  }
};