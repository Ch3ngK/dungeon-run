"use client";
import { useEffect, useState } from "react";
import "@/app/tooltip.css";

type Slot = "head" | "chest" | "weapon";

type Item = {
  id: string;
  name: string;
  icon: string;
  armor?: number;
  damage?: number;
};

const DEFAULT_ITEMS: Item[] = [
  { id: "iron helmet", name: "Helmet", icon: "🪖", armor: 5 },
  { id: "iron armor", name: "Armor", icon: "🛡️", armor: 10 },
  { id: "iron sword", name: "Sword", icon: "⚔️", damage: 15 },
];

const initialSlots: Record<Slot, Item | null> = {
  head: null,
  chest: null,
  weapon: null,
};

export default function EquipmentPage() {
  const [inventory, setInventory] = useState<Item[]>(DEFAULT_ITEMS);
  const [slots, setSlots] = useState<Record<Slot, Item | null>>(initialSlots);
  const [health, setHealth] = useState(80);
  const [armor, setArmor] = useState(25);
  const [mana, setMana] = useState(60);

  const MAX_HEALTH = 100;
  const MAX_ARMOR = 100;
  const MAX_MANA = 100;

  /* ---------------- LOAD SAVE ---------------- */
  useEffect(() => {
    const saved = localStorage.getItem("character_equipment");
    if (!saved) return;

    const parsed = JSON.parse(saved);
    setInventory(parsed.inventory ?? DEFAULT_ITEMS);
    setSlots(parsed.slots ?? initialSlots);
  }, []);

  /* ---------------- SAVE ---------------- */
  function saveCharacter() {
    localStorage.setItem(
      "character_equipment",
      JSON.stringify({ inventory, slots })
    );
    alert("Character saved!");
  }

  /* ---------------- RESET ---------------- */
  function resetCharacter() {
    if (!confirm("Reset character?")) return;
    setInventory(DEFAULT_ITEMS);
    setSlots(initialSlots);
    localStorage.removeItem("character_equipment");
  }

  /* ---------------- DROP HANDLER ---------------- */
  function onDrop(slot: Slot, itemId: string) {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    setInventory((prev) => prev.filter((i) => i.id !== itemId));
    setSlots((prev) => ({ ...prev, [slot]: item }));
  }

  return (
    <main style={S.page}>
      <div style={S.bg}>
        <div style={S.panel}>
          <h1 style={S.title}>EQUIPMENT</h1>

          {/* TOP BUTTON BAR */}
          <div style={S.topBar}>
            <button style={S.btn} onClick={() => (window.location.href = "/home")}>
              ⬅ Back
            </button>
            <button style={S.btn} onClick={saveCharacter}>
              💾 Save
            </button>
            <button style={{ ...S.btn, background: "#ff7b7b" }} onClick={resetCharacter}>
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
                    onDragStart={(e) =>
                      e.dataTransfer.setData("item", item.id)
                    }
                    style={S.item}
                    className="tooltip-container"
                  >
                    <div style={{ fontSize: 34 }}>{item.icon}</div>
                    <div style={{ fontSize: 12 }}>{item.name}</div>

                    {/* TOOLTIP */}
                    <div className="tooltip">
                      <strong>{item.name}</strong>
                      <div>
                        {item.armor && `Armor +${item.armor}`}
                        {item.damage && `Damage +${item.damage}`}
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
                    src="/guy.png"
                    draggable={false}
                    style={S.characterImg}
                />

                <SlotBox slot="head" top="8%" left="43%" slots={slots} onDrop={onDrop} />
                <SlotBox slot="chest" top="38%" left="43%" slots={slots} onDrop={onDrop} />
                <SlotBox slot="weapon" top="52%" left="72%" slots={slots} onDrop={onDrop} />
                </div>

                {/* STATS PANEL */}
                <div style={S.statsPanel}>
                <StatBar label="HP" value={80} max={100} color="#ef4444" />
                <StatBar label="ARMOR" value={45} max={100} color="#3b82f6" />
                <StatBar label="MANA" value={60} max={100} color="#8b5cf6" />
                </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------------- SLOT COMPONENT ---------------- */

function SlotBox({
  slot,
  slots,
  onDrop,
  top,
  left,
}: {
  slot: Slot;
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
      style={{
        ...S.slot,
        top,
        left,
      }}
    >
      {item ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26 }}>{item.icon}</div>
          <div style={{ fontSize: 10 }}>{item.name}</div>
        </div>
      ) : (
        slot.toUpperCase()
      )}
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const percent = Math.min(100, (value / max) * 100);

  return (
    <div style={S.statRow}>
      <div style={S.statLabel}>
        {label}: {value}/{max}
      </div>

      <div style={S.statBarBg}>
        <div
          style={{
            ...S.statBarFill,
            width: `${percent}%`,
            background: color,
          }}
        />
      </div>
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
    gap: 10,
    marginBottom: 12,
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
    width: 60,
    height: 60,
    border: "3px dashed #00ffd5",
    background: "rgba(0,0,0,0.6)",
    color: "#00ffd5",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  characterRow: {
  display: "flex",
  alignItems: "center",
  gap: 24,
},

statsPanel: {
  width: 180,
  padding: 12,
  border: "3px solid #4b2e1e",
  background: "rgba(0,0,0,0.55)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  gap: 12,
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
},

};
