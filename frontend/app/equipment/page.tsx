"use client";
import { useEffect, useMemo, useState } from "react";
import "@/app/tooltip.css";

type Slot = "head" | "leftHand" | "rightHand";
type ItemType = "helmet" | "armor" | "weapon";

type Item = {
  id: string;
  name: string;
  icon: string;
  type: ItemType;
  armor?: number; // adds to ARMOR
  damage?: number; // adds to ATK
};

const DEFAULT_ITEMS: Item[] = [
  { id: "iron helmet", name: "Helmet", icon: "🪖", type: "helmet", armor: 5 },
  { id: "iron armor", name: "Armor", icon: "🛡️", type: "armor", armor: 10 },
  { id: "iron sword", name: "Sword", icon: "⚔️", type: "weapon", damage: 15 },
];

const initialSlots: Record<Slot, Item | null> = {
  head: null,
  leftHand: null,
  rightHand: null,
};

function xpNeededForNext(level: number) {
  return level * 100; // change later anytime
}

export default function EquipmentPage() {
  const [inventory, setInventory] = useState<Item[]>(DEFAULT_ITEMS);
  const [slots, setSlots] = useState<Record<Slot, Item | null>>(initialSlots);

  // Gender
  const [gender, setGender] = useState<"guy" | "girl">("guy");

  // XP / LV (saved, logic can change later)
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);

  /* ---------------- DERIVED STATS ---------------- */
  const equipped = useMemo(
    () => Object.values(slots).filter(Boolean) as Item[],
    [slots]
  );

  const bonusArmor = useMemo(
    () => equipped.reduce((sum, it) => sum + (it.armor ?? 0), 0),
    [equipped]
  );

  const bonusAtk = useMemo(
    () => equipped.reduce((sum, it) => sum + (it.damage ?? 0), 0),
    [equipped]
  );

  // Base stats by level (easy to change later)
  const MAX_HEALTH = 100 + (level - 1) * 10;
  const BASE_ARMOR = 20 + (level - 1) * 3;
  const MAX_MANA = 60 + (level - 1) * 8;
  const BASE_ATK = 5 + (level - 1) * 2;

  const currentArmor = BASE_ARMOR + bonusArmor;
  const currentAtk = BASE_ATK + bonusAtk;

  // (Equipment page) show full bars
  const healthNow = MAX_HEALTH;
  const manaNow = MAX_MANA;

  const xpNeed = xpNeededForNext(level);
  const xpPct = Math.min(100, (xp / xpNeed) * 100);

  function gainXp(amount: number) {
    let newXp = xp + amount;
    let newLevel = level;

    while (newXp >= xpNeededForNext(newLevel)) {
      newXp -= xpNeededForNext(newLevel);
      newLevel += 1;
    }

    setXp(newXp);
    setLevel(newLevel);
  }

  /* ---------------- LOAD SAVE ---------------- */
  useEffect(() => {
    const saved = localStorage.getItem("character_equipment");
    if (!saved) return;

    const parsed = JSON.parse(saved);
    setInventory(parsed.inventory ?? DEFAULT_ITEMS);
    setSlots(parsed.slots ?? initialSlots);
    setGender(parsed.gender ?? "guy");
    setLevel(parsed.level ?? 1);
    setXp(parsed.xp ?? 0);
  }, []);

  /* ---------------- SAVE ---------------- */
  function saveCharacter() {
    localStorage.setItem(
      "character_equipment",
      JSON.stringify({ inventory, slots, gender, level, xp })
    );
    alert("Character saved!");
  }

  /* ---------------- RESET ---------------- */
  function resetCharacter() {
    if (!confirm("Reset character?")) return;
    setInventory(DEFAULT_ITEMS);
    setSlots(initialSlots);
    setGender("guy");
    setLevel(1);
    setXp(0);
    localStorage.removeItem("character_equipment");
  }

  /* ---------------- DROP HANDLER ---------------- */
  function onDrop(slot: Slot, itemId: string) {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    // Slot rules:
    // - HEAD only helmet
    // - BOTH hands can hold armor OR weapon
    if (slot === "head" && item.type !== "helmet") return;
    if ((slot === "leftHand" || slot === "rightHand") && item.type === "helmet")
      return;

    // Remove dragged item from inventory
    setInventory((prev) => prev.filter((i) => i.id !== itemId));

    // If slot already has an item, put it back to inventory (swap)
    setSlots((prev) => {
      const replaced = prev[slot];
      if (replaced) {
        setInventory((invPrev) => [...invPrev, replaced]);
      }
      return { ...prev, [slot]: item };
    });
  }

  return (
    <main style={S.page}>
      <div style={S.bg}>
        <div style={S.panel}>
          <h1 style={S.title}>EQUIPMENT</h1>

          {/* TOP BUTTON BAR */}
          <div style={S.topBar}>
            <button
              style={S.btn}
              onClick={() => (window.location.href = "/home")}
            >
              ⬅ Back
            </button>

            <div style={S.topBarMid}>
              <button
                style={S.btn}
                onClick={() => setGender((g) => (g === "guy" ? "girl" : "guy"))}
              >
                🔁 Switch
              </button>

              <button style={S.btn} onClick={saveCharacter}>
                💾 Save
              </button>

              {/* ✅ ADDED: Skills button */}
              <button
                style={S.btn}
                onClick={() => (window.location.href = "/equipment/skills")}
              >
                🎯 Skills
              </button>

              {/* Optional test button; remove anytime */}
              <button style={S.btn} onClick={() => gainXp(50)}>
                +50 XP
              </button>
            </div>

            <button
              style={{ ...S.btn, background: "#ff7b7b" }}
              onClick={resetCharacter}
            >
              ♻ Reset
            </button>
          </div>

          <div style={S.layout}>
            {/* INVENTORY */}
            <div style={S.inventory}>
              <h3 style={S.inventoryTitle}>Inventory</h3>
              <div style={S.items}>
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("item", item.id)}
                    style={S.item}
                    className="tooltip-container"
                  >
                    <div style={{ fontSize: 34 }}>{item.icon}</div>
                    <div style={{ fontSize: 12 }}>{item.name}</div>

                    {/* TOOLTIP */}
                    <div className="tooltip">
                      <strong>{item.name}</strong>
                      <div>
                        {item.armor != null && `Armor +${item.armor}`}
                        {item.damage != null && `ATK +${item.damage}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CHARACTER */}
            <div style={S.characterWrap}>
              <div style={S.characterRow}>
                <div style={S.characterFrame}>
                  <img
                    src={gender === "guy" ? "/guy.png" : "/girl.png"}
                    draggable={false}
                    style={S.characterImg}
                  />

                  <SlotBox
                    slot="head"
                    label="HEAD"
                    top="10%"
                    left="43%"
                    slots={slots}
                    onDrop={onDrop}
                  />
                  <SlotBox
                    slot="leftHand"
                    label="L-HAND"
                    top="55%"
                    left="20%"
                    slots={slots}
                    onDrop={onDrop}
                  />
                  <SlotBox
                    slot="rightHand"
                    label="R-HAND"
                    top="55%"
                    left="72%"
                    slots={slots}
                    onDrop={onDrop}
                  />
                </div>

                {/* STATS PANEL */}
                <div style={S.statsPanel}>
                  <div style={S.levelLine}>LV {level}</div>

                  <div style={S.xpWrap}>
                    <div style={S.statLabel}>
                      XP: {xp}/{xpNeed}
                    </div>
                    <div style={S.statBarBg}>
                      <div style={{ ...S.statBarFill, width: `${xpPct}%` }} />
                    </div>
                  </div>

                  <StatBar label="HP" value={healthNow} max={MAX_HEALTH} />
                  <StatBar
                    label="ARMOR"
                    value={currentArmor}
                    max={BASE_ARMOR + 50}
                  />
                  <StatBar label="MANA" value={manaNow} max={MAX_MANA} />

                  <div style={S.atkLine}>ATK: {currentAtk}</div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#4b2e1e",
              textAlign: "center",
            }}
          >
            Rules: HEAD = helmet. Both hands can hold armor or weapon.
          </div>
        </div>
      </div>
    </main>
  );
}

function SlotBox({
  slot,
  label,
  slots,
  onDrop,
  top,
  left,
}: {
  slot: Slot;
  label: string;
  slots: Record<Slot, Item | null>;
  onDrop: (slot: Slot, itemId: string) => void;
  top: string;
  left: string;
}) {
  const item = slots[slot];

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("item");
        if (id) onDrop(slot, id);
      }}
      style={{ ...S.slot, top, left }}
    >
      {item ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26 }}>{item.icon}</div>
          <div style={{ fontSize: 10 }}>{item.name}</div>
        </div>
      ) : (
        label
      )}
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percent = Math.min(100, (value / max) * 100);

  return (
    <div style={S.statRow}>
      <div style={S.statLabel}>
        {label}: {value}/{max}
      </div>
      <div style={S.statBarBg}>
        <div style={{ ...S.statBarFill, width: `${percent}%` }} />
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  bg: {
    minHeight: "100vh",
    width: "100vw",
    backgroundImage: "url('/home-hub.png')",
    backgroundSize: "100% 100%",
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
  },
  topBarMid: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  btn: {
    padding: "6px 12px",
    border: "3px solid #4b2e1e",
    background: "#9ee6ff",
    cursor: "pointer",
    fontWeight: 600,
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 24,
    alignItems: "center",
  },

  inventory: {
    border: "4px solid #4b2e1e",
    padding: 16,
    background: "rgba(255,255,255,0.4)",
  },
  inventoryTitle: {
    textAlign: "center",
    marginBottom: 12,
    color: "#4b2e1e",
  },
  items: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
  },
  item: {
    border: "3px solid #333",
    background: "#1f2933",
    color: "white",
    padding: 10,
    textAlign: "center",
    cursor: "grab",
    userSelect: "none",
  },

  characterWrap: { display: "flex", justifyContent: "center" },
  characterRow: {
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  characterFrame: {
    position: "relative",
    width: 320,
    height: 420,
    border: "4px solid #4b2e1e",
    background: "#111",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  characterImg: {
    maxHeight: "100%",
    imageRendering: "pixelated",
  },

  slot: {
    position: "absolute",
    width: 62,
    height: 62,
    border: "3px dashed #00ffd5",
    background: "rgba(0,0,0,0.6)",
    color: "#00ffd5",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    lineHeight: 1.1,
  },

  statsPanel: {
    width: 200,
    padding: 12,
    border: "3px solid #4b2e1e",
    background: "rgba(0,0,0,0.55)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  levelLine: {
    fontSize: 14,
    letterSpacing: 1,
    fontWeight: 700,
  },

  xpWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  statRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    letterSpacing: 1,
  },
  statBarBg: {
    height: 14,
    background: "#111",
    border: "2px solid #333",
    overflow: "hidden",
  },
  statBarFill: {
    height: "100%",
    transition: "width 0.25s ease",
    background: "#f4d06f",
  },

  atkLine: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
  },
};
