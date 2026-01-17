"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/* ---------------- TYPES & DATA ---------------- */

type Fighter = { name: string; hp: number; maxHp: number; atk: number; image: string; };
// Updated Skill type to match your SkillsPage
type Skill = { id: string; name: string; desc: string; manaCost?: number; dmg?: number; heal?: number; reqLevel: number; };
type BiomeKey = "forest" | "ice" | "lava" | "shadow";

// MASTER LIST (Matches your SkillsPage exactly)
const MASTER_SKILLS: Skill[] = [
  { id: "strike", name: "Strike", desc: "Basic attack.", dmg: 8, reqLevel: 1 },
  { id: "guard", name: "Guard", desc: "Reduce damage.", reqLevel: 1 },
  { id: "first_aid", name: "First Aid", desc: "Heal.", heal: 10, manaCost: 5, reqLevel: 1 },
  { id: "power_slash", name: "Power Slash", desc: "Heavy hit.", dmg: 18, manaCost: 8, reqLevel: 2 },
  { id: "ice_shard", name: "Ice Shard", desc: "Ice damage.", dmg: 14, manaCost: 7, reqLevel: 2 },
  { id: "fire_bolt", name: "Fire Bolt", desc: "Fire damage.", dmg: 16, manaCost: 8, reqLevel: 3 },
  { id: "thorn_whip", name: "Thorn Whip", desc: "Nature damage.", dmg: 15, manaCost: 7, reqLevel: 3 },
  { id: "shadow_bind", name: "Shadow Bind", desc: "Shadow damage.", dmg: 17, manaCost: 9, reqLevel: 4 },
  { id: "greater_heal", name: "Greater Heal", desc: "Big heal.", heal: 25, manaCost: 14, reqLevel: 4 },
  { id: "ultimate_burst", name: "Ultimate Burst", desc: "Huge damage.", dmg: 35, manaCost: 20, reqLevel: 6 },
];

const BOSS_DROPS: Record<BiomeKey, string> = {
  forest: "wood_sword", ice: "ice_sword", lava: "magma_blade", shadow: "shadow_reaper",
};

const BIOMES: Record<BiomeKey, { enemies: { id: string; name: string; image: string; }[] }> = {
  forest: { enemies: [{ id: "e1", name: "Wolf", image: "/enemies/forest/wolf.png" }, { id: "e2", name: "Treant", image: "/enemies/forest/treant.png" }, { id: "slime", name: "Slime", image: "/enemies/forest/slime.png" }, { id: "boss", name: "Forest Boss", image: "/enemies/forest/boss.png" }] },
  ice: { enemies: [{ id: "ice1", name: "Frost Spirit", image: "/enemies/ice/spirit.png" }, { id: "ice2", name: "Snow Golem", image: "/enemies/ice/golem.png" }, { id: "yeti", name: "Yeti", image: "/enemies/ice/yeti.png" }, { id: "boss", name: "Ice Boss", image: "/enemies/ice/boss.png" }] },
  lava: { enemies: [{ id: "lava1", name: "Magma Imp", image: "/enemies/lava/imp.png" }, { id: "lava2", name: "Fire Beast", image: "/enemies/lava/beast.png" }, { id: "elemental", name: "Elemental", image: "/enemies/lava/elemental.png" }, { id: "boss", name: "Lava Boss", image: "/enemies/lava/boss.png" }] },
  shadow: { enemies: [{ id: "sh1", name: "Shadow Wraith", image: "/enemies/shadow/wraith.png" }, { id: "sh2", name: "Dark Knight", image: "/enemies/shadow/knight.png" }, { id: "shade", name: "Shade", image: "/enemies/shadow/shade.png" }, { id: "boss", name: "Shadow Boss", image: "/enemies/shadow/boss.png" }] },
};

