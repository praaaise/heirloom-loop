import { useState, useEffect, useRef } from "react";

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://qriajzvzfhdwqnszjxht.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyaWFqenZ6Zmhkd3Fuc3pqeGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjA1MzAsImV4cCI6MjA5NTk5NjUzMH0.MqHy1xhCRxggZ8rl-Rd5FlbPPycVV6QanhfItv8-7tQ";

const sb = {
  from: (table: string) => ({
    select: (cols = "*") => fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${cols}`, { headers: sbHeaders() }).then(r => r.json()),
    insert: (data: object) => fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...sbHeaders(), "Prefer": "return=representation" }, body: JSON.stringify(data) }).then(r => r.json()),
    update: (data: object) => ({
      eq: (col: string, val: string) => fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, { method: "PATCH", headers: { ...sbHeaders(), "Prefer": "return=representation" }, body: JSON.stringify(data) }).then(r => r.json())
    }),
    delete: () => ({
      eq: (col: string, val: string) => fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, { method: "DELETE", headers: sbHeaders() }).then(r => r.json())
    }),
  }),
  storage: {
    upload: async (bucket: string, path: string, file: File): Promise<string | null> => {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SUPABASE_ANON}`, "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) return null;
      return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    }
  }
};
function sbHeaders() {
  return { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json" };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Family { id: string; code: string; name: string; }
interface Item {
  id: string; description: string; size: string; condition: string;
  status: string; owner_code: string; given_to: string | null;
  recall_preference: string | null; received_from: string | null;
  bundle_photo_url: string | null; created_at: string;
}
type Tab = "home" | "given" | "received" | "all" | "community";
type SubScreen = "scan" | "manual";

// ── Logo ──────────────────────────────────────────────────────────────────────
function LogoMark({ code = "ABC", size = 52 }: { code?: string; size?: number }) {
  const s = size / 52;
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* jeans body */}
      <path d="M8 6 h36 l-4 28 -10 2 -10-2 Z" fill="#3B5FA0" />
      {/* left leg */}
      <path d="M14 34 l-6 12 h14 l4-12 Z" fill="#3B5FA0" />
      {/* right leg */}
      <path d="M38 34 l6 12 h-14 l-4-12 Z" fill="#3B5FA0" />
      {/* crotch seam */}
      <path d="M20 34 l6 6 6-6" stroke="#2a4a80" strokeWidth="1" fill="none" />
      {/* waistband */}
      <rect x="8" y="4" width="36" height="5" rx="1" fill="#2a4a80" />
      {/* left pocket arc */}
      <path d="M13 10 q5-5 10 0" stroke="#C9A84C" strokeWidth="1.2" fill="none" />
      {/* right pocket arc */}
      <path d="M29 10 q5-5 10 0" stroke="#C9A84C" strokeWidth="1.2" fill="none" />
      {/* leaf tag on right waistband */}
      <ellipse cx="40" cy="4" rx="7" ry="4" fill="#7A9E7E" transform="rotate(-20 40 4)" />
      <text x="40" y="5.5" textAnchor="middle" fontSize={`${4.5 * s}px`} fontFamily="Georgia, serif" fontStyle="italic" fill="#F5EDD6" transform="rotate(-20 40 4)">{code}</text>
    </svg>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  return (
    <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#2d4a2d", color: "#fff", padding: "10px 20px", borderRadius: 20, fontSize: 14, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
      {msg}
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const isOut = status.startsWith("out");
  const color = status === "available" ? "#7A9E7E" : status === "returned" ? "#C9A84C" : "#C47B5A";
  const label = isOut ? status : status.charAt(0).toUpperCase() + status.slice(1);
  return <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 12, padding: "2px 10px", fontSize: 12, fontFamily: "DM Mono, monospace", whiteSpace: "nowrap" }}>{label}</span>;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [family, setFamily] = useState<Family | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<Tab>("home");
  const [subScreen, setSubScreen] = useState<SubScreen | null>(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFamilies(); }, []);
  useEffect(() => { if (family) loadItems(); }, [family]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function loadFamilies() {
    const data = await sb.from("families").select("*");
    if (Array.isArray(data)) setFamilies(data);
    setLoading(false);
  }

  async function loadItems() {
    const data = await sb.from("items").select("*");
    if (Array.isArray(data)) setItems(data);
  }

  async function login(code: string, name: string) {
    const existing = families.find(f => f.code.toUpperCase() === code.toUpperCase());
    if (existing) { setFamily(existing); return; }
    const res = await sb.from("families").insert({ code: code.toUpperCase(), name });
    if (Array.isArray(res) && res[0]) { setFamily(res[0]); setFamilies(prev => [...prev, res[0]]); }
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "DM Sans, sans-serif", color: "#3B5FA0" }}>Loading…</div>;
  if (!family) return <LoginScreen families={families} onLogin={login} />;

  const myItems = items.filter(i => i.owner_code === family.code);
  const givenItems = myItems.filter(i => i.status.startsWith("out"));
  const receivedItems = items.filter(i => i.given_to === family.code || i.received_from === family.code);

  if (subScreen === "scan") return (
    <PhotoScanScreen
      family={family}
      families={families}
      onSaved={(direction) => {
        loadItems();
        setSubScreen(null);
        setTab(direction === "received" ? "received" : "given");
        showToast("Bundle logged! 🌿");
      }}
      onCancel={() => setSubScreen(null)}
    />
  );

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#FAFAF7", display: "flex", flexDirection: "column" }}>
      {toast && <Toast msg={toast} />}

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e4de", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <LogoMark code={family.code} size={40} />
        <div>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 18, color: "#1a1a1a", lineHeight: 1 }}>Heirloom Loop</div>
          <div style={{ fontSize: 11, color: "#888", fontFamily: "DM Mono, monospace" }}>{family.code} · {family.name}</div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
        {tab === "home" && <HomeTab family={family} givenCount={givenItems.length} receivedCount={receivedItems.length} onScan={() => setSubScreen("scan")} />}
        {tab === "given" && <GivenTab items={givenItems} families={families} onRefresh={loadItems} showToast={showToast} />}
        {tab === "received" && <ReceivedTab items={receivedItems} families={families} />}
        {tab === "all" && <AllItemsTab items={items} families={families} currentFamily={family} onRefresh={loadItems} showToast={showToast} />}
        {tab === "community" && <CommunityTab families={families} items={items} currentFamily={family} />}
      </div>

      {/* Bottom nav */}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", borderTop: "1px solid #e8e4de", display: "flex" }}>
        {(["home", "given", "received", "all", "community"] as Tab[]).map(t => {
          const icons: Record<Tab, string> = { home: "🏠", given: "📤", received: "📥", all: "📋", community: "🌿" };
          const labels: Record<Tab, string> = { home: "Home", given: "Given", received: "Received", all: "All Items", community: "Community" };
          return (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px 0 8px", border: "none", background: "none", cursor: "pointer", fontSize: 18, color: tab === t ? "#3B5FA0" : "#aaa", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span>{icons[t]}</span>
              <span style={{ fontSize: 9, fontFamily: "DM Sans, sans-serif", color: tab === t ? "#3B5FA0" : "#aaa" }}>{labels[t]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ families, onLogin }: { families: Family[]; onLogin: (code: string, name: string) => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"pick" | "new">(families.length > 0 ? "pick" : "new");

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "DM Sans, sans-serif" }}>
      <LogoMark size={72} />
      <div style={{ fontFamily: "Playfair Display, serif", fontSize: 28, color: "#1a1a1a", marginTop: 12 }}>Heirloom Loop</div>
      <div style={{ fontSize: 14, color: "#888", marginBottom: 32 }}>Clothes that keep circling back</div>

      {mode === "pick" && families.length > 0 ? (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#333" }}>Welcome back — who are you?</div>
          {families.map(f => (
            <button key={f.id} onClick={() => onLogin(f.code, f.name)} style={{ width: "100%", padding: "14px 16px", marginBottom: 8, background: "#fff", border: "1px solid #e0dbd4", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
              <LogoMark code={f.code} size={36} />
              <div>
                <div style={{ fontWeight: 600, color: "#1a1a1a" }}>{f.name}</div>
                <div style={{ fontSize: 12, color: "#888", fontFamily: "DM Mono, monospace" }}>{f.code}</div>
              </div>
            </button>
          ))}
          <button onClick={() => setMode("new")} style={{ width: "100%", padding: 12, marginTop: 8, background: "none", border: "1px dashed #ccc", borderRadius: 12, cursor: "pointer", color: "#888", fontSize: 14 }}>+ New family</button>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <input placeholder="Family code (e.g. VPM)" value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 3))} maxLength={3} style={inputStyle} />
          <input placeholder="Family name (e.g. The Millers)" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          <button onClick={() => code.length === 3 && name && onLogin(code, name)} style={btnStyle("#3B5FA0")}>Enter Heirloom Loop</button>
          {families.length > 0 && <button onClick={() => setMode("pick")} style={{ ...btnStyle("#888"), marginTop: 8, background: "none", color: "#888", border: "1px solid #ddd" }}>← Back</button>}
        </div>
      )}
    </div>
  );
}

