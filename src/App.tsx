import { useState, useEffect, useRef } from "react";

// ── SUPABASE ───────────────────────────────────────────────
const SUPA_URL = "https://qriajzvzfhdwqnszjxht.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyaWFqenZ6Zmhkd3Fuc3pqeGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjA1MzAsImV4cCI6MjA5NTk5NjUzMH0.MqHy1xhCRxggZ8rl-Rd5FlbPPycVV6QanhfItv8-7tQ";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPA_KEY,
  "Authorization": `Bearer ${SUPA_KEY}`,
  "Prefer": "return=representation",
};

const db = {
  async getFamilies() {
    const r = await fetch(`${SUPA_URL}/rest/v1/families?select=*&order=created_at.asc`, { headers });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async upsertFamily(family) {
    const r = await fetch(`${SUPA_URL}/rest/v1/families`, {
      method: "POST",
      headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ code: family.code, name: family.name, kids: family.kids || [] }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async getItems() {
    const r = await fetch(`${SUPA_URL}/rest/v1/items?select=*&order=created_at.asc`, { headers });
    if (!r.ok) throw new Error(await r.text());
    const rows = await r.json();
    return rows.map(row => ({
      id: row.id, ownerCode: row.owner_code, ownerName: row.owner_name,
      name: row.name, size: row.size, notes: row.notes || "",
      recall: row.recall, date: row.date, status: row.status,
      givenTo: row.given_to, givenToName: row.given_to_name,
    }));
  },
  async insertItem(item) {
    const r = await fetch(`${SUPA_URL}/rest/v1/items`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: item.id, owner_code: item.ownerCode, owner_name: item.ownerName,
        name: item.name, size: item.size, notes: item.notes || "",
        recall: item.recall, date: item.date, status: item.status,
        given_to: item.givenTo || null, given_to_name: item.givenToName || null,
      }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async updateItem(id, patch) {
    const dbPatch = {};
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.givenTo !== undefined) dbPatch.given_to = patch.givenTo;
    if (patch.givenToName !== undefined) dbPatch.given_to_name = patch.givenToName;
    if (patch.recall !== undefined) dbPatch.recall = patch.recall;
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.size !== undefined) dbPatch.size = patch.size;
    if (patch.notes !== undefined) dbPatch.notes = patch.notes;
    if (patch.date !== undefined) dbPatch.date = patch.date;
    const r = await fetch(`${SUPA_URL}/rest/v1/items?id=eq.${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(dbPatch),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async deleteItem(id) {
    const r = await fetch(`${SUPA_URL}/rest/v1/items?id=eq.${id}`, {
      method: "DELETE",
      headers,
    });
    if (!r.ok) throw new Error(await r.text());
    return true;
  },
  // Real-time via polling (no WebSocket needed)
  subscribe(onUpdate) {
    const interval = setInterval(async () => {
      try {
        const [families, items] = await Promise.all([db.getFamilies(), db.getItems()]);
        onUpdate(families, items);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }
};

// ── THEME ──────────────────────────────────────────────────
const T = {
  bg: "#F7F2EB", surface: "#FFFFFF", card: "#FDFAF6",
  sage: "#5C8A5C", sageMid: "#8AB08A", sageLight: "#E8F0E8",
  terracotta: "#C4714A", terraSoft: "#F5E8E0",
  ink: "#1E1E1E", muted: "#7A7268", border: "#E2DAD0", white: "#FFFFFF",
};

const uid = () => Math.random().toString(36).slice(2, 9);
const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ── LOGO MARK ──────────────────────────────────────────────
// Denim jeans (back view) with a sage green leaf tag. The tag shows
// the family code if given, otherwise "ABC" as the brand placeholder.
const LogoMark = ({ size = 72, code = "ABC" }) => {
  const id = "lm" + (code || "abc");
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" role="img" aria-label="Heirloom Loop logo">
      <defs>
        <pattern id={`${id}-d`} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="#3D6B9E"/>
          <line x1="0" y1="0" x2="0" y2="4" stroke="#3560A0" strokeWidth="1.2" opacity="0.5"/>
        </pattern>
        <pattern id={`${id}-dd`} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="#2E5280"/>
          <line x1="0" y1="0" x2="0" y2="4" stroke="#264870" strokeWidth="1.2" opacity="0.5"/>
        </pattern>
      </defs>
      {/* translate the 252-428 / 86-280 art into a 0-180 box: scale ~0.93, shift */}
      <g transform="translate(-218, -64) scale(0.84)">
        {/* waistband */}
        <rect x="252" y="86" width="176" height="24" rx="4" fill={`url(#${id}-dd)`}/>
        <rect x="252" y="86" width="176" height="24" rx="4" fill="none" stroke="#1E3A5F" strokeWidth="1.2"/>
        {/* belt loops */}
        <rect x="268" y="82" width="9" height="16" rx="2.5" fill="#2A4E78"/>
        <rect x="336" y="82" width="9" height="16" rx="2.5" fill="#2A4E78"/>
        <rect x="393" y="82" width="9" height="16" rx="2.5" fill="#2A4E78"/>
        {/* leaf tag */}
        <path d="M 372 98 C 380 88 394 84 412 86 C 426 87 432 92 432 98 C 432 104 426 109 412 110 C 394 112 380 108 372 98 Z" fill="#5C8A5C"/>
        <path d="M 374 98 C 390 98 410 98 430 98" stroke="#8AB08A" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
        <text x="406" y="102" textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fill="#3A6A3A" letterSpacing="0.1em" fontStyle="italic">{code}</text>
        <text x="405" y="101" textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fill="#EDF5ED" letterSpacing="0.1em" fontStyle="italic">{code}</text>
        {/* body */}
        <path d="M 252 110 L 252 205 Q 252 222 270 227 L 330 234 L 340 212 L 350 234 L 410 227 Q 428 222 428 205 L 428 110 Z" fill={`url(#${id}-d)`}/>
        <path d="M 252 110 L 252 205 Q 252 222 270 227 L 330 234 L 340 212 L 350 234 L 410 227 Q 428 222 428 205 L 428 110 Z" fill="none" stroke="#1E3A5F" strokeWidth="1.2" strokeLinejoin="round"/>
        <path d="M 340 110 L 340 212" stroke="#2A5080" strokeWidth="1" strokeDasharray="4,3"/>
        {/* pockets */}
        <path d="M 264 118 L 264 158 Q 264 164 270 164 L 318 164 Q 324 164 324 158 L 324 118 Z" fill="none" stroke="#F5E6C8" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M 269 133 Q 293 126 320 133" fill="none" stroke="#F0D080" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="2.5,2"/>
        <path d="M 356 118 L 356 158 Q 356 164 362 164 L 393 164 Q 399 164 399 158 L 399 118 Z" fill="none" stroke="#F5E6C8" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M 360 133 Q 377 126 396 133" fill="none" stroke="#F0D080" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="2.5,2"/>
        {/* legs */}
        <path d="M 252 205 Q 248 254 255 270 L 328 278 L 340 212 Z" fill={`url(#${id}-d)`}/>
        <path d="M 252 205 Q 248 254 255 270 L 328 278 L 340 212 Z" fill="none" stroke="#1E3A5F" strokeWidth="1.2" strokeLinejoin="round"/>
        <line x1="257" y1="272" x2="328" y2="276" stroke="#F5E6C8" strokeWidth="1.1" strokeDasharray="3,2" strokeLinecap="round"/>
        <path d="M 428 205 Q 432 254 425 270 L 352 278 L 340 212 Z" fill={`url(#${id}-d)`}/>
        <path d="M 428 205 Q 432 254 425 270 L 352 278 L 340 212 Z" fill="none" stroke="#1E3A5F" strokeWidth="1.2" strokeLinejoin="round"/>
        <line x1="423" y1="272" x2="352" y2="276" stroke="#F5E6C8" strokeWidth="1.1" strokeDasharray="3,2" strokeLinecap="round"/>
      </g>
    </svg>
  );
};

// ── SESSION (which family am I?) ───────────────────────────
const SESSION_KEY = "heirloom_loop_code";
const getSessionCode = () => {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
};
const setSessionCode = (code) => {
  try { localStorage.setItem(SESSION_KEY, code); } catch {}
};

// ── AI VISION SCAN ─────────────────────────────────────────
// Calls the secure Supabase Edge Function (which holds the Anthropic key server-side).
// The browser never touches the API key.
async function scanClothingPhoto(base64Image, mediaType) {
  const response = await fetch(`${SUPA_URL}/functions/v1/scan-clothing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPA_KEY}`,
      "apikey": SUPA_KEY,
    },
    body: JSON.stringify({ base64Image, mediaType }),
  });
  if (!response.ok) {
    throw new Error(`Scan failed: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

// ── SHARED UI ──────────────────────────────────────────────
const Pill = ({ children, color = T.sageLight, text = T.sage, style = {} }) => (
  <span style={{ background: color, color: text, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", padding: "3px 9px", borderRadius: 20, textTransform: "uppercase", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap", ...style }}>{children}</span>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", style = {}, disabled = false }) => {
  const variants = { primary: { background: T.sage, color: T.white }, secondary: { background: T.sageLight, color: T.sage }, ghost: { background: "transparent", color: T.muted, border: `1.5px solid ${T.border}` }, danger: { background: T.terraSoft, color: T.terracotta } };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ border: "none", cursor: disabled ? "not-allowed" : "pointer", borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, transition: "opacity 0.15s", opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, ...(size === "sm" ? { fontSize: 13, padding: "8px 14px" } : { fontSize: 15, padding: "13px 20px" }), ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{ background: T.card, borderRadius: 16, border: `1.5px solid ${T.border}`, padding: "14px 16px", marginBottom: 10, cursor: onClick ? "pointer" : "default", ...style }}>{children}</div>
);

const FieldInput = ({ label, value, onChange, placeholder, type = "text", required }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 5 }}>{label}{required && <span style={{ color: T.terracotta }}> *</span>}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.white, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.ink, boxSizing: "border-box", outline: "none" }} />
  </div>
);

const FieldSelect = ({ label, value, onChange, options }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 5 }}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.white, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.ink, boxSizing: "border-box", outline: "none", appearance: "none" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const TopBar = ({ title, subtitle, onBack }) => (
  <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${T.border}`, background: T.bg }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {onBack && <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: T.ink, padding: 0, lineHeight: 1 }}>←</button>}
      <div>
        <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 20, color: T.ink, fontWeight: 700 }}>{title}</h2>
        {subtitle && <p style={{ margin: "2px 0 0", fontSize: 12, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</p>}
      </div>
    </div>
  </div>
);

const BottomNav = ({ active, onChange }) => (
  <div style={{ position: "sticky", bottom: 0, background: T.white, borderTop: `1.5px solid ${T.border}`, display: "flex", justifyContent: "space-around", padding: "8px 0 16px", zIndex: 50 }}>
    {[{ id: "home", icon: "⌂", label: "Home" }, { id: "given", icon: "↑", label: "Given" }, { id: "received", icon: "↓", label: "Received" }, { id: "all", icon: "▦", label: "All Items" }, { id: "community", icon: "◎", label: "Loop" }].map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: active === t.id ? T.sage : T.muted, fontFamily: "'DM Sans', sans-serif", minWidth: 48 }}>
        <span style={{ fontSize: 18 }}>{t.icon}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase" }}>{t.label}</span>
      </button>
    ))}
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.white, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", padding: "20px 20px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 20, color: T.ink }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.muted }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ── TOAST ──────────────────────────────────────────────────
const Toast = ({ message, visible }) => (
  <div style={{
    position: "fixed", bottom: 90, left: "50%", transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
    background: T.ink, color: T.white, borderRadius: 12, padding: "10px 18px",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
    opacity: visible ? 1 : 0, transition: "all 0.3s", zIndex: 300, whiteSpace: "nowrap",
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  }}>{message}</div>
);