export default function FightPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const biome = (searchParams.get("biome") as BiomeKey) || "forest";

  // State
  const [player, setPlayer] = useState<Fighter | null>(null);
  const [playerMana, setPlayerMana] = useState(0); // Mana State
  const [maxMana, setMaxMana] = useState(0);
  const [playerSkills, setPlayerSkills] = useState<Skill[]>([]); // Dynamic Skills
  const [playerLevel, setPlayerLevel] = useState(1);
  const [enemy, setEnemy] = useState<(Fighter & { id: string; isElite?: boolean }) | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [gameOver, setGameOver] = useState(false);
  const [playerFlash, setPlayerFlash] = useState(false);
  const [enemyFlash, setEnemyFlash] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [victoryMessage, setVictoryMessage] = useState("");

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    const equipRaw = localStorage.getItem("character_equipment");
    const workoutRaw = localStorage.getItem("dr_stats");
    const skillsRaw = localStorage.getItem("selected_skills");

    const equip = equipRaw ? JSON.parse(equipRaw) : { level: 1, slots: {}, gender: "guy" };
    const workout = workoutRaw ? JSON.parse(workoutRaw) : { strength: 10, agility: 0 };
    const selectedIds = skillsRaw ? JSON.parse(skillsRaw) : ["strike"];

    const level = equip.level || 1;
    const bonusAtk = (Object.values(equip.slots || {}).filter(Boolean) as any[]).reduce((sum, it) => sum + (it.damage ?? 0), 0);
    const workoutAtk = (workout.strength - 10) * 1;
    const agiBonus = (workout.agility || 0) * 5;

    const finalAtk = (5 + (level - 1) * 2) + bonusAtk + workoutAtk;
    const finalHp = 100 + (level - 1) * 10;
    const finalMana = 60 + (level - 1) * 8 + agiBonus;

    setPlayer({ name: "Hero", hp: finalHp, maxHp: finalHp, atk: finalAtk, image: equip.gender === "girl" ? "/girl.png" : "/guy.png" });
    setPlayerMana(finalMana);
    setMaxMana(finalMana);
    setPlayerLevel(level);

    // Sync Equipped Skills
    const equipped = MASTER_SKILLS.filter(s => selectedIds.includes(s.id));
    setPlayerSkills(equipped.length > 0 ? equipped : [MASTER_SKILLS[0]]); // Fallback to Strike

    /* ENEMY SPAWNING */
    const targetId = localStorage.getItem("currentEnemyId");
    const biomeData = BIOMES[biome];
    let enemyTemplate = targetId ? biomeData.enemies.find(e => e.id === targetId) : null;
    if (!enemyTemplate) {
      const randomPool = biomeData.enemies.filter(e => e.id !== "boss");
      enemyTemplate = randomPool[Math.floor(Math.random() * randomPool.length)];
    }

    const isElite = Math.random() < 0.05;
    const mult = { forest: 1, ice: 1.5, lava: 2.2, shadow: 3 }[biome];
    const variance = () => (Math.random() * 0.3 + 0.85);
    const enemyMaxHp = Math.floor(((80 + (level * 10)) * mult) * variance() * (isElite ? 1.5 : 1));
    const enemyAtk = Math.floor(((4 + (level * 2)) * mult) * variance() * (isElite ? 1.3 : 1));

    setEnemy({ ...enemyTemplate, name: isElite ? `🌟 ELITE ${enemyTemplate.name}` : enemyTemplate.name, hp: enemyMaxHp, maxHp: enemyMaxHp, atk: enemyAtk, isElite } as any);
    setLog([isElite ? `⚠️ DANGER! A powerful ${enemyTemplate.name} appeared!` : `⚔️ A wild ${enemyTemplate.name} appeared!`]);
    localStorage.removeItem("currentEnemyId");
  }, [biome]);

  /* ---------------- COMBAT ---------------- */
  const triggerFlash = (isPlayer: boolean) => {
    if (isPlayer) { setPlayerFlash(true); setTimeout(() => setPlayerFlash(false), 150); }
    else { setEnemyFlash(true); setTimeout(() => setEnemyFlash(false), 150); }
  };

  function useSkill(skill: Skill) {
    if (!enemy || !player || turn !== "player" || gameOver) return;

    const manaCost = skill.manaCost || 0;
    if (playerMana < manaCost) {
      setLog(l => ["⚠️ Not enough MP!", ...l]);
      return;
    }

    setPlayerMana(prev => prev - manaCost);

    if (skill.heal) {
      const healAmt = skill.heal;
      setPlayer(p => p ? { ...p, hp: Math.min(p.maxHp, p.hp + healAmt) } : null);
      setLog(l => [`✨ Used ${skill.name} and healed ${healAmt}!`, ...l]);
    } else {
      const powerMult = (skill.dmg || 10) / 10; 
      const damage = Math.floor(player.atk * powerMult * (Math.random() * 0.4 + 0.8));
      triggerFlash(false);
      const newHp = Math.max(0, enemy.hp - damage);
      setEnemy({ ...enemy, hp: newHp });
      setLog(l => [`⚔️ ${skill.name} dealt ${damage} damage!`, ...l]);

      if (newHp <= 0) { handleVictory(enemy); return; }
    }
    setTurn("enemy");
  }

  function handleVictory(defeatedEnemy: any) {
    setGameOver(true);
    setIsDead(true);
    const biomeXpMult: Record<string, number> = { forest: 20, ice: 40, lava: 70, shadow: 120 };
    let xpGained = (biomeXpMult[biome] || 20) * (defeatedEnemy.isElite ? 2.5 : 1);

    const equipRaw = localStorage.getItem("character_equipment");
    const equip = equipRaw ? JSON.parse(equipRaw) : { level: 1, xp: 0, inventory: [] };

    let currentXp = (equip.xp || 0) + xpGained;
    let currentLevel = equip.level || 1;
    while (currentXp >= currentLevel * 100) { currentXp -= currentLevel * 100; currentLevel++; }

    localStorage.setItem("character_equipment", JSON.stringify({ ...equip, xp: currentXp, level: currentLevel }));
    setVictoryMessage(`VICTORY! +${xpGained} XP`);
    localStorage.setItem("lastBattleResult", "win");
    localStorage.setItem("lastDefeatedEnemyId", defeatedEnemy.id);
    setTimeout(() => router.back(), 3000);
  }

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
        setLog(l => [`💀 You died...`, ...l]);
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
          <img src={player.image} style={S.sprite} />
          <Bar label="HP" value={player.hp} max={player.maxHp} color="#22c55e" />
          <Bar label="MP" value={playerMana} max={maxMana} color="#3b82f6" />
        </div>
        <div style={{ fontSize: 40, fontWeight: "bold" }}>VS</div>
        <div style={{ ...S.card, background: enemyFlash ? "#7f1d1d" : "#111827", border: enemy.isElite ? "3px solid #fbbf24" : "3px solid white", ...(isDead ? S.deathAnim : {}) }}>
          <h3>{enemy.name}</h3>
          <img src={enemy.image} style={S.sprite} />
          {isDead && <div style={S.killOverlay}>{victoryMessage}</div>}
          <Bar label="HP" value={enemy.hp} max={enemy.maxHp} color="#ef4444" />
        </div>
      </div>

      <div style={S.controls}>
        {playerSkills.map(s => (
          <button key={s.id} style={{...S.btn, opacity: playerMana < (s.manaCost || 0) ? 0.5 : 1}} disabled={turn !== "player" || gameOver || playerMana < (s.manaCost || 0)} onClick={() => useSkill(s)}>
            {s.name}
            <div style={{fontSize: 10}}>{s.manaCost ? `MP ${s.manaCost}` : "FREE"}</div>
          </button>
        ))}
      </div>

      <div style={S.log}>{log.map((msg, i) => <div key={i}>{msg}</div>)}</div>
    </main>
  );
}