// ── Home Tab ──────────────────────────────────────────────────────────────────
function HomeTab({ family, givenCount, receivedCount, onScan }: { family: Family; givenCount: number; receivedCount: number; onScan: () => void }) {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, color: "#1a1a1a" }}>Hello, {family.name} 👋</div>
        <div style={{ fontSize: 14, color: "#888", marginTop: 2 }}>Here's your loop at a glance</div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <StatCard label="Items out" value={givenCount} color="#3B5FA0" />
        <StatCard label="Items in" value={receivedCount} color="#7A9E7E" />
      </div>

      {/* Scan CTA */}
      <button onClick={onScan} style={{ width: "100%", padding: "20px 16px", background: "linear-gradient(135deg, #3B5FA0, #2a4a80)", border: "none", borderRadius: 16, cursor: "pointer", color: "#fff", textAlign: "left", marginBottom: 12 }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>📸</div>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Playfair Display, serif" }}>Scan a bundle</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Giving or receiving — photo-log in one shot</div>
      </button>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: 12, padding: "16px 14px" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Photo Scan Screen ─────────────────────────────────────────────────────────
interface ScannedItem { description: string; size: string; condition: string; }

function PhotoScanScreen({ family, families, onSaved, onCancel }: {
  family: Family; families: Family[];
  onSaved: (direction: "given" | "received") => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"direction" | "upload" | "scanning" | "review" | "details">("direction");
  const [direction, setDirection] = useState<"given" | "received" | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanned, setScanned] = useState<ScannedItem[]>([]);
  const [otherFamily, setOtherFamily] = useState("");
  const [recall, setRecall] = useState("want_back");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStep("scanning");
    scanImage(file);
  }

  async function scanImage(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/scan-clothing`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON}` },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        const items: ScannedItem[] = (data.items || []).map((item: ScannedItem) => ({ description: item.description || "", size: item.size || "", condition: item.condition || "good" }));
        setScanned(items);
        setStep("review");
      } catch {
        setScanned([]);
        setStep("review");
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleLogAll() {
    if (!imageFile) return;
    setSaving(true);
    setUploading(true);

    // Upload bundle photo
    const ext = imageFile.name.split(".").pop() || "jpg";
    const photoPath = `${family.code}-${Date.now()}.${ext}`;
    const photoUrl = await sb.storage.upload("bundle-photos", photoPath, imageFile);
    setUploading(false);

    // Save items
    const other = families.find(f => f.code === otherFamily);
    for (const item of scanned) {
      const record: Partial<Item> = {
        description: item.description,
        size: item.size,
        condition: item.condition,
        owner_code: direction === "given" ? family.code : (other?.code || family.code),
        status: direction === "given" ? `out → ${other?.name || otherFamily || "friend"}` : "available",
        given_to: direction === "given" ? (other?.code || null) : null,
        recall_preference: direction === "given" ? recall : null,
        received_from: direction === "received" ? (other?.code || null) : null,
        bundle_photo_url: photoUrl,
      };
      await sb.from("items").insert(record);
    }
    setSaving(false);
    onSaved(direction!);
  }

  const containerStyle: React.CSSProperties = { fontFamily: "DM Sans, sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#FAFAF7", display: "flex", flexDirection: "column" };
  const headerStyle: React.CSSProperties = { background: "#fff", borderBottom: "1px solid #e8e4de", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#555" }}>←</button>
        <div style={{ fontFamily: "Playfair Display, serif", fontSize: 17 }}>Scan a Bundle</div>
      </div>

      <div style={{ padding: 20, flex: 1 }}>

        {/* Step: Direction */}
        {step === "direction" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 16 }}>Are you giving or receiving this bundle?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {(["given", "received"] as const).map(d => (
                <button key={d} onClick={() => { setDirection(d); setStep("upload"); }} style={{ padding: "24px 12px", background: "#fff", border: "2px solid #e0dbd4", borderRadius: 16, cursor: "pointer", fontSize: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <span>{d === "given" ? "📤" : "📥"}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>{d === "given" ? "I'm giving" : "I'm receiving"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Upload */}
        {step === "upload" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Take or upload a photo</div>
            <div style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>Lay the clothes flat and snap one photo of the whole bundle</div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={pickImage} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()} style={btnStyle("#3B5FA0")}>Choose Photo</button>
          </div>
        )}

        {/* Step: Scanning */}
        {step === "scanning" && (
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            {imagePreview && <img src={imagePreview} alt="bundle" style={{ width: "100%", borderRadius: 12, marginBottom: 20, maxHeight: 260, objectFit: "cover" }} />}
            <div style={{ fontSize: 16, color: "#3B5FA0", fontWeight: 600 }}>Scanning your bundle…</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>AI is identifying each item 🌿</div>
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <div>
            {imagePreview && <img src={imagePreview} alt="bundle" style={{ width: "100%", borderRadius: 12, marginBottom: 16, maxHeight: 200, objectFit: "cover" }} />}
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Review scanned items ({scanned.length})</div>
            {scanned.map((item, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                <input value={item.description} onChange={e => setScanned(s => s.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} style={{ ...inputStyle, marginBottom: 4, padding: "6px 8px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input placeholder="Size" value={item.size} onChange={e => setScanned(s => s.map((x, j) => j === i ? { ...x, size: e.target.value } : x))} style={{ ...inputStyle, padding: "6px 8px", marginBottom: 0 }} />
                  <select value={item.condition} onChange={e => setScanned(s => s.map((x, j) => j === i ? { ...x, condition: e.target.value } : x))} style={{ ...inputStyle, padding: "6px 8px", marginBottom: 0 }}>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                </div>
              </div>
            ))}
            <button onClick={() => setScanned(s => [...s, { description: "", size: "", condition: "good" }])} style={{ width: "100%", padding: 10, background: "none", border: "1px dashed #ccc", borderRadius: 10, cursor: "pointer", color: "#888", marginBottom: 12 }}>+ Add item</button>
            <button onClick={() => setStep("details")} style={btnStyle("#3B5FA0")}>Continue →</button>
          </div>
        )}

        {/* Step: Details */}
        {step === "details" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{direction === "given" ? "Who are you giving to?" : "Who gave you this bundle?"}</div>
            <select value={otherFamily} onChange={e => setOtherFamily(e.target.value)} style={inputStyle}>
              <option value="">— {direction === "given" ? "Select family" : "Select or skip"} —</option>
              {families.filter(f => f.code !== family.code).map(f => (
                <option key={f.id} value={f.code}>{f.name} ({f.code})</option>
              ))}
            </select>

            {direction === "given" && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>Recall preference</div>
                {[{ value: "want_back", label: "🔄 I want these back" }, { value: "free_to_flow", label: "🌿 Free to flow" }].map(opt => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: recall === opt.value ? "#EEF2FA" : "#fff", border: `1px solid ${recall === opt.value ? "#3B5FA0" : "#e0dbd4"}`, borderRadius: 10, marginBottom: 8, cursor: "pointer" }}>
                    <input type="radio" name="recall" value={opt.value} checked={recall === opt.value} onChange={() => setRecall(opt.value)} />
                    <span style={{ fontSize: 14 }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            <button onClick={handleLogAll} disabled={saving} style={btnStyle(saving ? "#aaa" : "#3B5FA0")}>
              {uploading ? "Uploading photo…" : saving ? "Saving…" : `Log ${scanned.length} items`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Given Tab ─────────────────────────────────────────────────────────────────
function GivenTab({ items, families, onRefresh, showToast }: { items: Item[]; families: Family[]; onRefresh: () => void; showToast: (m: string) => void }) {
  async function markReturned(id: string) {
    await sb.from("items").update({ status: "returned", given_to: null }).eq("id", id);
    onRefresh();
    showToast("Marked as returned ✓");
  }
  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, marginBottom: 16 }}>Items You've Given</div>
      {items.length === 0 && <EmptyState icon="📤" msg="Nothing out on loan yet" />}
      {items.map(item => (
        <ItemCard key={item.id} item={item} families={families} onMarkReturned={() => markReturned(item.id)} showPhoto />
      ))}
    </div>
  );
}

// ── Received Tab ──────────────────────────────────────────────────────────────
function ReceivedTab({ items, families }: { items: Item[]; families: Family[] }) {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, marginBottom: 16 }}>Items You've Received</div>
      {items.length === 0 && <EmptyState icon="📥" msg="No received items yet" />}
      {items.map(item => <ItemCard key={item.id} item={item} families={families} showPhoto />)}
    </div>
  );
}

// ── Item Card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, families, onMarkReturned, showPhoto }: { item: Item; families: Family[]; onMarkReturned?: () => void; showPhoto?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const givenToFamily = families.find(f => f.code === item.given_to);
  const fromFamily = families.find(f => f.code === item.received_from);

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{item.description}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Size {item.size} · {item.condition}</div>
        </div>
        <StatusPill status={item.status} />
        <span style={{ color: "#aaa", fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid #f0ece6", padding: "12px 14px" }}>
          {showPhoto && item.bundle_photo_url && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Bundle photo</div>
              <img src={item.bundle_photo_url} alt="bundle" style={{ width: "100%", borderRadius: 8, maxHeight: 200, objectFit: "cover" }} />
            </div>
          )}
          {givenToFamily && <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>📤 Given to: <strong>{givenToFamily.name}</strong></div>}
          {fromFamily && <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>📥 From: <strong>{fromFamily.name}</strong></div>}
          {item.recall_preference && <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>{item.recall_preference === "want_back" ? "🔄 Want back" : "🌿 Free to flow"}</div>}
          {onMarkReturned && item.status.startsWith("out") && (
            <button onClick={onMarkReturned} style={{ ...btnStyle("#7A9E7E"), padding: "8px 14px", fontSize: 13 }}>Mark as returned</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── All Items Tab ─────────────────────────────────────────────────────────────
function AllItemsTab({ items, families, currentFamily, onRefresh, showToast }: { items: Item[]; families: Family[]; currentFamily: Family; onRefresh: () => void; showToast: (m: string) => void }) {
  const [filter, setFilter] = useState<"all" | "mine">("mine");
  const [sizeFilter, setSizeFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Item>>({});

  const displayed = items
    .filter(i => filter === "all" || i.owner_code === currentFamily.code)
    .filter(i => !sizeFilter || i.size === sizeFilter);

  const sizes = [...new Set(items.map(i => i.size).filter(Boolean))].sort();

  async function saveEdit(id: string) {
    await sb.from("items").update(editData).eq("id", id);
    setEditingId(null);
    onRefresh();
    showToast("Item updated ✓");
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    await sb.from("items").delete().eq("id", id);
    onRefresh();
    showToast("Item deleted");
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, marginBottom: 12 }}>All Items</div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {(["mine", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: filter === f ? "#3B5FA0" : "#e8e4de", color: filter === f ? "#fff" : "#555", fontSize: 13 }}>
            {f === "mine" ? "My items" : "Everyone"}
          </button>
        ))}
        <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid #e0dbd4", background: "#fff", fontSize: 13, color: "#555" }}>
          <option value="">All sizes</option>
          {sizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {displayed.length === 0 && <EmptyState icon="📋" msg="No items to show" />}

      {displayed.map(item => (
        <div key={item.id} style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
          {editingId === item.id ? (
            <div style={{ padding: "12px 14px" }}>
              <input value={editData.description ?? item.description} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))} style={inputStyle} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input placeholder="Size" value={editData.size ?? item.size} onChange={e => setEditData(d => ({ ...d, size: e.target.value }))} style={{ ...inputStyle, marginBottom: 0 }} />
                <select value={editData.condition ?? item.condition} onChange={e => setEditData(d => ({ ...d, condition: e.target.value }))} style={{ ...inputStyle, marginBottom: 0 }}>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => saveEdit(item.id)} style={{ ...btnStyle("#3B5FA0"), flex: 1, padding: "8px 0" }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{ ...btnStyle("#aaa"), flex: 1, padding: "8px 0" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              {item.bundle_photo_url && (
                <img src={item.bundle_photo_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>Size {item.size} · {item.condition} · <span style={{ fontFamily: "DM Mono, monospace" }}>{item.owner_code}</span></div>
              </div>
              <StatusPill status={item.status} />
              {item.owner_code === currentFamily.code && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setEditingId(item.id); setEditData({}); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>✏️</button>
                  <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>🗑️</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Community Tab ─────────────────────────────────────────────────────────────
function CommunityTab({ families, items, currentFamily }: { families: Family[]; items: Item[]; currentFamily: Family }) {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, marginBottom: 16 }}>The Loop Community</div>
      {families.filter(f => f.code !== currentFamily.code).map(f => {
        const theirItems = items.filter(i => i.owner_code === f.code && i.status === "available");
        return (
          <div key={f.id} style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <LogoMark code={f.code} size={32} />
              <div>
                <div style={{ fontWeight: 600, color: "#1a1a1a" }}>{f.name}</div>
                <div style={{ fontSize: 12, color: "#888", fontFamily: "DM Mono, monospace" }}>{f.code}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#555" }}>{theirItems.length} item{theirItems.length !== 1 ? "s" : ""} available</div>
          </div>
        );
      })}
      {families.length <= 1 && <EmptyState icon="🌿" msg="No other families in the loop yet" />}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa" }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{msg}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #e0dbd4", borderRadius: 10, fontSize: 14, fontFamily: "DM Sans, sans-serif", background: "#fff", boxSizing: "border-box", marginBottom: 10 };
function btnStyle(bg: string): React.CSSProperties { return { width: "100%", padding: "13px 0", background: bg, color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15, fontWeight: 600, fontFamily: "DM Sans, sans-serif" }; }