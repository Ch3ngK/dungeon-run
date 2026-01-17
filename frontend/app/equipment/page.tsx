"use client";
import { useEffect, useMemo, useState } from "react";
import "@/app/tooltip.css";

// ... [Keep your existing types and constants here] ...
type Slot = "head" | "leftHand" | "rightHand";
type ItemType = "helmet" | "armor" | "weapon";
type Item = { id: string; name: string; icon: string; type: ItemType; armor?: number; damage?: number; };
const WORKOUT_BASE_STR = 10;
const WORKOUT_BASE_AGI = 0;
const ATK_PER_STR_POINT = 1;
const MANA_PER_AGI_POINT = 5;
const initialSlots: Record<Slot, Item | null> = { head: null, leftHand: null, rightHand: null };
const xpNeededForNext = (level: number) => level * 100;

export default function EquipmentPage() {
  const [inventory, setInventory] = useState<Item[]>([]);
  const [slots, setSlots] = useState<Record<Slot, Item | null>>(initialSlots);
  const [gender, setGender] = useState<"guy" | "girl">("guy");
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [workout, setWorkout] = useState({ strength: WORKOUT_BASE_STR, agility: WORKOUT_BASE_AGI });
  const [isLoaded, setIsLoaded] = useState(false);

  // --- STAT CALCULATIONS ---
  const equipped = useMemo(() => Object.values(slots).filter(Boolean) as Item[], [slots]);
  const bonusArmor = useMemo(() => equipped.reduce((sum, it) => sum + (it.armor ?? 0), 0), [equipped]);
  const bonusAtkItems = useMemo(() => equipped.reduce((sum, it) => sum + (it.damage ?? 0), 0), [equipped]);
  const strBonus = Math.max(0, workout.strength - WORKOUT_BASE_STR) * ATK_PER_STR_POINT;
  const agiBonus = Math.max(0, workout.agility - WORKOUT_BASE_AGI) * MANA_PER_AGI_POINT;
  const currentArmor = 20 + (level - 1) * 3 + bonusArmor;
  const currentAtk = 5 + (level - 1) * 2 + bonusAtkItems + strBonus;
  const MAX_MANA = 60 + (level - 1) * 8 + agiBonus;
  const MAX_HEALTH = 100 + (level - 1) * 10;

  // --- TESTING FUNCTIONS ---
  const addTestXp = (amount: number) => {
    let newXp = xp + amount;
    let newLevel = level;
    const needed = xpNeededForNext(newLevel);

    if (newXp >= needed) {
      newXp = newXp - needed;
      newLevel += 1;
      alert(`LEVEL UP! You are now Level ${newLevel}`);
    }
    
    setXp(newXp);
    setLevel(newLevel);
  };

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    const saved = localStorage.getItem("character_equipment");
    if (saved) {
      const parsed = JSON.parse(saved);
      setLevel(parsed.level || 1);
      setXp(parsed.xp || 0);
      setGender(parsed.gender || "guy");
      setInventory(parsed.inventory || []);
      setSlots(parsed.slots || initialSlots);
    }
    setIsLoaded(true);
  }, []);

  // --- 2. AUTO-SAVE ---
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
        const p = JSON.parse(raw);
        setWorkout({ strength: p.strength ?? WORKOUT_BASE_STR, agility: p.agility ?? WORKOUT_BASE_AGI });
      }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  // --- DRAG AND DROP / DELETE ---
  const onDrop = (slot: Slot, itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item || !isLoaded) return;
    if (slot === "head" && item.type !== "helmet") return;
    if ((slot === "leftHand" || slot === "rightHand") && item.type === "helmet") return;
    setInventory(prev => prev.filter(i => i.id !== itemId));
    setSlots(prev => {
      const replaced = prev[slot];
      if (replaced) setInventory(inv => [...inv, replaced]);
      return { ...prev, [slot]: item };
    });
  };

  const onUnequip = (slot: Slot) => {
    const item = slots[slot];
    if (!item || !isLoaded) return;
    setSlots(prev => ({ ...prev, [slot]: null }));
    setInventory(prev => [...prev, item]);
  };

  const deleteItem = (itemId: string) => {
    if (confirm("Discard this item permanently?")) {
      setInventory(prev => prev.filter(i => i.id !== itemId));
    }
  };

  return (
    <main style={S.page}>
      <div style={S.bg}>
        <div style={S.panel}>
          <h1 style={S.title}>EQUIPMENT</h1>
          
          <div style={S.topBar}>
            <button style={S.btn} onClick={() => window.location.href = "/home"}>⬅ Back</button>
            <div style={S.topBarMid}>
              <button style={S.btn} onClick={() => setGender(g => g === "guy" ? "girl" : "guy")}>🔁 Switch</button>
              {/* --- NEW TEST BUTTON --- */}
              <button style={{...S.btn, background: "#fbbf24"}} onClick={() => addTestXp(25)}>✨ +25 XP</button>
              <button style={S.btn} onClick={() => alert("Progress Sync Complete")}>💾 Sync</button>
              <button style={S.btn} onClick={() => window.location.href = "/workout"}>🏋️ Workout</button>
            </div>
            <button style={{ ...S.btn, background: "#ff7b7b" }} onClick={() => { if(confirm("Reset All Progress?")) { localStorage.clear(); window.location.reload(); }}}>♻ Reset</button>
          </div>

          <div style={S.layout}>
            <div style={S.inventory}>
              <h3 style={S.inventoryTitle}>Inventory</h3>
              <div style={S.items}>
                {!isLoaded ? <div>Loading...</div> : 
                  inventory.length === 0 ? <div style={S.emptyInv}>No gear found yet.</div> : 
                  inventory.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} draggable onDragStart={e => e.dataTransfer.setData("item", item.id)} style={{ ...S.item, position: "relative" }} className="tooltip-container">
                      <button style={S.deleteBtn} onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}>×</button>
                      <div style={{ fontSize: 34 }}>{item.icon}</div>
                      <div style={{ fontSize: 12 }}>{item.name}</div>
                      <div className="tooltip">
                        <strong>{item.name}</strong>
                        <div>{item.armor ? `Armor +${item.armor}` : `ATK +${item.damage}`}</div>
                      </div>
                    </div>
                ))}
              </div>
            </div>

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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ... [Keep existing SlotBox, StatBar, and S object] ...
function SlotBox({ slot, label, slots, onDrop, onUnequip, top, left }: any) {
  const item = slots[slot];
  return (
    <div 
      onDragOver={e => e.preventDefault()} 
      onDrop={e => { const id = e.dataTransfer.getData("item"); if(id) onDrop(slot, id); }}
      onDoubleClick={() => onUnequip(slot)}
      style={{ ...S.slot, top, left, cursor: item ? 'pointer' : 'default', borderColor: item ? '#fff' : '#00ffd5' }}
    >
      {item ? <div style={{ textAlign: "center" }}><div style={{ fontSize: 26 }}>{item.icon}</div><div style={{ fontSize: 10 }}>{item.name}</div></div> : label}
    </div>
  );
}

function StatBar({ label, value, max, color }: any) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={S.statRow}>
      <div style={S.statLabel}>{label}: {value}/{max}</div>
      <div style={S.statBarBg}><div style={{ ...S.statBarFill, width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

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
  slot: { position: "absolute", width: 62, height: 62, border: "3px dashed #00ffd5", background: "rgba(0,0,0,0.6)", color: "#00ffd5", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" },
  statsPanel: { width: 240, padding: 12, border: "3px solid #4b2e1e", background: "rgba(0,0,0,0.55)", color: "white", display: "flex", flexDirection: "column", gap: 12 },
  levelLine: { fontSize: 14, fontWeight: 700 },
  statRow: { display: "flex", flexDirection: "column", gap: 4 },
  statLabel: { fontSize: 12 },
  statBarBg: { height: 14, background: "#111", border: "2px solid #333", overflow: "hidden" },
  statBarFill: { height: "100%", transition: "width 0.25s ease" },
  atkLine: { marginTop: 6, fontSize: 13, fontWeight: 700 },
};