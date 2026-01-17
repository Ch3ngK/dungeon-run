"use client";

import { useEffect, useMemo, useState } from "react";
import "@/app/tooltip.css";

type Skill = {
  id: string;
  name: string;
  desc: string;
  manaCost?: number;
  dmg?: number;
  heal?: number;
  reqLevel: number;
  element?: "neutral" | "ice" | "fire" | "nature" | "shadow";
};

const ALL_SKILLS: Skill[] = [
  { id: "strike", name: "Strike", desc: "Basic attack.", dmg: 8, reqLevel: 1, element: "neutral" },
  { id: "guard", name: "Guard", desc: "Reduce damage next turn.", reqLevel: 1, element: "neutral" },
  { id: "first_aid", name: "First Aid", desc: "Heal a little.", heal: 10, manaCost: 5, reqLevel: 1, element: "neutral" },

  { id: "power_slash", name: "Power Slash", desc: "Heavy hit.", dmg: 18, manaCost: 8, reqLevel: 2, element: "neutral" },
  { id: "ice_shard", name: "Ice Shard", desc: "Ice damage.", dmg: 14, manaCost: 7, reqLevel: 2, element: "ice" },

  { id: "fire_bolt", name: "Fire Bolt", desc: "Fire damage.", dmg: 16, manaCost: 8, reqLevel: 3, element: "fire" },
  { id: "thorn_whip", name: "Thorn Whip", desc: "Nature damage.", dmg: 15, manaCost: 7, reqLevel: 3, element: "nature" },

  { id: "shadow_bind", name: "Shadow Bind", desc: "Shadow damage + slow.", dmg: 17, manaCost: 9, reqLevel: 4, element: "shadow" },
  { id: "greater_heal", name: "Greater Heal", desc: "Big heal.", heal: 25, manaCost: 14, reqLevel: 4, element: "neutral" },

  { id: "ultimate_burst", name: "Ultimate Burst", desc: "Huge damage.", dmg: 35, manaCost: 20, reqLevel: 6, element: "neutral" },
];

const MAX_EQUIPPED = 4;

