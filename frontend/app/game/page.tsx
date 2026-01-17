"use client";

import { useEffect, useMemo, useState } from "react";
import { BIOMES } from "./biomes";

/** ---- EXPECTED BIOMES SHAPE ----
 * BIOMES = [
 *  { id:"forest-ruins", name:"Forest Ruins", image:"/biomes/forest.png", effect:"forest" },
 *  { id:"ice-temple", name:"Ice Temple", image:"/biomes/ice.png", effect:"ice" },
 *  { id:"lava-cavern", name:"Lava Cavern", image:"/biomes/lava.png", effect:"lava" },
 *  { id:"shadow-fortress", name:"Shadow Fortress", image:"/biomes/shadow.png", effect:"shadow" },
 * ]
 */

type PlayerStats = {
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  armor: number;
  atk: number;
};

const DEFAULT_STATS: PlayerStats = {
  level: 1,
  hp: 100,
  maxHp: 100,
  mana: 60,
  maxMana: 60,
  armor: 20,
  atk: 5,
};

const UNLOCK_LEVEL: Record<string, number> = {
  "forest-ruins": 1,
  "ice-temple": 2,
  "lava-cavern": 4,
  "shadow-fortress": 6,
};

const THEME: Record<string, { accent: string; glow: string; panel: string }> = {
  forest: { accent: "#22c55e", glow: "rgba(34,197,94,0.35)", panel: "rgba(3,18,8,0.70)" },
  ice: { accent: "#38bdf8", glow: "rgba(56,189,248,0.35)", panel: "rgba(2,12,20,0.70)" },
  lava: { accent: "#fb7185", glow: "rgba(251,113,133,0.35)", panel: "rgba(20,6,6,0.72)" },
  shadow: { accent: "#a78bfa", glow: "rgba(167,139,250,0.35)", panel: "rgba(10,6,20,0.72)" },
};