// ── PHOTO SCAN ─────────────────────────────────────────────
function PhotoScanScreen({ family, families, onBack, onSaved, onInsertItems }) {
  const [step, setStep] = useState("upload");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageType, setImageType] = useState("image/jpeg");
  const [items, setItems] = useState([]);
  const [scanError, setScanError] = useState("");
  const [givenTo, setGivenTo] = useState("");
  const [recall, setRecall] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const otherFamilies = Object.values(families).filter(f => f.code !== family.code);

  const handleFile = (file) => {
    if (!file) return;
    // Resize the photo down before sending — full-res phone photos are too
    // large for the Edge Function payload and cause 502s. We cap the longest
    // side at 1568px (plenty for the AI to read clothing) and re-encode as JPEG.
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      if (typeof dataUrl !== "string") return;
      const img = new Image();
      img.onload = () => {
        const MAX = 1568;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round(height * (MAX / width)); width = MAX; }
          else { width = Math.round(width * (MAX / height)); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const resized = canvas.toDataURL("image/jpeg", 0.82);
        setImageType("image/jpeg");
        setImagePreview(resized);
        setImageBase64(resized.split(",")[1]);
      };
      img.onerror = () => {
        // Fallback: use the original if the image can't be processed
        setImageType(file.type || "image/jpeg");
        setImagePreview(dataUrl);
        setImageBase64(dataUrl.split(",")[1]);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imageBase64) return;
    setStep("scanning"); setScanError("");
    try {
      const found = await scanClothingPhoto(imageBase64, imageType);
      if (!found.length) { setScanError("No clothing detected. Try a clearer photo with items spread flat."); setStep("upload"); return; }
      setItems(found.map(item => ({ ...item, id: uid(), checked: true, _name: item.name, _size: item.size, _notes: item.notes || "", _editing: false })));
      setStep("review");
    } catch { setScanError("Scan failed — please try again."); setStep("upload"); }
  };

  const toggle = (id) => setItems(p => p.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  const update = (id, f, v) => setItems(p => p.map(i => i.id === id ? { ...i, [f]: v } : i));
  const remove = (id) => setItems(p => p.filter(i => i.id !== id));
  const selected = items.filter(i => i.checked);

  const handleLogAll = async () => {
    setSaving(true);
    const newItems = selected.map(item => ({
      id: uid(), ownerCode: family.code, ownerName: family.name,
      name: item._name || item.name, size: item._size || item.size,
      notes: item._notes || "", recall,
      date: new Date().toISOString().split("T")[0],
      status: givenTo ? "out" : "available",
      givenTo: givenTo || null,
      givenToName: givenTo ? (families[givenTo]?.name || givenTo) : null,
    }));
    try {
      await Promise.all(newItems.map(item => db.insertItem(item)));
      onInsertItems(newItems);
      setStep("saved");
    } catch (e) {
      setScanError("Failed to save — check your connection.");
      setStep("details");
    }
    setSaving(false);
  };

  if (step === "upload") return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar title="Scan a Bundle" subtitle="AI identifies each item from one photo" onBack={onBack} />
      <div style={{ padding: "18px" }}>
        <div style={{ background: T.sageLight, borderRadius: 14, padding: "14px 16px", marginBottom: 20, display: "flex", gap: 12 }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>📸</span>
          <p style={{ margin: 0, fontSize: 13, color: T.ink, lineHeight: 1.55, fontFamily: "'DM Sans', sans-serif" }}><strong>Best results:</strong> Lay items flat and spread out on a light surface. Shoot from above in good light.</p>
        </div>
        <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${imagePreview ? T.sage : T.border}`, borderRadius: 16, background: imagePreview ? "transparent" : T.white, minHeight: imagePreview ? "auto" : 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", marginBottom: 14 }}>
          {imagePreview ? <img src={imagePreview} alt="Preview" style={{ width: "100%", display: "block", borderRadius: 14 }} /> : (
            <div style={{ textAlign: "center", padding: 32 }}>
              <p style={{ fontSize: 40, margin: "0 0 10px" }}>🖼️</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>Tap to upload or take photo</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: T.muted }}>Camera or photo library</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        {imagePreview && <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", marginBottom: 14, fontFamily: "'DM Sans', sans-serif", textDecoration: "underline", padding: 0, display: "block" }}>Use a different photo</button>}
        {scanError && <div style={{ background: T.terraSoft, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}><p style={{ margin: 0, fontSize: 13, color: T.terracotta }}>⚠️ {scanError}</p></div>}
        <Btn onClick={handleScan} disabled={!imageBase64} style={{ width: "100%", marginBottom: 8 }}>✦ Scan with AI →</Btn>
        <p style={{ textAlign: "center", fontSize: 12, color: T.muted, margin: 0 }}>Claude reads your photo and lists every item</p>
      </div>
    </div>
  );

  if (step === "scanning") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 500, padding: "40px 24px", textAlign: "center" }}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}} @keyframes dot{0%,80%,100%{opacity:.2}40%{opacity:1}}`}</style>
      {imagePreview && <img src={imagePreview} alt="" style={{ width: 180, height: 180, objectFit: "cover", borderRadius: 16, border: `3px solid ${T.sage}`, marginBottom: 24, animation: "float 2s ease-in-out infinite" }} />}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>{[0,1,2].map(i => <div key={i} style={{ width: 9, height: 9, borderRadius: 9, background: T.sage, animation: "dot 1.4s ease-in-out infinite", animationDelay: `${i*0.2}s` }} />)}</div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: T.ink, margin: "0 0 6px" }}>Scanning your bundle…</h2>
      <p style={{ color: T.muted, fontSize: 14, margin: 0 }}>Claude is identifying each item. Just a moment.</p>
    </div>
  );

  if (step === "review") return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar title="Review Items" subtitle={`${selected.length} of ${items.length} selected`} onBack={() => setStep("upload")} />
      <div style={{ padding: "12px 18px" }}>
        {imagePreview && <img src={imagePreview} alt="Bundle" style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 12, border: `1.5px solid ${T.border}`, marginBottom: 12 }} />}
        <div style={{ background: T.sageLight, borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 13, color: T.sage, fontFamily: "'DM Sans', sans-serif" }}>✦ Found <strong>{items.length} items</strong>. Tap ✎ to edit, uncheck to skip.</p>
          <button onClick={() => setItems(p => p.map(i => ({ ...i, checked: true })))} style={{ background: "none", border: "none", fontSize: 12, color: T.sage, cursor: "pointer", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>All</button>
        </div>
        {items.map(item => (
          <div key={item.id} style={{ background: item.checked ? T.white : "#F0EBE0", border: `1.5px solid ${item.checked ? T.border : "#D8CEC4"}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, opacity: item.checked ? 1 : 0.55, transition: "all 0.15s" }}>
            {item._editing ? (
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input value={item._name} onChange={e => update(item.id, "_name", e.target.value)} placeholder="Item name" style={{ flex: 2, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${T.sage}`, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none" }} />
                  <input value={item._size} onChange={e => update(item.id, "_size", e.target.value)} placeholder="Size" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${T.sage}`, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none" }} />
                </div>
                <input value={item._notes} onChange={e => update(item.id, "_notes", e.target.value)} placeholder="Notes (optional)" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => update(item.id, "_editing", false)} style={{ background: T.sage, color: T.white, border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Done ✓</button>
                  <button onClick={() => remove(item.id)} style={{ background: T.terraSoft, color: T.terracotta, border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Remove</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div onClick={() => toggle(item.id)} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: `2px solid ${item.checked ? T.sage : T.border}`, background: item.checked ? T.sage : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {item.checked && <span style={{ color: T.white, fontSize: 13, fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: T.ink, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item._name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: T.muted }}>Size {item._size}{item._notes ? ` · ${item._notes}` : ""}</p>
                </div>
                <button onClick={() => update(item.id, "_editing", true)} style={{ background: "none", border: "none", color: T.muted, fontSize: 14, cursor: "pointer", padding: "4px 6px" }}>✎</button>
              </div>
            )}
          </div>
        ))}
        <button onClick={() => setItems(p => [...p, { id: uid(), _name: "", _size: "", _notes: "", checked: true, _editing: true }])} style={{ width: "100%", padding: "11px", background: "transparent", border: `1.5px dashed ${T.border}`, borderRadius: 12, color: T.muted, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer", marginBottom: 20 }}>+ Add item manually</button>
        <Btn onClick={() => setStep("details")} disabled={!selected.length} style={{ width: "100%" }}>Next: Handoff details ({selected.length} items) →</Btn>
      </div>
    </div>
  );

  if (step === "details") return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar title="Handoff Details" subtitle={`Applies to all ${selected.length} items`} onBack={() => setStep("review")} />
      <div style={{ padding: "16px 18px" }}>
        <div style={{ background: T.sageLight, borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 13, color: T.sage, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>These settings apply to all <strong>{selected.length} items</strong> in this bundle.</p>
        </div>
        <FieldSelect label="Giving to (optional)" value={givenTo} onChange={setGivenTo}
          options={[{ value: "", label: "Available to anyone in loop" }, ...otherFamilies.map(f => ({ value: f.code, label: f.name }))]} />
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>Your preference</label>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ val: true, icon: "🔁", label: "I want them back", desc: "Return when done" }, { val: false, icon: "→", label: "Free to flow", desc: "Pass forward" }].map(opt => (
              <div key={String(opt.val)} onClick={() => setRecall(opt.val)} style={{ flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer", textAlign: "center", border: `2px solid ${recall === opt.val ? T.sage : T.border}`, background: recall === opt.val ? T.sageLight : T.white }}>
                <p style={{ margin: 0, fontSize: 16 }}>{opt.icon}</p>
                <p style={{ margin: "3px 0 1px", fontWeight: 700, fontSize: 13, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>{opt.label}</p>
                <p style={{ margin: 0, fontSize: 11, color: T.muted }}>{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: T.white, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "12px 14px", marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: T.muted, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.07em" }}>{selected.length} items to log</p>
          {selected.map(item => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 13, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>{item._name}</span>
              <span style={{ fontSize: 12, color: T.muted, fontFamily: "'DM Mono', monospace" }}>{item._size}</span>
            </div>
          ))}
        </div>
        {scanError && <div style={{ background: T.terraSoft, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}><p style={{ margin: 0, fontSize: 13, color: T.terracotta }}>⚠️ {scanError}</p></div>}
        <Btn onClick={handleLogAll} disabled={saving} style={{ width: "100%" }}>{saving ? "Saving…" : `🌿 Log all ${selected.length} items →`}</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 500, padding: "40px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: T.ink, margin: "0 0 8px" }}>Bundle logged!</h2>
      <p style={{ color: T.muted, fontSize: 15, marginBottom: 12, lineHeight: 1.6 }}><strong style={{ color: T.ink }}>{selected.length} items</strong> saved to Supabase{givenTo ? ` and given to ${families[givenTo]?.name || givenTo}` : ""}.</p>
      <div style={{ background: T.sageLight, borderRadius: 12, padding: "12px 16px", marginBottom: 28, textAlign: "left", width: "100%" }}>
        {selected.slice(0, 6).map(item => <p key={item.id} style={{ margin: "3px 0", fontSize: 13, color: T.sage, fontFamily: "'DM Sans', sans-serif" }}>✓ {item._name} · {item._size}</p>)}
        {selected.length > 6 && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.muted }}>+{selected.length - 6} more</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        <Btn onClick={() => { setStep("upload"); setImagePreview(null); setImageBase64(null); setItems([]); }}>Scan another bundle</Btn>
        <Btn variant="ghost" onClick={onSaved}>Back to wardrobe</Btn>
      </div>
    </div>
  );
}

// ── ITEM CARD ──────────────────────────────────────────────
const ItemCard = ({ item, currentCode, onReturn, onMarkGiven, families }) => {
  const isHolder = item.givenTo === currentCode;
  const holderFamily = item.givenTo ? (families[item.givenTo]?.name || item.givenToName || item.givenTo) : null;
  return (
    <Card>
      <div style={{ marginBottom: 8 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>{item.name}</p>
        <p style={{ margin: "2px 0 6px", fontSize: 12, color: T.muted }}>Size {item.size}{item.notes ? ` · ${item.notes}` : ""}{item.date ? ` · ${fmtDate(item.date)}` : ""}</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {item.status === "available" && <Pill>Available</Pill>}
          {item.status === "out" && holderFamily && <Pill color="#EEE8E0" text={T.muted}>With {holderFamily}</Pill>}
          {item.status === "returned" && <Pill color="#E8E0F0" text="#6A4FA0">Returned</Pill>}
          {item.recall && item.status === "out" && <Pill color={T.terraSoft} text={T.terracotta}>Recall wanted</Pill>}
          {!item.recall && item.status === "out" && <Pill color={T.sageLight} text={T.sageMid}>Free to flow</Pill>}
          {item.ownerCode !== currentCode && <Pill color="#F0EBE0" text={T.muted}>From {families[item.ownerCode]?.name || item.ownerName}</Pill>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {isHolder && item.status === "out" && <Btn size="sm" variant="secondary" onClick={() => onReturn(item)}>Mark returned ↩</Btn>}
        {item.ownerCode === currentCode && item.status === "available" && onMarkGiven && <Btn size="sm" onClick={() => onMarkGiven(item)}>Give to someone →</Btn>}
      </div>
    </Card>
  );
};

// ── HOME ───────────────────────────────────────────────────
function HomeScreen({ family, families, items, onNavigate, syncing }) {
  const myCode = family.code;
  const given = items.filter(i => i.ownerCode === myCode && i.status === "out");
  const received = items.filter(i => i.givenTo === myCode && i.status === "out");
  const available = items.filter(i => i.status === "available" && i.ownerCode !== myCode);
  return (
    <div style={{ padding: "24px 18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <p style={{ margin: 0, fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Welcome back</p>
        {syncing && <span style={{ fontSize: 11, color: T.sageMid, fontFamily: "'DM Sans', sans-serif" }}>↻ Syncing…</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
        <LogoMark size={52} code={family.code} />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, margin: 0, color: T.ink }}>{family.name.split(" ")[0]}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 22 }}>
        <Pill>{family.code}</Pill>
        <span style={{ fontSize: 12, color: T.muted }}>{Object.keys(families).length} {Object.keys(families).length === 1 ? "family" : "families"} in your loop</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
        {[{ label: "Given out", value: given.length, nav: "given" }, { label: "In care", value: received.length, nav: "received" }, { label: "Available", value: available.length, nav: "community" }].map(s => (
          <div key={s.label} onClick={() => onNavigate(s.nav)} style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "14px 10px", textAlign: "center", cursor: "pointer" }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, margin: 0, color: T.sage }}>{s.value}</p>
            <p style={{ fontSize: 10, color: T.muted, margin: "2px 0 0", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div onClick={() => onNavigate("scan")} style={{ background: `linear-gradient(135deg, ${T.sage}, #3D6B3D)`, borderRadius: 16, padding: "18px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 34 }}>📸</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: T.white, fontFamily: "'DM Sans', sans-serif" }}>Scan a bundle</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Photo-log 20 items in one shot</p>
        </div>
        <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.7)", fontSize: 20 }}>→</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <Btn variant="secondary" onClick={() => onNavigate("log_give")} style={{ flex: 1, fontSize: 13 }}>↑ Log one item</Btn>
        <Btn variant="ghost" onClick={() => onNavigate("log_receive")} style={{ flex: 1, fontSize: 13 }}>↓ Log received</Btn>
      </div>
      {items.length > 0 && <>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Recent</p>
        {items.slice(-3).reverse().map(item => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>{item.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: T.muted }}>Size {item.size} · {item.ownerCode === myCode ? `→ ${item.givenToName || "available"}` : `← from ${families[item.ownerCode]?.name || item.ownerName}`}</p>
            </div>
            <Pill color={item.status === "available" ? T.sageLight : "#EEE8E0"} text={item.status === "available" ? T.sage : T.muted}>{item.status}</Pill>
          </div>
        ))}
      </>}
    </div>
  );
}

// ── GIVEN ──────────────────────────────────────────────────
function GivenScreen({ family, families, items, setItems, onNavigate }) {
  const [returnModal, setReturnModal] = useState(null);
  const [giveModal, setGiveModal] = useState(null);
  const [giveTarget, setGiveTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const myCode = family.code;
  const myItems = items.filter(i => i.ownerCode === myCode);
  const otherFamilies = Object.values(families).filter(f => f.code !== myCode);

  const handleReturn = async (item) => {
    setSaving(true);
    await db.updateItem(item.id, { status: "returned", givenTo: null, givenToName: null });
    setItems(p => p.map(i => i.id === item.id ? { ...i, status: "returned", givenTo: null, givenToName: null } : i));
    setSaving(false); setReturnModal(null);
  };
  const handleGive = async (item) => {
    if (!giveTarget) return;
    setSaving(true);
    const name = families[giveTarget]?.name || giveTarget;
    await db.updateItem(item.id, { status: "out", givenTo: giveTarget, givenToName: name });
    setItems(p => p.map(i => i.id === item.id ? { ...i, status: "out", givenTo: giveTarget, givenToName: name } : i));
    setSaving(false); setGiveModal(null); setGiveTarget("");
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar title="Given Out" subtitle={`${myItems.filter(i => i.status === "out").length} items out with others`} />
      <div style={{ padding: "14px 18px" }}>
        {myItems.length === 0
          ? <div style={{ textAlign: "center", padding: "40px 0" }}><p style={{ fontSize: 32 }}>🌿</p><p style={{ color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Nothing logged yet.</p><Btn size="sm" onClick={() => onNavigate("scan")} style={{ marginTop: 10 }}>📸 Scan a bundle</Btn></div>
          : myItems.map(item => <ItemCard key={item.id} item={item} currentCode={myCode} families={families} onReturn={i => setReturnModal(i)} onMarkGiven={i => { setGiveModal(i); setGiveTarget(""); }} />)
        }
      </div>
      <Modal open={!!returnModal} onClose={() => setReturnModal(null)} title="Mark as returned">
        {returnModal && <>
          <p style={{ color: T.muted, fontSize: 14, marginBottom: 20 }}>Mark <strong style={{ color: T.ink }}>{returnModal.name}</strong> as returned to you?</p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => handleReturn(returnModal)} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving…" : "Yes, it's back ✓"}</Btn>
            <Btn variant="ghost" onClick={() => setReturnModal(null)} style={{ flex: 1 }}>Cancel</Btn>
          </div>
        </>}
      </Modal>
      <Modal open={!!giveModal} onClose={() => setGiveModal(null)} title="Give to a family">
        {giveModal && <>
          <p style={{ color: T.muted, fontSize: 14, marginBottom: 16 }}>Who is <strong style={{ color: T.ink }}>{giveModal.name}</strong> going to?</p>
          {otherFamilies.length === 0
            ? <p style={{ color: T.muted, fontSize: 13 }}>No other families yet — share the app link!</p>
            : <>
                <FieldSelect label="Select family" value={giveTarget} onChange={setGiveTarget} options={[{ value: "", label: "Choose…" }, ...otherFamilies.map(f => ({ value: f.code, label: f.name }))]} />
                <Btn onClick={() => handleGive(giveModal)} disabled={!giveTarget || saving} style={{ width: "100%" }}>{saving ? "Saving…" : "Confirm →"}</Btn>
              </>
          }
        </>}
      </Modal>
    </div>
  );
}

// ── RECEIVED ──────────────────────────────────────────────
function ReceivedScreen({ family, families, items, setItems }) {
  const [returnModal, setReturnModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const myCode = family.code;
  const received = items.filter(i => i.givenTo === myCode && i.status === "out");
  const handleReturn = async (item) => {
    setSaving(true);
    await db.updateItem(item.id, { status: "returned", givenTo: null, givenToName: null });
    setItems(p => p.map(i => i.id === item.id ? { ...i, status: "returned", givenTo: null, givenToName: null } : i));
    setSaving(false); setReturnModal(null);
  };
  return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar title="In My Care" subtitle={`${received.length} items from other families`} />
      <div style={{ padding: "14px 18px" }}>
        {received.length === 0
          ? <div style={{ textAlign: "center", padding: "40px 0" }}><p style={{ fontSize: 32 }}>📦</p><p style={{ color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Nothing received yet.</p></div>
          : received.map(item => <ItemCard key={item.id} item={item} currentCode={myCode} families={families} onReturn={i => setReturnModal(i)} />)
        }
      </div>
      <Modal open={!!returnModal} onClose={() => setReturnModal(null)} title="Return this item">
        {returnModal && <>
          <p style={{ color: T.muted, fontSize: 14, marginBottom: 8 }}>Return <strong style={{ color: T.ink }}>{returnModal.name}</strong> to {families[returnModal.ownerCode]?.name || returnModal.ownerName}?</p>
          {returnModal.recall && <div style={{ background: T.terraSoft, borderRadius: 10, padding: "10px 13px", marginBottom: 16 }}><p style={{ margin: 0, fontSize: 13, color: T.terracotta }}>🔁 This family wants this item back.</p></div>}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => handleReturn(returnModal)} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving…" : "Mark returned ↩"}</Btn>
            <Btn variant="ghost" onClick={() => setReturnModal(null)} style={{ flex: 1 }}>Cancel</Btn>
          </div>
        </>}
      </Modal>
    </div>
  );
}

// ── ALL ITEMS (Notion-style table) ─────────────────────────
function AllItemsScreen({ family, families, items, setItems }) {
  const myCode = family.code;
  const [scope, setScope] = useState("everyone"); // "everyone" | "mine"
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [filterSize, setFilterSize] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Scope
  let rows = scope === "mine"
    ? items.filter(i => i.ownerCode === myCode)
    : items.slice();

  // Filters
  if (filterSize) rows = rows.filter(i => (i.size || "").toLowerCase() === filterSize.toLowerCase());
  if (filterStatus) rows = rows.filter(i => i.status === filterStatus);
  if (filterOwner) rows = rows.filter(i => i.ownerCode === filterOwner);

  // Sort
  rows.sort((a, b) => {
    let av, bv;
    switch (sortKey) {
      case "name": av = (a.name || "").toLowerCase(); bv = (b.name || "").toLowerCase(); break;
      case "size": av = (a.size || ""); bv = (b.size || ""); break;
      case "status": av = a.status || ""; bv = b.status || ""; break;
      case "owner": av = a.ownerCode || ""; bv = b.ownerCode || ""; break;
      default: av = a.date || ""; bv = b.date || "";
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const uniqueSizes = [...new Set(items.map(i => i.size).filter(Boolean))].sort();
  const ownerList = Object.values(families);
  const statusOptions = ["available", "out", "returned"];
  const activeFilters = [filterSize, filterStatus, filterOwner].filter(Boolean).length;

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({ name: item.name, size: item.size, notes: item.notes || "", status: item.status, recall: item.recall });
  };
  const saveEdit = async () => {
    setSaving(true);
    try {
      await db.updateItem(editItem.id, editForm);
      setItems(p => p.map(i => i.id === editItem.id ? { ...i, ...editForm } : i));
      setEditItem(null);
    } catch {}
    setSaving(false);
  };
  const handleDelete = async () => {
    setSaving(true);
    try {
      await db.deleteItem(editItem.id);
      setItems(p => p.filter(i => i.id !== editItem.id));
      setEditItem(null);
    } catch {}
    setSaving(false);
  };

  const SortHeader = ({ label, k, w }) => (
    <th onClick={() => toggleSort(k)} style={{
      textAlign: "left", padding: "8px 8px", fontSize: 10, fontWeight: 700,
      color: sortKey === k ? T.sage : T.muted, fontFamily: "'DM Mono', monospace",
      textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer",
      whiteSpace: "nowrap", width: w, userSelect: "none",
    }}>
      {label}{sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  const statusColor = (s) => s === "available" ? { bg: T.sageLight, fg: T.sage } : s === "out" ? { bg: "#EEE8E0", fg: T.muted } : { bg: "#E8E0F0", fg: "#6A4FA0" };

  return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar title="All Items" subtitle={`${rows.length} ${rows.length === 1 ? "item" : "items"}${activeFilters ? " · filtered" : ""}`} />

      {/* scope toggle + filter button */}
      <div style={{ padding: "12px 18px 8px", display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", background: T.bg, borderRadius: 10, padding: 3, border: `1.5px solid ${T.border}` }}>
          {[["everyone", "Everyone"], ["mine", "Just mine"]].map(([val, label]) => (
            <button key={val} onClick={() => setScope(val)} style={{
              padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12,
              background: scope === val ? T.white : "transparent",
              color: scope === val ? T.sage : T.muted,
              boxShadow: scope === val ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>{label}</button>
          ))}
        </div>
        <button onClick={() => setShowFilters(s => !s)} style={{
          marginLeft: "auto", padding: "8px 14px", borderRadius: 10, cursor: "pointer",
          border: `1.5px solid ${activeFilters ? T.sage : T.border}`,
          background: activeFilters ? T.sageLight : T.white,
          color: activeFilters ? T.sage : T.muted, fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700, fontSize: 12,
        }}>⚲ Filter{activeFilters ? ` (${activeFilters})` : ""}</button>
      </div>

      {/* filter panel */}
      {showFilters && (
        <div style={{ padding: "8px 18px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Size</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
              <FilterChip active={!filterSize} onClick={() => setFilterSize("")}>All</FilterChip>
              {uniqueSizes.map(s => <FilterChip key={s} active={filterSize === s} onClick={() => setFilterSize(s)}>{s}</FilterChip>)}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
              <FilterChip active={!filterStatus} onClick={() => setFilterStatus("")}>All</FilterChip>
              {statusOptions.map(s => <FilterChip key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}>{s}</FilterChip>)}
            </div>
          </div>
          {scope === "everyone" && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Owner</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                <FilterChip active={!filterOwner} onClick={() => setFilterOwner("")}>All</FilterChip>
                {ownerList.map(f => <FilterChip key={f.code} active={filterOwner === f.code} onClick={() => setFilterOwner(f.code)}>{f.code}</FilterChip>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* table */}
      <div style={{ padding: "4px 12px", overflowX: "auto" }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: T.muted }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>▦</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>No items match.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif" }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${T.border}` }}>
                <SortHeader label="Item" k="name" />
                <SortHeader label="Size" k="size" />
                <SortHeader label="Status" k="status" />
                {scope === "everyone" && <SortHeader label="Owner" k="owner" />}
                <th style={{ width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(item => {
                const sc = statusColor(item.status);
                return (
                  <tr key={item.id} onClick={() => openEdit(item)} style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
                    <td style={{ padding: "10px 8px" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: T.ink }}>{item.name}</p>
                      {item.notes ? <p style={{ margin: "1px 0 0", fontSize: 11, color: T.muted }}>{item.notes}</p> : null}
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: 12, color: T.ink, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>{item.size}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: sc.bg, color: sc.fg, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", whiteSpace: "nowrap" }}>{item.status}</span>
                    </td>
                    {scope === "everyone" && <td style={{ padding: "10px 8px", fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace" }}>{item.ownerCode}</td>}
                    <td style={{ padding: "10px 4px", textAlign: "center", color: T.muted, fontSize: 13 }}>✎</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* edit modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit item">
        {editItem && (
          <>
            {editItem.ownerCode !== myCode && (
              <div style={{ background: "#F0EBE0", borderRadius: 10, padding: "8px 12px", marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 12, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>This item belongs to {families[editItem.ownerCode]?.name || editItem.ownerCode}. Edits sync for everyone.</p>
              </div>
            )}
            <FieldInput label="Item name" value={editForm.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} required />
            <FieldInput label="Size" value={editForm.size} onChange={v => setEditForm(f => ({ ...f, size: v }))} required />
            <FieldInput label="Notes" value={editForm.notes} onChange={v => setEditForm(f => ({ ...f, notes: v }))} />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>Status</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["available", "out", "returned"].map(s => (
                  <button key={s} onClick={() => setEditForm(f => ({ ...f, status: s }))} style={{
                    flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 700,
                    border: `2px solid ${editForm.status === s ? T.sage : T.border}`,
                    background: editForm.status === s ? T.sageLight : T.white,
                    color: editForm.status === s ? T.sage : T.muted,
                    fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize",
                  }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <Btn onClick={saveEdit} disabled={saving || !editForm.name?.trim() || !editForm.size?.trim()} style={{ flex: 1 }}>{saving ? "Saving…" : "Save changes"}</Btn>
              <Btn variant="ghost" onClick={() => setEditItem(null)} style={{ flex: 1 }}>Cancel</Btn>
            </div>
            <button onClick={handleDelete} disabled={saving} style={{
              width: "100%", marginTop: 12, padding: "10px", background: "none",
              border: "none", color: T.terracotta, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>Delete this item</button>
          </>
        )}
      </Modal>
    </div>
  );
}

const FilterChip = ({ children, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: "5px 11px", borderRadius: 20, cursor: "pointer",
    border: `1.5px solid ${active ? T.sage : T.border}`,
    background: active ? T.sage : T.white,
    color: active ? T.white : T.muted,
    fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap",
  }}>{children}</button>
);

// ── COMMUNITY ─────────────────────────────────────────────
function CommunityScreen({ family, families, items }) {
  const myCode = family.code;
  const available = items.filter(i => i.status === "available" && i.ownerCode !== myCode);
  return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar title="Community" subtitle={`${available.length} items available`} />
      <div style={{ padding: "14px 18px" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Families in your loop</p>
        {Object.values(families).map(f => (
          <div key={f.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: T.white, borderRadius: 12, border: `1.5px solid ${f.code === myCode ? T.sage : T.border}`, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 34, background: T.sageLight, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: T.sage }}>{f.code}</div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>{f.name} {f.code === myCode && <span style={{ color: T.sageMid, fontWeight: 400, fontSize: 12 }}>(you)</span>}</p>
                {f.kids?.length > 0 && <p style={{ margin: 0, fontSize: 12, color: T.muted }}>{f.kids.join(", ")}</p>}
              </div>
            </div>
            <Pill color={f.code === myCode ? T.sageLight : "#EEE8E0"} text={f.code === myCode ? T.sage : T.muted}>{items.filter(i => i.ownerCode === f.code).length} items</Pill>
          </div>
        ))}
        {available.length > 0 && <>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "20px 0 10px" }}>Available to claim</p>
          {available.map(item => (
            <Card key={item.id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>{item.name}</p>
                  <p style={{ margin: "2px 0 6px", fontSize: 12, color: T.muted }}>Size {item.size}{item.notes ? ` · ${item.notes}` : ""}</p>
                  <Pill color="#F0EBE0" text={T.muted}>From {families[item.ownerCode]?.name || item.ownerName}</Pill>
                </div>
                <Pill>Free</Pill>
              </div>
            </Card>
          ))}
        </>}
      </div>
    </div>
  );
}

// ── LOG SINGLE ─────────────────────────────────────────────
function LogItemScreen({ family, families, items, setItems, mode, onBack }) {
  const isGiving = mode === "give";
  const [form, setForm] = useState({ name: "", size: "", notes: "", recall: true, givenTo: "", date: new Date().toISOString().split("T")[0] });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const otherFamilies = Object.values(families).filter(f => f.code !== family.code);

  const handleSave = async () => {
    if (!form.name.trim() || !form.size.trim()) return;
    setSaving(true);
    const newItem = {
      id: uid(), ownerCode: family.code, ownerName: family.name,
      name: form.name.trim(), size: form.size.trim(), notes: form.notes.trim(),
      recall: form.recall, date: form.date,
      status: isGiving && form.givenTo ? "out" : "available",
      givenTo: isGiving && form.givenTo ? form.givenTo : null,
      givenToName: isGiving && form.givenTo ? (families[form.givenTo]?.name || form.givenTo) : null,
    };
    await db.insertItem(newItem);
    setItems(p => [...p, newItem]);
    setSaving(false); setSaved(true);
  };

  if (saved) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, padding: "40px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🌿</div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: T.ink, margin: "0 0 8px" }}>Logged!</h2>
      <p style={{ color: T.muted, fontSize: 14, marginBottom: 28 }}><strong style={{ color: T.ink }}>{form.name}</strong> (Size {form.size}) saved.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        <Btn onClick={() => { setForm({ name: "", size: "", notes: "", recall: true, givenTo: "", date: new Date().toISOString().split("T")[0] }); setSaved(false); }} style={{ width: "100%" }}>Log another</Btn>
        <Btn variant="ghost" onClick={onBack} style={{ width: "100%" }}>Done</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar title={isGiving ? "Log a Handoff" : "Log Received Item"} subtitle="Single item" onBack={onBack} />
      <div style={{ padding: "16px 18px" }}>
        <FieldInput label="Item name" value={form.name} onChange={v => set("name", v)} placeholder="e.g. Floral Sunsuit" required />
        <FieldInput label="Size" value={form.size} onChange={v => set("size", v)} placeholder="e.g. 12M, 2T" required />
        <FieldInput label="Notes" value={form.notes} onChange={v => set("notes", v)} placeholder="e.g. 3-pack, barely worn" />
        <FieldInput label="Date" value={form.date} onChange={v => set("date", v)} type="date" />
        {isGiving && <>
          <FieldSelect label="Giving to (optional)" value={form.givenTo} onChange={v => set("givenTo", v)} options={[{ value: "", label: "Available to anyone" }, ...otherFamilies.map(f => ({ value: f.code, label: f.name }))]} />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>Preference</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ val: true, icon: "🔁", label: "I want it back" }, { val: false, icon: "→", label: "Free to flow" }].map(opt => (
                <div key={String(opt.val)} onClick={() => set("recall", opt.val)} style={{ flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer", textAlign: "center", border: `2px solid ${form.recall === opt.val ? T.sage : T.border}`, background: form.recall === opt.val ? T.sageLight : T.white }}>
                  <p style={{ margin: 0, fontSize: 15 }}>{opt.icon}</p>
                  <p style={{ margin: "3px 0 0", fontWeight: 700, fontSize: 13, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>{opt.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>}
        <Btn onClick={handleSave} disabled={!form.name.trim() || !form.size.trim() || saving} style={{ width: "100%", marginTop: 8 }}>{saving ? "Saving…" : "Save item →"}</Btn>
      </div>
    </div>
  );
}

// ── ONBOARDING ─────────────────────────────────────────────
function OnboardingScreen({ existingFamilies, onComplete, onLogin }) {
  const familyList = Object.values(existingFamilies);
  const [mode, setMode] = useState(familyList.length > 0 ? "choose" : "new");
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [kids, setKids] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const codeFromName = n => n.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3).padEnd(3, "X");

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (code.length < 3) { setError("Code must be 3 letters"); return; }
    if (existingFamilies[code]) { setError(`Code ${code} is taken — if that's you, go back and tap your name`); return; }
    setSaving(true);
    const profile = { code, name: name.trim(), kids: kids.split(",").map(k => k.trim()).filter(Boolean) };
    try { await db.upsertFamily(profile); onComplete(profile); }
    catch { setError("Couldn't connect — check your network."); }
    setSaving(false);
  };

  const Header = () => (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <div style={{ width: 80, height: 80, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LogoMark size={72} />
      </div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, color: T.ink, margin: "0 0 8px" }}>Heirloom Loop</h1>
      <p style={{ color: T.muted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>Track the clothes you give and receive.<br />Stay connected with families you trust.</p>
    </div>
  );

  if (mode === "choose") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px" }}>
        <Header />
        <div style={{ background: T.white, borderRadius: 20, padding: "20px", border: `1.5px solid ${T.border}` }}>
          <p style={{ margin: "0 0 14px", fontWeight: 700, fontSize: 13, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>Welcome back — who are you?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {familyList.map(f => (
              <button key={f.code} onClick={() => onLogin(f.code)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 12,
                cursor: "pointer", textAlign: "left", width: "100%",
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 38, background: T.sageLight, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: T.sage, flexShrink: 0 }}>{f.code}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>{f.name}</p>
                  {f.kids?.length > 0 && <p style={{ margin: 0, fontSize: 12, color: T.muted }}>{f.kids.join(", ")}</p>}
                </div>
                <span style={{ color: T.sage, fontSize: 18 }}>→</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { setMode("new"); setName(""); setCode(""); setError(""); }} style={{
          background: "none", border: "none", color: T.sage, fontSize: 14, fontWeight: 700,
          cursor: "pointer", marginTop: 20, fontFamily: "'DM Sans', sans-serif",
        }}>+ My family is new here</button>
        <p style={{ textAlign: "center", fontSize: 12, color: T.muted, marginTop: 16, lineHeight: 1.6 }}>🔒 Shared only with families in your group.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px" }}>
      <Header />
      <div style={{ background: T.white, borderRadius: 20, padding: "24px 20px", border: `1.5px solid ${T.border}` }}>
        <FieldInput label="Your first name" value={name} onChange={v => { setName(v); setCode(codeFromName(v)); }} placeholder="e.g. Praise" required />
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 5 }}>Family code <span style={{ color: T.terracotta }}>*</span></label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))} maxLength={3} placeholder="PSM" style={{ width: 80, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontFamily: "'DM Mono', monospace", fontSize: 18, color: T.sage, fontWeight: 700, textAlign: "center", outline: "none" }} />
            <p style={{ margin: 0, fontSize: 12, color: T.muted, flex: 1 }}>3 letters — goes on your labels</p>
          </div>
        </div>
        <FieldInput label="Kids' names (comma separated)" value={kids} onChange={setKids} placeholder="e.g. Valor, Baby" />
        {error && <p style={{ color: T.terracotta, fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <Btn onClick={handleSubmit} disabled={saving} style={{ width: "100%" }}>{saving ? "Joining…" : "Join Heirloom Loop →"}</Btn>
      </div>
      {familyList.length > 0 && (
        <button onClick={() => { setMode("choose"); setError(""); }} style={{
          background: "none", border: "none", color: T.muted, fontSize: 14,
          cursor: "pointer", marginTop: 18, fontFamily: "'DM Sans', sans-serif",
        }}>← I'm a returning family</button>
      )}
      <p style={{ textAlign: "center", fontSize: 12, color: T.muted, marginTop: 16, lineHeight: 1.6 }}>🔒 Shared only with families in your group.</p>
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState({});
  const [items, setItems] = useState([]);
  const [currentCode, setCurrentCode] = useState(null);
  const [tab, setTab] = useState("home");
  const [subScreen, setSubScreen] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false });

  const showToast = (msg) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  };

  // Initial load
  useEffect(() => {
    const code = getSessionCode();
    Promise.all([db.getFamilies(), db.getItems()]).then(([fams, its]) => {
      const famMap = {};
      fams.forEach(f => { famMap[f.code] = f; });
      setFamilies(famMap);
      setItems(its);
      if (code && famMap[code]) setCurrentCode(code);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Polling for real-time sync (every 5s)
  useEffect(() => {
    if (!currentCode) return;
    const stop = db.subscribe((fams, its) => {
      const famMap = {};
      fams.forEach(f => { famMap[f.code] = f; });
      setFamilies(famMap);
      setItems(its);
    });
    return stop;
  }, [currentCode]);

  const handleOnboard = (profile) => {
    setFamilies(f => ({ ...f, [profile.code]: profile }));
    setCurrentCode(profile.code);
    setSessionCode(profile.code);
    showToast("Welcome to the loop! 🌿");
  };

  const handleLogin = (code) => {
    setCurrentCode(code);
    setSessionCode(code);
    showToast(`Welcome back! 🌿`);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <p style={{ fontFamily: "'Playfair Display', serif", color: T.sage, fontSize: 20, margin: 0 }}>🌿 Heirloom Loop</p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", color: T.muted, fontSize: 13, margin: 0 }}>Connecting…</p>
    </div>
  );

  const family = currentCode ? families[currentCode] : null;

  if (!family) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <OnboardingScreen existingFamilies={families} onComplete={handleOnboard} onLogin={handleLogin} />
    </>
  );

  const handleNavigate = t => {
    if (["scan", "log_give", "log_receive"].includes(t)) setSubScreen(t);
    else { setTab(t); setSubScreen(null); }
  };

  const renderMain = () => {
    if (subScreen === "scan") return (
      <PhotoScanScreen family={family} families={families}
        onBack={() => setSubScreen(null)}
        onSaved={() => { setSubScreen(null); setTab("given"); showToast("Bundle logged! 🌿"); }}
        onInsertItems={newItems => { setItems(p => [...p, ...newItems]); }} />
    );
    if (subScreen === "log_give") return <LogItemScreen family={family} families={families} items={items} setItems={setItems} mode="give" onBack={() => setSubScreen(null)} />;
    if (subScreen === "log_receive") return <LogItemScreen family={family} families={families} items={items} setItems={setItems} mode="receive" onBack={() => setSubScreen(null)} />;
    switch (tab) {
      case "home": return <HomeScreen family={family} families={families} items={items} onNavigate={handleNavigate} syncing={syncing} />;
      case "given": return <GivenScreen family={family} families={families} items={items} setItems={setItems} onNavigate={handleNavigate} />;
      case "received": return <ReceivedScreen family={family} families={families} items={items} setItems={setItems} />;
      case "all": return <AllItemsScreen family={family} families={families} items={items} setItems={setItems} />;
      case "community": return <CommunityScreen family={family} families={families} items={items} />;
      default: return null;
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: ${T.bg}; }`}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>{renderMain()}</div>
        {!subScreen && <BottomNav active={tab} onChange={setTab} />}
      </div>
      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}