export default function SkillsPage() {
  const [level, setLevel] = useState<number>(1);
  const [equipped, setEquipped] = useState<string[]>([]);

  // load level + equipped skills
  useEffect(() => {
    const savedChar = localStorage.getItem("character_equipment");
    if (savedChar) {
      try {
        const parsed = JSON.parse(savedChar);
        setLevel(parsed.level ?? 1);
      } catch {}
    }

    const savedSkills = localStorage.getItem("selected_skills");
    if (savedSkills) {
      try {
        const parsed = JSON.parse(savedSkills);
        if (Array.isArray(parsed)) setEquipped(parsed.slice(0, MAX_EQUIPPED));
      } catch {}
    }
  }, []);

  const unlocked = useMemo(() => {
    return ALL_SKILLS.map((s) => ({
      ...s,
      locked: level < s.reqLevel,
    }));
  }, [level]);

  function toggleSkill(id: string, locked: boolean) {
    if (locked) return;

    setEquipped((prev) => {
      // remove
      if (prev.includes(id)) return prev.filter((x) => x !== id);

      // add (cap 4)
      if (prev.length >= MAX_EQUIPPED) return prev;

      return [...prev, id];
    });
  }

  function saveSkills() {
    localStorage.setItem("selected_skills", JSON.stringify(equipped.slice(0, MAX_EQUIPPED)));
    alert("Skills saved!");
  }

  function resetSkills() {
    if (!confirm("Clear equipped skills?")) return;
    setEquipped([]);
    localStorage.removeItem("selected_skills");
  }

  const equippedSkills = useMemo(
    () => equipped.map((id) => ALL_SKILLS.find((s) => s.id === id)).filter(Boolean) as Skill[],
    [equipped]
  );

  return (
    <main style={S.page}>
      <div style={S.bg}>
        <div style={S.panel}>
          <h1 style={S.title}>SKILLS</h1>

          {/* TOP BAR */}
          <div style={S.topBar}>
            <button style={S.btn} onClick={() => (window.location.href = "/equipment")}>
              ⬅ Back
            </button>

            <div style={S.levelChip}>LV {level}</div>

            <div style={S.topBarMid}>
              <button style={S.btn} onClick={saveSkills}>
                💾 Save
              </button>
              <button style={{ ...S.btn, background: "#ff7b7b" }} onClick={resetSkills}>
                ♻ Reset
              </button>
            </div>
          </div>

          {/* EQUIPPED */}
          <div style={S.equippedBox}>
            <div style={S.equippedTitle}>
              Equipped ({equipped.length}/{MAX_EQUIPPED})
            </div>

            <div style={S.equippedRow}>
              {Array.from({ length: MAX_EQUIPPED }).map((_, i) => {
                const s = equippedSkills[i];
                return (
                  <div key={i} style={S.equippedSlot}>
                    {s ? (
                      <>
                        <div style={S.equippedName}>{s.name}</div>
                        <div style={S.equippedSub}>
                          {s.dmg != null ? `DMG ${s.dmg}` : s.heal != null ? `HEAL ${s.heal}` : "—"}
                          {s.manaCost != null ? ` • MP ${s.manaCost}` : ""}
                        </div>
                      </>
                    ) : (
                      <div style={{ opacity: 0.7 }}>Empty</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={S.note}>
              Tip: Click skills below to equip/unequip. Locked skills unlock when your level increases.
            </div>
          </div>

          {/* SKILL LIST */}
          <div style={S.grid}>
            {unlocked.map((s) => {
              const isEquipped = equipped.includes(s.id);
              const locked = (s as any).locked as boolean;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSkill(s.id, locked)}
                  style={{
                    ...S.skillCard,
                    ...(isEquipped ? S.skillCardActive : null),
                    ...(locked ? S.skillCardLocked : null),
                  }}
                >
                  <div style={S.skillTop}>
                    <div style={S.skillName}>{s.name}</div>
                    <div style={S.reqLv}>{locked ? `LOCKED (LV ${s.reqLevel})` : `LV ${s.reqLevel}+`}</div>
                  </div>

                  <div style={S.skillDesc}>{s.desc}</div>

                  <div style={S.skillStats}>
                    {s.dmg != null ? <span>DMG {s.dmg}</span> : null}
                    {s.heal != null ? <span>HEAL {s.heal}</span> : null}
                    {s.manaCost != null ? <span>MP {s.manaCost}</span> : <span>MP 0</span>}
                    <span>{(s.element ?? "neutral").toUpperCase()}</span>
                  </div>

                  <div style={S.skillFooter}>
                    {locked ? "Not unlocked" : isEquipped ? "Click to unequip" : equipped.length >= 4 ? "Max 4 equipped" : "Click to equip"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

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
  },
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  panel: {
    width: "min(1100px, 95vw)",
    padding: 24,
    background: "#f3e5c0",
    border: "6px solid #4b2e1e",
    boxShadow: "10px 10px 0 rgba(0,0,0,0.6)",
  },
  title: {
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 2,
    color: "#4b2e1e",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  topBarMid: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  btn: {
    padding: "6px 12px",
    border: "3px solid #4b2e1e",
    background: "#9ee6ff",
    cursor: "pointer",
    fontWeight: 600,
  },
  levelChip: {
    padding: "6px 12px",
    border: "3px solid #4b2e1e",
    background: "rgba(255,255,255,0.35)",
    fontWeight: 800,
    color: "#4b2e1e",
  },

  equippedBox: {
    border: "4px solid #4b2e1e",
    background: "rgba(255,255,255,0.45)",
    padding: 12,
    marginBottom: 14,
  },
  equippedTitle: {
    color: "#4b2e1e",
    fontWeight: 800,
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 1,
  },
  equippedRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },
  equippedSlot: {
    border: "3px solid #333",
    background: "#1f2933",
    color: "white",
    padding: 10,
    minHeight: 64,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    textAlign: "center",
  },
  equippedName: { fontWeight: 800, fontSize: 12 },
  equippedSub: { fontSize: 11, opacity: 0.9, marginTop: 4 },
  note: { marginTop: 10, fontSize: 12, color: "#4b2e1e", textAlign: "center" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
  },
  skillCard: {
    border: "4px solid #4b2e1e",
    background: "rgba(255,255,255,0.35)",
    padding: 12,
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.35)",
  },
  skillCardActive: {
    outline: "4px solid #22c55e",
  },
  skillCardLocked: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  skillTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
  },
  skillName: { fontWeight: 900, color: "#2b1a10", letterSpacing: 1 },
  reqLv: { fontSize: 12, color: "#4b2e1e", fontWeight: 800 },
  skillDesc: { marginTop: 6, fontSize: 12, color: "#2b1a10" },
  skillStats: {
    marginTop: 10,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    fontSize: 12,
    color: "#111827",
    fontWeight: 700,
  },
  skillFooter: { marginTop: 10, fontSize: 12, color: "#4b2e1e", fontWeight: 800 },
};