function Bar({ label, value, max, color }: any) {
  const pct = Math.max(0, (value / max) * 100);
  return (
    <div style={{ width: "100%", marginTop: 8 }}>
      <div style={{ fontSize: 10, textAlign: 'left' }}>{label}: {value}/{max}</div>
      <div style={{ height: 8, background: "#333", marginTop: 2 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundImage: "url('/biomes/fight.png')", backgroundSize: "cover", color: "white", padding: 24, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" },
  arena: { display: "flex", justifyContent: "center", alignItems: "center", gap: 40, marginTop: 20, background: "rgba(0,0,0,0.5)", padding: "20px", borderRadius: "15px", position: "relative" },
  card: { width: 220, padding: 16, border: "3px solid white", transition: "all 1.5s ease-in-out" },
  sprite: { width: 120, height: 120, objectFit: "contain", imageRendering: "pixelated", marginLeft: 15 },
  controls: { marginTop: 30, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", maxWidth: 400 },
  btn: { padding: "10px", fontSize: "14px", cursor: "pointer", background: "#1e293b", color: "white", border: "2px solid #334155", borderRadius: "8px", fontWeight: "bold" },
  log: { marginTop: 20, width: "100%", maxWidth: 450, height: 100, overflowY: "auto", background: "rgba(0,0,0,0.8)", padding: 15, fontSize: 13, textAlign: "left", borderLeft: "4px solid #3b82f6" },
  deathAnim: { filter: "grayscale(1) brightness(0.2)", transform: "rotate(90deg) translateY(50px)", opacity: 0 },
  killOverlay: { position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)", color: "#fbbf24", fontWeight: "900", fontSize: "24px", width: "100%", textShadow: "2px 2px 0 #000", zIndex: 100 }
};