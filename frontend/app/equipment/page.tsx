"use client";
import { useEffect, useMemo, useState } from "react";
import "@/app/tooltip.css";

/* ---------------- TYPES & CONSTANTS ---------------- */
type Slot = "head" | "leftHand" | "rightHand";
type ItemType = "helmet" | "armor" | "weapon";

/**
 * ✅ 兼容两种数据结构：
 * - 新结构：{ type: "weapon/helmet/armor", icon, ... }
 * - 旧结构（从 Fight 掉落）：{ slot: "weapon/helmet/shield", icon, ... }
 */
type EquipmentSlot = "weapon" | "helmet" | "shield";

type Item = {
  id: string;
  name: string;
  icon?: string;
  type: ItemType; // ✅ Equipment 内部统一使用 type
  armor?: number;
  damage?: number;

  // ✅ 允许存在，但不强依赖（为了兼容你 Fight 的掉落结构）
  slot?: EquipmentSlot;
  rarity?: "common" | "rare" | "epic";
};

const WORKOUT_BASE_STR = 10;
const WORKOUT_BASE_AGI = 0;
const ATK_PER_STR_POINT = 1;
const MANA_PER_AGI_POINT = 5;

const initialSlots: Record<Slot, Item | null> = { head: null, leftHand: null, rightHand: null };
const xpNeededForNext = (level: number) => level * 100;

const TYPE_ICON: Record<ItemType, string> = {
  helmet: "🪖",
  armor: "🛡️",
  weapon: "🗡️",
};

const TYPE_LABEL: Record<ItemType, string> = {
  helmet: "HELMET",
  armor: "SHIELD",
  weapon: "WEAPON",
};

const TYPE_BORDER: Record<ItemType, string> = {
  helmet: "#60a5fa",
  armor: "#34d399",
  weapon: "#fbbf24",
};

// ✅ 把 Fight 的 slot 映射成 Equipment 的 type
function slotToType(slot: any): ItemType | null {
  if (slot === "helmet") return "helmet";
  if (slot === "weapon") return "weapon";
  if (slot === "shield") return "armor";
  return null;
}

function normalizeItem(raw: any): Item | null {
  if (!raw || typeof raw !== "object") return null;

  // ✅ 兼容 raw.type 或 raw.slot
  let type: ItemType | null = null;
  if (raw.type === "helmet" || raw.type === "armor" || raw.type === "weapon") {
    type = raw.type as ItemType;
  } else {
    type = slotToType(raw.slot);
  }
  if (!type) return null;

  const id = String(raw.id ?? "");
  const name = String(raw.name ?? "");
  if (!id || !name) return null;

  const icon = String(raw.icon ?? TYPE_ICON[type]);
  const armor = raw.armor != null ? Number(raw.armor) : undefined;
  const damage = raw.damage != null ? Number(raw.damage) : undefined;

  // 透传 rarity/slot（不影响显示，只是保留数据）
  const slot: EquipmentSlot | undefined =
    raw.slot === "weapon" || raw.slot === "helmet" || raw.slot === "shield" ? raw.slot : undefined;

  const rarity: any = raw.rarity;

  return { id, name, type, icon, armor, damage, slot, rarity };
}

function canEquip(slot: Slot, item: Item) {
  if (slot === "head") return item.type === "helmet";
  if (slot === "leftHand" || slot === "rightHand") return item.type === "weapon" || item.type === "armor";
  return false;
}

function itemStatLine(it: Item) {
  const armor = Number(it.armor ?? 0);
  const dmg = Number(it.damage ?? 0);
  if (it.type === "weapon") return `ATK +${dmg}`;
  if (it.type === "armor") return `Armor +${armor}`;
  return `Armor +${armor}`; // helmet
}

