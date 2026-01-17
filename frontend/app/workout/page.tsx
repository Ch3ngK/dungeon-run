"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "strength" | "agility";
type StrengthLevel = 1 | 2 | 3 | 4 | 5;

const BASE_STR = 10;
const BASE_AGI = 0;

const STRENGTH_LEVELS: { level: StrengthLevel; name: string; desc: string }[] = [
  { level: 1, name: "Incline Push-up", desc: "+STR (Easy)" },
  { level: 2, name: "Knee Push-up", desc: "+STR (Normal)" },
  { level: 3, name: "Push-up", desc: "+STR (Hard)" },
  { level: 4, name: "Dips", desc: "+STR (Very Hard)" },
  { level: 5, name: "Pull-up (Boss)", desc: "+STR (Boss)" },
];

const AEROBIC_TYPES = ["Running", "Swimming", "Cycling", "Jump Rope"] as const;
type AerobicType = (typeof AEROBIC_TYPES)[number];

function agilityPointsFromMinutes(mins: number) {
  return Math.max(0, Math.floor(mins / 10));
}

function strengthGain(level: StrengthLevel) {
  const table: Record<StrengthLevel, number> = {
    1: 5,
    2: 7,
    3: 9,
    4: 12,
    5: 15,
  };
  return table[level];
}

