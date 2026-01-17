"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "strength" | "agility";
type StrengthLevel = 1 | 2 | 3 | 4 | 5;

const BASE_STR = 10;
const BASE_AGI = 0;

const STRENGTH_LEVELS: { level: StrengthLevel; name: string; desc: string }[] = [
  { level: 1, name: "Incline Push-up", desc: "+5 STR" },
  { level: 2, name: "Knee Push-up", desc: "+5 STR" },
  { level: 3, name: "Push-up", desc: "+5 STR" },
  { level: 4, name: "Dips", desc: "+5 STR" },
  { level: 5, name: "Pull-up (Boss)", desc: "+5 STR" },
];

const AEROBIC_TYPES = ["Running", "Swimming", "Cycling", "Jump Rope"] as const;
type AerobicType = (typeof AEROBIC_TYPES)[number];

// 10 min = +1 AGI
function agilityPointsFromMinutes(mins: number) {
  return Math.max(0, Math.floor(mins / 10));
}

export default function WorkoutPage() {
  const [mode, setMode] = useState<Mode>("strength");

  // Strength (draft -> confirm)
  const [strengthDraft, setStrengthDraft] = useState<StrengthLevel | null>(null);
  const [strengthConfirmed, setStrengthConfirmed] = useState<StrengthLevel | null>(null);

  // Agility (draft -> confirm)
  const [aerobicDraft, setAerobicDraft] = useState<AerobicType>("Running");
  const [minutesDraft, setMinutesDraft] = useState<number>(20);
  const [aerobicConfirmed, setAerobicConfirmed] = useState<{ type: AerobicType; minutes: number } | null>(null);

  // Stats (persisted)
  const [strength, setStrength] = useState<number>(BASE_STR);
  const [agility, setAgility] = useState<number>(BASE_AGI);

  // load stats once (with base fallback)
  useEffect(() => {
    const saved = localStorage.getItem("dr_stats");
    if (saved) {
      const parsed = JSON.parse(saved);
      setStrength(typeof parsed.strength === "number" ? parsed.strength : BASE_STR);
      setAgility(typeof parsed.agility === "number" ? parsed.agility : BASE_AGI);
    } else {
      localStorage.setItem("dr_stats", JSON.stringify({ strength: BASE_STR, agility: BASE_AGI }));
    }
  }, []);

  // persist stats
  useEffect(() => {
    localStorage.setItem("dr_stats", JSON.stringify({ strength, agility }));
  }, [strength, agility]);

  const strengthHasChanges = useMemo(
    () => strengthDraft !== strengthConfirmed,
    [strengthDraft, strengthConfirmed]
  );

  const agilityHasChanges = useMemo(() => {
    if (!aerobicConfirmed) return true;
    return aerobicConfirmed.type !== aerobicDraft || aerobicConfirmed.minutes !== minutesDraft;
  }, [aerobicConfirmed, aerobicDraft, minutesDraft]);

  function confirmStrength() {
    if (!strengthDraft) return;
    setStrengthConfirmed(strengthDraft);
    setStrength((s) => s + 5);
  }

  function cancelStrength() {
    setStrengthDraft(strengthConfirmed);
  }

  function confirmAgility() {
    const pts = agilityPointsFromMinutes(minutesDraft);
    setAerobicConfirmed({ type: aerobicDraft, minutes: minutesDraft });
    setAgility((a) => a + pts);
  }

  function cancelAgility() {
    if (!aerobicConfirmed) return;
    setAerobicDraft(aerobicConfirmed.type);
    setMinutesDraft(aerobicConfirmed.minutes);
  }

  function resetToBase() {
    setStrength(BASE_STR);
    setAgility(BASE_AGI);
    localStorage.setItem("dr_stats", JSON.stringify({ strength: BASE_STR, agility: BASE_AGI }));

    // (optional) clear selected plans too
    setStrengthDraft(null);
    setStrengthConfirmed(null);
    setAerobicDraft("Running");
    setMinutesDraft(20);
    setAerobicConfirmed(null);
  }

  return (
    <main style={S.page}>
      <div style={S.board}>
        <div style={S.headerBar}>
          <h1 style={S.h1}>WORKOUT SELECT</h1>
        </div>

        <div style={S.statsRow}>
          <div style={S.statChip}>STR: {strength}</div>
          <div style={S.statChip}>AGI: {agility}</div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.resetBtn} onClick={resetToBase}>
              RESET
            </button>
            <button style={S.backBtn} onClick={() => (window.location.href = "/home")}>
              ⬅ HUB
            </button>
          </div>
        </div>

        <div style={S.tabs}>
          <button
            style={{ ...S.tab, ...(mode === "strength" ? S.tabActive : null) }}
            onClick={() => setMode("strength")}
          >
            STRENGTH
          </button>
          <button
            style={{ ...S.tab, ...(mode === "agility" ? S.tabActive : null) }}
            onClick={() => setMode("agility")}
          >
            AGILITY (AEROBIC)
          </button>
        </div>

        {/* Fixed-size content area so both tabs stay same height */}
        <div style={S.content}>
          {mode === "strength" ? (
            <>
              <p style={S.subtitle}>Pick a level (L5 Pull-up is hardest). Completing adds +5 STR.</p>

              <div style={S.list}>
                {STRENGTH_LEVELS.map((lvl) => {
                  const active = strengthDraft === lvl.level;
                  return (
                    <button
                      key={lvl.level}
                      style={{ ...S.levelRow, ...(active ? S.levelRowActive : null) }}
                      onClick={() => setStrengthDraft(lvl.level)}
                    >
                      <span>LV {lvl.level}</span>
                      <span style={{ textTransform: "capitalize" }}>{lvl.name}</span>
                      <span style={S.badge}>{lvl.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div style={S.actions}>
                <button style={S.confirmBtn} disabled={!strengthDraft || !strengthHasChanges} onClick={confirmStrength}>
                  CONFIRM
                </button>
                <button style={S.cancelBtn} disabled={!strengthHasChanges} onClick={cancelStrength}>
                  CANCEL
                </button>
              </div>

              <div style={S.divider} />
              <h3 style={S.h3}>— Your Plan —</h3>
              {strengthConfirmed ? (
                <p style={S.planLine}>
                  Strength: LV {strengthConfirmed} (
                  {STRENGTH_LEVELS.find((x) => x.level === strengthConfirmed)?.name})
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p style={S.subtitle}>
                Choose aerobic type and duration. Agility gain = <b>+1 AGI per 10 minutes</b> (adjust anytime).
              </p>

              <div style={S.agilityGrid}>
                <div>
                  <div style={S.label}>Activity</div>
                  <select
                    style={S.select}
                    value={aerobicDraft}
                    onChange={(e) => setAerobicDraft(e.target.value as AerobicType)}
                  >
                    {AEROBIC_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={S.label}>Duration (minutes)</div>
                  <input
                    style={S.input}
                    type="number"
                    min={0}
                    step={5}
                    value={minutesDraft}
                    onChange={(e) => setMinutesDraft(Number(e.target.value))}
                  />
                </div>

                <div style={S.preview}>Gain: +{agilityPointsFromMinutes(minutesDraft)} AGI</div>
              </div>

              <div style={S.actions}>
                <button style={S.confirmBtn} disabled={!agilityHasChanges} onClick={confirmAgility}>
                  CONFIRM
                </button>
                <button style={S.cancelBtn} disabled={!agilityHasChanges || !aerobicConfirmed} onClick={cancelAgility}>
                  CANCEL
                </button>
              </div>

              <div style={S.divider} />
              <h3 style={S.h3}>— Your Plan —</h3>
              {aerobicConfirmed ? (
                <p style={S.planLine}>
                  Agility: {aerobicConfirmed.type} ({aerobicConfirmed.minutes} min)
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    backgroundImage: "url('/ui/workout-bg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    imageRendering: "pixelated",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  board: {
    width: "min(900px, 96vw)",
    padding: 22,
    background: "linear-gradient(180deg, rgba(245,226,188,0.95) 0%, rgba(223,196,150,0.95) 100%)",
    border: "6px solid rgba(70,40,20,0.9)",
    boxShadow: "10px 10px 0 rgba(0,0,0,0.65)",
    color: "#2b1a10",
  },
  headerBar: {
    padding: "14px 16px",
    border: "4px solid rgba(70,40,20,0.9)",
    background: "linear-gradient(180deg, #2a1a10 0%, #1a0f08 100%)",
    boxShadow: "6px 6px 0 rgba(0,0,0,0.55)",
    marginBottom: 12,
  },
  h1: {
    margin: 0,
    fontSize: 20,
    color: "#f4d06f",
    textShadow: "3px 3px 0 #000",
    letterSpacing: 1,
    lineHeight: 1.2,
    textAlign: "center",
  },
  statsRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statChip: {
    border: "3px solid rgba(70,40,20,0.9)",
    padding: "8px 10px",
    background: "rgba(255,255,255,0.25)",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.45)",
  },
  backBtn: {
    border: "3px solid rgba(70,40,20,0.9)",
    padding: "8px 10px",
    background: "#9ee6ff",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
  },
  resetBtn: {
    border: "3px solid rgba(70,40,20,0.9)",
    padding: "8px 10px",
    background: "#ffd36f",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
  },
  tabs: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  tab: {
    padding: "10px 12px",
    border: "4px solid rgba(70,40,20,0.9)",
    background: "rgba(255,255,255,0.2)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
  },
  tabActive: { background: "rgba(255,255,255,0.35)" },

  content: {
    minHeight: 520,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  },

  subtitle: { margin: "6px 0 12px 0", textAlign: "center", fontSize: 12 },

  list: {
    display: "grid",
    gap: 10,
    maxWidth: 720,
    margin: "0 auto",
    flex: 1,
    overflowY: "auto",
    paddingRight: 6,
  },

  levelRow: {
    display: "grid",
    gridTemplateColumns: "90px 1fr 110px",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    border: "3px solid rgba(70,40,20,0.75)",
    background: "rgba(255,255,255,0.22)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.4)",
    cursor: "pointer",
    textAlign: "left",
  },
  levelRowActive: { background: "rgba(255,255,255,0.35)" },
  badge: {
    justifySelf: "end",
    border: "2px solid rgba(70,40,20,0.9)",
    padding: "4px 6px",
    background: "rgba(0,0,0,0.12)",
    textAlign: "center",
  },
  actions: { display: "flex", gap: 10, justifyContent: "center", marginTop: 14 },
  confirmBtn: {
    padding: "10px 14px",
    border: "4px solid rgba(70,40,20,0.9)",
    background: "#22c55e",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "10px 14px",
    border: "4px solid rgba(70,40,20,0.9)",
    background: "#ff7b7b",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
  },
  divider: { height: 3, background: "rgba(70,40,20,0.55)", margin: "18px auto 12px auto", width: "85%" },
  h3: { margin: 0, textAlign: "center", fontSize: 14 },
  planLine: { marginTop: 10, textAlign: "center", fontSize: 12 },

  agilityGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    maxWidth: 720,
    margin: "0 auto",
    alignItems: "end",
  },
  label: { fontSize: 12, marginBottom: 6, textAlign: "left" },
  select: {
    width: "100%",
    padding: "10px 10px",
    border: "3px solid rgba(70,40,20,0.75)",
    background: "rgba(255,255,255,0.35)",
  },
  input: {
    width: "100%",
    padding: "10px 10px",
    border: "3px solid rgba(70,40,20,0.75)",
    background: "rgba(255,255,255,0.35)",
  },
  preview: {
    gridColumn: "1 / -1",
    textAlign: "center",
    padding: "10px 12px",
    border: "3px solid rgba(70,40,20,0.75)",
    background: "rgba(255,255,255,0.22)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.4)",
  },
};