export default function EquipmentPage() {
  const [inventory, setInventory] = useState<Item[]>([]);
  const [slots, setSlots] = useState<Record<Slot, Item | null>>(initialSlots);
  const [gender, setGender] = useState<"guy" | "girl">("guy");
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [workout, setWorkout] = useState({ strength: WORKOUT_BASE_STR, agility: WORKOUT_BASE_AGI });
  const [isLoaded, setIsLoaded] = useState(false);
  const [equippedSkillIds, setEquippedSkillIds] = useState<string[]>([]);

  // --- STAT CALCULATIONS ---
  const equipped = useMemo(() => Object.values(slots).filter(Boolean) as Item[], [slots]);

  const bonusArmor = useMemo(() => equipped.reduce((sum, it) => sum + Number(it.armor ?? 0), 0), [equipped]);
  const bonusAtkItems = useMemo(() => equipped.reduce((sum, it) => sum + Number(it.damage ?? 0), 0), [equipped]);

  const strBonus = Math.max(0, workout.strength - WORKOUT_BASE_STR) * ATK_PER_STR_POINT;
  const agiBonus = Math.max(0, workout.agility - WORKOUT_BASE_AGI) * MANA_PER_AGI_POINT;

  const currentArmor = 20 + (level - 1) * 3 + bonusArmor;
  const currentAtk = 5 + (level - 1) * 2 + bonusAtkItems + strBonus;
  const MAX_MANA = 60 + (level - 1) * 8 + agiBonus;
  const MAX_HEALTH = 100 + (level - 1) * 10;

  // --- XP / LEVEL LOGIC ---
  const addTestXp = (amount: number) => {
    let newXp = xp + amount;
    let newLevel = level;
    while (newXp >= xpNeededForNext(newLevel)) {
      newXp -= xpNeededForNext(newLevel);
      newLevel += 1;
      alert(`LEVEL UP! You are now Level ${newLevel}`);
    }
    setXp(newXp);
    setLevel(newLevel);
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    const saved = localStorage.getItem("character_equipment");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLevel(Number(parsed.level || 1));
        setXp(Number(parsed.xp || 0));
        setGender(parsed.gender === "girl" ? "girl" : "guy");

        const inv = Array.isArray(parsed.inventory)
          ? (parsed.inventory.map(normalizeItem).filter(Boolean) as Item[])
          : [];
        setInventory(inv);

        const rawSlots = parsed.slots || initialSlots;
        const fixedSlots: Record<Slot, Item | null> = {
          head: normalizeItem(rawSlots.head),
          leftHand: normalizeItem(rawSlots.leftHand),
          rightHand: normalizeItem(rawSlots.rightHand),
        };

        // ✅ 防止错 slot：不匹配就退回 inventory
        const returned: Item[] = [];
        (Object.keys(fixedSlots) as Slot[]).forEach((s) => {
          const it = fixedSlots[s];
          if (it && !canEquip(s, it)) {
            fixedSlots[s] = null;
            returned.push(it);
          }
        });

        // ✅ 去重：避免同一件 item 同时在 inventory + slot
        const slotIds = new Set(Object.values(fixedSlots).filter(Boolean).map((x) => (x as Item).id));
        const mergedInv = [...inv.filter((x) => !slotIds.has(x.id)), ...returned];

        setSlots(fixedSlots);
        setInventory(mergedInv);
      } catch {}
    }

    const savedSkills = localStorage.getItem("selected_skills");
    if (savedSkills) {
      try {
        setEquippedSkillIds(JSON.parse(savedSkills));
      } catch {}
    }

    setIsLoaded(true);
  }, []);

  // --- AUTO-SAVE ---
  useEffect(() => {
    if (!isLoaded) return;
    const data = JSON.stringify({ inventory, slots, gender, level, xp });
    localStorage.setItem("character_equipment", data);
  }, [inventory, slots, gender, level, xp, isLoaded]);

  // --- WORKOUT SYNC ---
  useEffect(() => {
    const read = () => {
      const raw = localStorage.getItem("dr_stats");
      if (raw) {
        try {
          const p = JSON.parse(raw);
          setWorkout({
            strength: Number(p.strength ?? WORKOUT_BASE_STR),
            agility: Number(p.agility ?? WORKOUT_BASE_AGI),
          });
        } catch {}
      }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  // --- DRAG AND DROP ---
  const onDrop = (slot: Slot, itemId: string) => {
    if (!isLoaded) return;

    const raw = inventory.find((i) => i.id === itemId);
    const item = normalizeItem(raw);
    if (!item) return;

    if (!canEquip(slot, item)) return;

    setInventory((prev) => prev.filter((i) => i.id !== itemId));
    setSlots((prev) => {
      const replaced = prev[slot];
      if (replaced) setInventory((inv) => [...inv, replaced]);
      return { ...prev, [slot]: item };
    });
  };

  const onUnequip = (slot: Slot) => {
    if (!isLoaded) return;
    const item = slots[slot];
    if (!item) return;
    setSlots((prev) => ({ ...prev, [slot]: null }));
    setInventory((prev) => [...prev, item]);
  };

  const deleteItem = (itemId: string) => {
    if (confirm("Discard this item permanently?")) {
      setInventory((prev) => prev.filter((i) => i.id !== itemId));
    }
  };

  return (
    <main style={S.page}>
      <div style={S.bg}>
        <div style={S.panel}>
          <h1 style={S.title}>EQUIPMENT</h1>

          <div style={S.topBar}>
            <button style={S.btn} onClick={() => (window.location.href = "/home")}>
              ⬅ Back
            </button>

            <div style={S.topBarMid}>
              <button style={S.btn} onClick={() => setGender((g) => (g === "guy" ? "girl" : "guy"))}>
                🔁 Switch
              </button>

              <button
                style={{ ...S.btn, background: "#c084fc", color: "#2e1065" }}
                onClick={() => (window.location.href = "/equipment/skills")}
              >
                🔮 Skills
              </button>

              <button style={{ ...S.btn, background: "#fbbf24" }} onClick={() => addTestXp(25)}>
                ✨ +25 XP
              </button>

              <button style={S.btn} onClick={() => (window.location.href = "/workout")}>
                🏋️ Workout
              </button>
            </div>

            <button
              style={{ ...S.btn, background: "#ff7b7b" }}
              onClick={() => {
                if (confirm("Reset All Progress?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
            >
              ♻ Reset
            </button>
          </div>

          <div style={S.layout}>
            {/* INVENTORY */}
            <div style={S.inventory}>
              <h3 style={S.inventoryTitle}>Inventory</h3>

              <div style={S.items}>
                {!isLoaded ? (
                  <div>Loading...</div>
                ) : inventory.length === 0 ? (
                  <div style={S.emptyInv}>No gear found yet.</div>
                ) : (
                  inventory.map((rawItem, idx) => {
                    const item = normalizeItem(rawItem)!;
                    const border = TYPE_BORDER[item.type];
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("item", item.id)}
                        style={{ ...S.item, position: "relative", borderColor: border }}
                        className="tooltip-container"
                      >
                        <button
                          style={S.deleteBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteItem(item.id);
                          }}
                        >
                          ×
                        </button>

                        {/* ✅ inventory item symbol */}
                        <div style={{ fontSize: 34 }}>{item.icon || TYPE_ICON[item.type]}</div>

                        <div style={{ fontSize: 12, fontWeight: 800 }}>{item.name}</div>

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 10,
                            fontWeight: 900,
                            padding: "2px 6px",
                            border: `1px solid ${border}`,
                            display: "inline-block",
                            opacity: 0.95,
                          }}
                        >
                          {TYPE_LABEL[item.type]}
                        </div>

                        <div className="tooltip">
                          <strong>
                            {item.icon || TYPE_ICON[item.type]} {item.name}
                          </strong>
                          <div>{itemStatLine(item)}</div>
                          <div style={{ opacity: 0.8, marginTop: 4 }}>
                            Equip to: {item.type === "helmet" ? "HEAD" : "L-HAND / R-HAND"}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* CHARACTER + STATS */}
            <div style={S.characterWrap}>
              <div style={S.characterRow}>
                <div style={S.characterFrame}>
                  <img src={gender === "guy" ? "/guy.png" : "/girl.png"} style={S.characterImg} alt="avatar" />
                  <SlotBox slot="head" label="HEAD" top="10%" left="43%" slots={slots} onDrop={onDrop} onUnequip={onUnequip} />
                  <SlotBox slot="leftHand" label="L-HAND" top="55%" left="20%" slots={slots} onDrop={onDrop} onUnequip={onUnequip} />
                  <SlotBox slot="rightHand" label="R-HAND" top="55%" left="72%" slots={slots} onDrop={onDrop} onUnequip={onUnequip} />
                </div>

                <div style={S.statsPanel}>
                  <div style={S.levelLine}>LV {level}</div>
                  <StatBar label="XP" value={xp} max={xpNeededForNext(level)} color="#fbbf24" />
                  <StatBar label="HP" value={MAX_HEALTH} max={MAX_HEALTH} color="#ff4d4d" />
                  <StatBar label="ARMOR" value={currentArmor} max={100} color="#a8a8a8" />
                  <StatBar label="MANA" value={MAX_MANA} max={MAX_MANA} color="#3b82f6" />
                  <div style={S.atkLine}>ATK: {currentAtk}</div>

                  <div style={S.skillsPreview}>
                    <div style={S.skillsPreviewTitle}>ACTIVE SKILLS</div>
                    <div style={S.skillsGrid}>
                      {equippedSkillIds.length > 0 ? (
                        equippedSkillIds.map((id) => (
                          <div key={id} style={S.skillTag}>
                            {id.replaceAll("_", " ").toUpperCase()}
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 9, opacity: 0.5 }}>No skills selected</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* end layout */}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------------- HELPER COMPONENTS ---------------- */
function SlotBox({ slot, label, slots, onDrop, onUnequip, top, left }: any) {
  const item = slots[slot] as Item | null;
  const hint = slot === "head" ? "helmet only" : "weapon/shield";

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("item");
        if (id) onDrop(slot, id);
      }}
      onDoubleClick={() => onUnequip(slot)}
      style={{
        ...S.slot,
        top,
        left,
        cursor: item ? "pointer" : "default",
        borderColor: item ? "#fff" : "#00ffd5",
      }}
      className="tooltip-container"
    >
      {item ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26 }}>{item.icon}</div>
          <div style={{ fontSize: 10, fontWeight: 800 }}>{item.name}</div>
        </div>
      ) : (
        <div style={{ opacity: 0.95 }}>
          {label}
          <div style={{ fontSize: 9, marginTop: 4, opacity: 0.75 }}>{hint}</div>
        </div>
      )}

      <div className="tooltip">
        <strong>{label}</strong>
        <div style={{ marginTop: 4, opacity: 0.9 }}>{slot === "head" ? "Drop HELMET here" : "Drop WEAPON/SHIELD here"}</div>
        <div style={{ opacity: 0.7, marginTop: 4 }}>Double-click to unequip</div>
      </div>
    </div>
  );
}

function StatBar({ label, value, max, color }: any) {
  const pct = max <= 0 ? 0 : Math.min(100, (value / max) * 100);
  return (
    <div style={S.statRow}>
      <div style={S.statLabel}>
        {label}: {value}/{max}
      </div>
      <div style={S.statBarBg}>
        <div style={{ ...S.statBarFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center" },
  bg: { minHeight: "100vh", width: "100vw", backgroundImage: "url('/home-hub.png')", backgroundSize: "100% 100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  panel: { width: "min(1100px, 95vw)", padding: 24, background: "#f3e5c0", border: "6px solid #4b2e1e", boxShadow: "10px 10px 0 rgba(0,0,0,0.6)" },
  title: { textAlign: "center", marginBottom: 10, letterSpacing: 2, color: "#4b2e1e" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 },
  topBarMid: { display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap" },
  btn: { padding: "6px 12px", border: "3px solid #4b2e1e", background: "#9ee6ff", cursor: "pointer", fontWeight: 600 },
  layout: { display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "center" },

  inventory: { border: "4px solid #4b2e1e", padding: 16, background: "rgba(255,255,255,0.4)" },
  inventoryTitle: { textAlign: "center", marginBottom: 6, color: "#4b2e1e" },
  items: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxHeight: 320, overflowY: "auto", paddingRight: 6 },
  emptyInv: { gridColumn: "1 / -1", border: "3px dashed rgba(0,0,0,0.35)", padding: 14, textAlign: "center" },

  item: { border: "3px solid #333", background: "#1f2933", color: "white", padding: 10, textAlign: "center", cursor: "grab" },
  deleteBtn: { position: "absolute", top: 2, right: 2, background: "#ff4d4d", color: "white", border: "none", borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 },

  characterWrap: { display: "flex", justifyContent: "center" },
  characterRow: { display: "flex", alignItems: "center", gap: 24 },
  characterFrame: { position: "relative", width: 320, height: 420, border: "4px solid #4b2e1e", background: "#111", display: "flex", justifyContent: "center", alignItems: "center" },
  characterImg: { maxHeight: "100%", imageRendering: "pixelated" },

  slot: { position: "absolute", width: 62, height: 62, border: "3px dashed #00ffd5", background: "rgba(0,0,0,0.6)", color: "#00ffd5", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 4 },

  statsPanel: { width: 240, padding: 12, border: "3px solid #4b2e1e", background: "rgba(0,0,0,0.75)", color: "white", display: "flex", flexDirection: "column", gap: 12 },
  levelLine: { fontSize: 14, fontWeight: 700 },
  statRow: { display: "flex", flexDirection: "column", gap: 4 },
  statLabel: { fontSize: 12 },
  statBarBg: { height: 14, background: "#111", border: "2px solid #333", overflow: "hidden" },
  statBarFill: { height: "100%", transition: "width 0.25s ease" },
  atkLine: { marginTop: 6, fontSize: 13, fontWeight: 700 },

  skillsPreview: { marginTop: 8, borderTop: "1px solid #555", paddingTop: 10 },
  skillsPreviewTitle: { fontSize: 10, color: "#a8a8a8", marginBottom: 6, fontWeight: 800 },
  skillsGrid: { display: "flex", flexWrap: "wrap", gap: 4 },
  skillTag: { fontSize: 9, background: "#4b2e1e", padding: "2px 6px", border: "1px solid #c084fc", color: "#c084fc", fontWeight: 700 },
};