export default function WorkoutPage() {
  const [mode, setMode] = useState<Mode>("strength");

  const [strengthDraft, setStrengthDraft] = useState<StrengthLevel | null>(null);

  const [aerobicDraft, setAerobicDraft] = useState<AerobicType>("Running");
  const [minutesDraft, setMinutesDraft] = useState<number>(20);
  const [aerobicConfirmed, setAerobicConfirmed] = useState<{ type: AerobicType; minutes: number } | null>(null);

  const [strength, setStrength] = useState<number>(BASE_STR);
  const [agility, setAgility] = useState<number>(BASE_AGI);

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

  // ✅ consume record result (Finish)
  useEffect(() => {
    const raw = localStorage.getItem("workout_record_result");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.kind === "strength" && typeof parsed.gain === "number") {
        setStrength((s) => s + parsed.gain);
      }
    } catch {}
    localStorage.removeItem("workout_record_result");
  }, []);

  useEffect(() => {
    localStorage.setItem("dr_stats", JSON.stringify({ strength, agility }));
  }, [strength, agility]);

  const agilityHasChanges = useMemo(() => {
    if (!aerobicConfirmed) return true;
    return aerobicConfirmed.type !== aerobicDraft || aerobicConfirmed.minutes !== minutesDraft;
  }, [aerobicConfirmed, aerobicDraft, minutesDraft]);

  function confirmStrength() {
    if (!strengthDraft) return;
    const gain = strengthGain(strengthDraft);

    // ✅ go to camera + pose rep counting
    window.location.href = `/workout/record?level=${strengthDraft}&gain=${gain}`;
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

    setStrengthDraft(null);
    setAerobicDraft("Running");
    setMinutesDraft(20);
    setAerobicConfirmed(null);
  }

  return (
    <main style={S.page}>
      <div style={S.bg}>
        <div style={S.panel}>
          <h1 style={S.title}>🏋️ WORKOUT</h1>

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
            <button style={{ ...S.tab, ...(mode === "strength" ? S.tabActive : null) }} onClick={() => setMode("strength")}>
              STRENGTH
            </button>
            <button style={{ ...S.tab, ...(mode === "agility" ? S.tabActive : null) }} onClick={() => setMode("agility")}>
              AGILITY (AEROBIC)
            </button>
          </div>

          <div style={S.content}>
            {mode === "strength" ? (
              <>
                <p style={S.subtitle}>
                  Pick a strength level, then <b>CONFIRM</b> to open the camera. MediaPipe Pose will count reps.
                </p>

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
                        <span style={S.badge}>+{strengthGain(lvl.level)} STR</span>
                      </button>
                    );
                  })}
                </div>

                <div style={S.actions}>
                  <button style={S.confirmBtn} disabled={!strengthDraft} onClick={confirmStrength}>
                    CONFIRM ➜ CAMERA
                  </button>
                </div>

                <div style={S.tip}>
                  After you press <b>Finish</b> on the camera page, STR will be added automatically when you return.
                </div>
              </>
            ) : (
              <>
                <p style={S.subtitle}>
                  Choose aerobic type and duration. Agility gain = <b>+1 AGI per 10 minutes</b>.
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
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0b1020" },
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
  panel: {
    width: "min(900px, 96vw)",
    padding: 22,
    background: "rgba(15, 23, 42, 0.85)",
    border: "6px solid rgba(255,255,255,0.85)",
    boxShadow: "10px 10px 0 rgba(0,0,0,0.65)",
    color: "white",
  },
  title: {
    margin: 0,
    textAlign: "center",
    letterSpacing: 2,
    textShadow: "3px 3px 0 rgba(0,0,0,0.7)",
  },
  statsRow: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  statChip: {
    border: "3px solid rgba(255,255,255,0.85)",
    padding: "8px 10px",
    background: "rgba(0,0,0,0.35)",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.45)",
    fontWeight: 900,
  },
  backBtn: {
    border: "3px solid rgba(255,255,255,0.85)",
    padding: "8px 10px",
    background: "#9ee6ff",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
    fontWeight: 900,
  },
  resetBtn: {
    border: "3px solid rgba(255,255,255,0.85)",
    padding: "8px 10px",
    background: "#ffd36f",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
    fontWeight: 900,
  },
  tabs: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 },
  tab: {
    padding: "10px 12px",
    border: "4px solid rgba(255,255,255,0.85)",
    background: "rgba(0,0,0,0.25)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
    fontWeight: 900,
    color: "white",
  },
  tabActive: { background: "rgba(255,255,255,0.18)" },

  content: { minHeight: 520, marginTop: 12 },
  subtitle: { margin: "6px 0 12px 0", textAlign: "center", fontSize: 12, opacity: 0.95 },

  list: {
    display: "grid",
    gap: 10,
    maxWidth: 720,
    margin: "0 auto",
    overflowY: "auto",
    paddingRight: 6,
  },
  levelRow: {
    display: "grid",
    gridTemplateColumns: "90px 1fr 120px",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    border: "3px solid rgba(255,255,255,0.75)",
    background: "rgba(0,0,0,0.25)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.4)",
    cursor: "pointer",
    textAlign: "left",
    color: "white",
    fontWeight: 800,
  },
  levelRowActive: { background: "rgba(255,255,255,0.12)" },
  badge: {
    justifySelf: "end",
    border: "2px solid rgba(255,255,255,0.85)",
    padding: "4px 6px",
    background: "rgba(0,0,0,0.2)",
    textAlign: "center",
    fontWeight: 900,
  },
  actions: { display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" },
  confirmBtn: {
    padding: "10px 14px",
    border: "4px solid rgba(255,255,255,0.85)",
    background: "#ffd36f",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
    fontWeight: 900,
  },
  cancelBtn: {
    padding: "10px 14px",
    border: "4px solid rgba(255,255,255,0.85)",
    background: "#ff7b7b",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
    fontWeight: 900,
  },

  agilityGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    maxWidth: 720,
    margin: "0 auto",
    alignItems: "end",
  },
  label: { fontSize: 12, marginBottom: 6, textAlign: "left", opacity: 0.95 },
  select: {
    width: "100%",
    padding: "10px 10px",
    border: "3px solid rgba(255,255,255,0.75)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
  },
  input: {
    width: "100%",
    padding: "10px 10px",
    border: "3px solid rgba(255,255,255,0.75)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
  },
  preview: {
    gridColumn: "1 / -1",
    textAlign: "center",
    padding: "10px 12px",
    border: "3px solid rgba(255,255,255,0.75)",
    background: "rgba(0,0,0,0.25)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.4)",
    fontWeight: 900,
  },

  tip: { marginTop: 12, fontSize: 12, opacity: 0.9, textAlign: "center" },
};