export default function GameBiomeSelectPage() {
  const [index, setIndex] = useState(0);
  const biome = BIOMES[index];

  const [stats, setStats] = useState<PlayerStats>(DEFAULT_STATS);
  const [transitioning, setTransitioning] = useState(false);

  // load from equipment save
  useEffect(() => {
    try {
      const saved = localStorage.getItem("character_equipment");
      if (!saved) return;

      const parsed = JSON.parse(saved);

      // If you saved these fields in equipment page (as in your code):
      const level = Number(parsed.level ?? 1);
      // Equipment page showed full bars; we can mimic same base formulas:
      const maxHp = 100 + (level - 1) * 10;
      const baseArmor = 20 + (level - 1) * 3;
      const maxMana = 60 + (level - 1) * 8;
      const baseAtk = 5 + (level - 1) * 2;

      // Sum equipped bonuses from slots
      const slots = parsed.slots ?? {};
      const equipped = Object.values(slots).filter(Boolean) as any[];

      const bonusArmor = equipped.reduce((sum, it) => sum + Number(it.armor ?? 0), 0);
      const bonusAtk = equipped.reduce((sum, it) => sum + Number(it.damage ?? 0), 0);

      setStats({
        level,
        hp: maxHp,
        maxHp,
        mana: maxMana,
        maxMana,
        armor: baseArmor + bonusArmor,
        atk: baseAtk + bonusAtk,
      });
    } catch {
      // ignore parse errors, keep defaults
    }
  }, []);

  const unlockLv = UNLOCK_LEVEL[biome.id] ?? 1;
  const isUnlocked = stats.level >= unlockLv;

  const theme = useMemo(() => {
    const key = biome.effect || "forest";
    return THEME[key] ?? THEME.forest;
  }, [biome.effect]);

  function next() {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setIndex((i) => (i + 1) % BIOMES.length);
      setTransitioning(false);
    }, 260);
  }

  function prev() {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setIndex((i) => (i - 1 + BIOMES.length) % BIOMES.length);
      setTransitioning(false);
    }, 260);
  }

  function enterBiome() {
    if (!isUnlocked) return;
    localStorage.setItem("selected_biome", biome.id);
    window.location.href = `/biomes/${biome.id}`;
  }

  function exitToHub() {
    window.location.href = "/home";
  }

  return (
    <main style={{ ...S.bg, ["--accent" as any]: theme.accent, ["--glow" as any]: theme.glow }}>
      <div style={S.shell}>
        {/* TOP BAR */}
        <div style={S.topBar}>
          <button style={S.exitBtn} onClick={exitToHub}>
            ⬅ Exit to HUB
          </button>

          <div style={S.statsWrap}>
            <div style={S.statsTitle}>YOUR STATS</div>

            <div style={S.statsGrid}>
              <StatBox title="LEVEL" value={`LV ${stats.level}`} accent={theme.accent} />
              <StatBox
                title="HP"
                value={`${stats.hp}/${stats.maxHp}`}
                barPct={(stats.hp / stats.maxHp) * 100}
                accent={theme.accent}
              />
              <StatBox
                title="MANA"
                value={`${stats.mana}/${stats.maxMana}`}
                barPct={(stats.mana / stats.maxMana) * 100}
                accent={theme.accent}
              />
              <StatBox title="ARMOR" value={`${stats.armor}`} accent={theme.accent} />
              <StatBox title="ATK" value={`${stats.atk}`} accent={theme.accent} />
            </div>
          </div>
        </div>

        {/* BIOME CARD */}
        <div
          style={{
            ...S.card,
            background: theme.panel,
            boxShadow: `0 0 0 3px rgba(255,255,255,0.18), 0 0 40px var(--glow)`,
            opacity: transitioning ? 0 : 1,
            transform: transitioning ? "scale(0.98)" : "scale(1)",
            borderColor: theme.accent,
          }}
        >
          <div style={{ ...S.cardTitle, color: theme.accent }}>{biome.name}</div>

          <div style={{ ...S.imageFrame, borderColor: theme.accent }}>
            <img src={biome.image} style={S.image} />
          </div>

          <div style={S.unlockLine}>
            <span style={{ color: "rgba(255,255,255,0.85)" }}>Unlock:</span>{" "}
            <span style={{ color: theme.accent, fontWeight: 800 }}>LV {unlockLv}</span>{" "}
            <span style={{ color: isUnlocked ? "#86efac" : "#fde68a", fontWeight: 800 }}>
              ({isUnlocked ? "UNLOCKED" : "LOCKED"})
            </span>
          </div>

          <div style={S.subHint}>
            {isUnlocked ? "You can enter this biome." : `Reach LV ${unlockLv} to enter this biome.`}
          </div>
        </div>

        {/* CONTROLS */}
        <div style={S.controls}>
          <button style={S.arrowBtn} onClick={prev} aria-label="Previous biome">
            ←
          </button>

          <button
            style={{
              ...S.enterBtn,
              background: isUnlocked ? theme.accent : "rgba(255,255,255,0.20)",
              color: isUnlocked ? "#111" : "rgba(255,255,255,0.95)",
              borderColor: isUnlocked ? theme.accent : "rgba(255,255,255,0.55)",
              boxShadow: isUnlocked
                ? `0 0 18px ${theme.glow}, 0 0 0 3px rgba(0,0,0,0.35) inset`
                : "0 0 0 3px rgba(0,0,0,0.35) inset",
              opacity: isUnlocked ? 1 : 0.95,
              filter: isUnlocked ? "none" : "grayscale(0.1)",
            }}
            onClick={enterBiome}
            disabled={!isUnlocked}
          >
            {isUnlocked ? "ENTER" : "LOCKED"}
          </button>

          <button style={S.arrowBtn} onClick={next} aria-label="Next biome">
            →
          </button>
        </div>

        {/* BRIGHTER LOCK MESSAGE (your request #2) */}
        {!isUnlocked && (
          <div style={S.lockBanner}>
            <div style={S.lockBannerTitle}>LOCKED</div>
            <div style={S.lockBannerText}>Reach LV {unlockLv} to enter this biome.</div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ---------------- UI PIECES ---------------- */

function StatBox({
  title,
  value,
  barPct,
  accent,
}: {
  title: string;
  value: string;
  barPct?: number;
  accent: string;
}) {
  return (
    <div style={S.statBox}>
      <div style={S.statTitle}>{title}</div>
      <div style={S.statValue}>{value}</div>

      {barPct != null && (
        <div style={S.statBarBg}>
          <div style={{ ...S.statBarFill, width: `${Math.max(0, Math.min(100, barPct))}%`, background: accent }} />
        </div>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const S: Record<string, React.CSSProperties> = {
  bg: {
    minHeight: "100vh",
    width: "100vw",
    backgroundImage: "url('/home-hub.png')",
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    imageRendering: "pixelated",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    color: "white",
  },

  shell: {
    width: "min(1200px, 96vw)",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  topBar: {
    display: "flex",
    alignItems: "stretch",
    gap: 16,
  },

  exitBtn: {
    padding: "10px 14px",
    border: "2px solid rgba(255,255,255,0.45)",
    background: "rgba(0,0,0,0.55)",
    color: "rgba(255,255,255,0.95)",
    fontWeight: 800,
    letterSpacing: 1,
    cursor: "pointer",
    width: 190,
  },

  statsWrap: {
    flex: 1,
    padding: 16,
    border: "2px solid rgba(255,255,255,0.25)",
    background: "rgba(0,0,0,0.55)",
    boxShadow: "0 0 0 3px rgba(0,0,0,0.35) inset",
  },

  statsTitle: {
    fontWeight: 900,
    letterSpacing: 3,
    color: "var(--accent)",
    marginBottom: 12,
    fontSize: 18,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 12,
  },

  statBox: {
    border: "2px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.45)",
    padding: 12,
    minHeight: 78,
  },

  statTitle: {
    fontSize: 12,
    letterSpacing: 1.5,
    opacity: 0.85,
    marginBottom: 6,
  },

  statValue: {
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: 1,
  },

  statBarBg: {
    marginTop: 10,
    height: 10,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.10)",
  },

  statBarFill: {
    height: "100%",
    transition: "width 0.25s ease",
  },

  card: {
    alignSelf: "center",
    width: "min(720px, 96vw)",
    padding: 22,
    border: "3px solid var(--accent)",
    transition: "all 0.26s ease",
  },

  cardTitle: {
    fontSize: 40,
    letterSpacing: 3,
    fontWeight: 900,
    textAlign: "center",
    marginBottom: 14,
    textShadow: "0 0 16px var(--glow)",
  },

  imageFrame: {
    border: "4px solid var(--accent)",
    padding: 10,
    background: "rgba(0,0,0,0.55)",
    boxShadow: "0 0 0 3px rgba(0,0,0,0.45) inset",
  },

  image: {
    width: "100%",
    maxHeight: 360,
    objectFit: "cover",
    imageRendering: "pixelated",
    display: "block",
  },

  unlockLine: {
    textAlign: "center",
    marginTop: 14,
    fontSize: 18,
    letterSpacing: 1,
  },

  subHint: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
    opacity: 0.9,
  },

  controls: {
    display: "flex",
    gap: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  arrowBtn: {
    width: 64,
    height: 52,
    fontSize: 26,
    fontWeight: 900,
    border: "2px solid rgba(255,255,255,0.35)",
    background: "rgba(0,0,0,0.55)",
    color: "rgba(255,255,255,0.95)",
    cursor: "pointer",
  },

  enterBtn: {
    width: 220,
    height: 52,
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: 2,
    border: "2px solid rgba(255,255,255,0.55)",
    cursor: "pointer",
  },

  // brighter + clearer lock message
  lockBanner: {
    alignSelf: "center",
    width: "min(720px, 96vw)",
    padding: 12,
    border: "2px solid rgba(255,255,255,0.60)",
    background: "rgba(0,0,0,0.70)",
    boxShadow: "0 0 22px rgba(255,255,255,0.18)",
    textAlign: "center",
  },
  lockBannerTitle: {
    fontWeight: 1000 as any,
    letterSpacing: 4,
    color: "#fff",
    textShadow: "0 0 14px rgba(255,255,255,0.35)",
    marginBottom: 4,
  },
  lockBannerText: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: 800,
    letterSpacing: 1,
  },
};
