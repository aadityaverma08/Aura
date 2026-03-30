"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import KundliChart from "@/components/KundliChart";
import StarCanvas from "@/components/StarCanvas";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ── Types ────────────────────────────────────────────────────────────────────
type FormData = { name: string; dateOfBirth: string; timeOfBirth: string; location: string; lat: string; lon: string; };
type Message  = { role: "user" | "model"; content: string };
type LocState = { query: string; results: any[]; show: boolean };

// ── Constants ─────────────────────────────────────────────────────────────────
const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿",
  Jupiter: "♃", Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};

const ELEMENT_COLORS: Record<string, string> = {
  Fire: "#ef4444", Earth: "#84cc16", Air: "#60a5fa", Water: "#06b6d4",
};

const TABS = [
  { id: "horoscope", label: "Today" },
  { id: "decision",  label: "Decision Maker" },
  { id: "chat",      label: "Ask Aura" },
  { id: "compatibility", label: "Compatibility" },
  { id: "timeline",  label: "Timeline" },
  { id: "remedies",  label: "Remedies" },
  { id: "planets",   label: "Planets" },
  { id: "chart",     label: "Chart" },
];

const SUGGESTIONS = [
  "What does my Moon sign reveal about me?",
  "Which career path suits my chart?",
  "Tell me about my love life & relationships.",
  "What are my strengths and weaknesses?",
  "What does my current Dasha mean?",
];

// ── Moon Phase Utility ────────────────────────────────────────────────────────
function getMoonPhase() {
  const knownNew = new Date("2024-01-11T11:57:00Z");
  const CYCLE    = 29.530588853;
  const days     = (Date.now() - knownNew.getTime()) / 864e5;
  const phase    = ((days % CYCLE) + CYCLE) % CYCLE;
  if (phase < 1.85)  return { name: "New Moon",        emoji: "🌑" };
  if (phase < 7.38)  return { name: "Waxing Crescent", emoji: "🌒" };
  if (phase < 9.22)  return { name: "First Quarter",   emoji: "🌓" };
  if (phase < 14.77) return { name: "Waxing Gibbous",  emoji: "🌔" };
  if (phase < 16.61) return { name: "Full Moon",        emoji: "🌕" };
  if (phase < 22.15) return { name: "Waning Gibbous",  emoji: "🌖" };
  if (phase < 23.99) return { name: "Last Quarter",    emoji: "🌗" };
  return               { name: "Waning Crescent",      emoji: "🌘" };
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
const AstroLoader = ({ msg = "Consulting the Cosmos..." }: { msg?: string }) => {
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      const now = ctx.currentTime;

      // ── Shankh (Conch Shell) Synthesis ────────────────────────────────────
      // Master output
      const master = ctx.createGain();
      master.connect(ctx.destination);

      // Bandpass filter — gives the "horn mouth" resonance of a conch shell
      const bpFilter = ctx.createBiquadFilter();
      bpFilter.type = "bandpass";
      bpFilter.frequency.value = 900;
      bpFilter.Q.value = 0.6;
      bpFilter.connect(master);

      // Delay for cave-like reverb tail
      const delay = ctx.createDelay(0.6);
      delay.delayTime.value = 0.45;
      const delayGain = ctx.createGain();
      delayGain.gain.value = 0.3;
      delay.connect(delayGain);
      delayGain.connect(master);

      // Shankh harmonic layers (sawtooth = bright & brassy like a conch)
      const harmonics = [
        { freq: 233,  vol: 0.55 },   // fundamental (Bb3)
        { freq: 466,  vol: 0.30 },   // octave
        { freq: 699,  vol: 0.18 },   // 5th harmonic
        { freq: 932,  vol: 0.10 },   // 4th harmonic
        { freq: 1165, vol: 0.05 },   // brightness
      ];

      harmonics.forEach(({ freq, vol }) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth"; // bright, brassy timbre
        // Pitch starts slightly sharp then drops — classic shankh "wail"
        osc.frequency.setValueAtTime(freq * 1.08, now);
        osc.frequency.linearRampToValueAtTime(freq * 0.97, now + 0.6);
        osc.frequency.linearRampToValueAtTime(freq,        now + 1.4);

        // Fast attack → hold → exponential decay (like a blown conch)
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.04);  // sharp attack
        gain.gain.setValueAtTime(vol,          now + 0.4);   // hold
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5); // long decay

        osc.connect(gain);
        gain.connect(bpFilter);
        gain.connect(delay);
        osc.start(now);
        osc.stop(now + 3.6);
      });

      // Cleanup: close context after sound ends
      setTimeout(() => { try { ctx.close(); } catch {} }, 4000);
    } catch {
      // Browser doesn't support Web Audio — fail silently
    }
  }, []);

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div className="astro-loader-container">
        <div className="astro-ring ring-1"></div>
        <div className="astro-ring ring-2"></div>
        <div className="astro-ring ring-3"></div>
        <div className="astro-core"></div>
      </div>
      <div className="loader-msg">{msg}</div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    name: "", dateOfBirth: "1995-10-15", timeOfBirth: "14:30", location: "", lat: "0", lon: "0",
  });
  const [kundliData,  setKundliData]  = useState<any>(null);
  const [loading,     setLoading]     = useState(false);
  const [currentTab,  setCurrentTab]  = useState("horoscope");
  const [locSearch,   setLocSearch]   = useState<LocState>({ query: "", results: [], show: false });
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [inputMsg,    setInputMsg]    = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChips,   setShowChips]   = useState(true);
  const [savedSession, setSavedSession] = useState<{ kundliData: any; formData: FormData } | null>(null);
  
  // AI Feature State
  const [aiResponses, setAiResponses] = useState<Record<string, string>>({});
  const [loadingModes, setLoadingModes] = useState<Record<string, boolean>>({});
  const [decisionQuestion, setDecisionQuestion] = useState("");
  
  // Compatibility State
  const [partnerData, setPartnerData] = useState<FormData>({ name: "", dateOfBirth: "", timeOfBirth: "", location: "", lat: "0", lon: "0" });
  const [partnerLocSearch, setPartnerLocSearch] = useState<LocState>({ query: "", results: [], show: false });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load saved session from localStorage
  useEffect(() => {
    try {
      const k = localStorage.getItem("aura_kundli");
      const f = localStorage.getItem("aura_form");
      if (k && f) setSavedSession({ kundliData: JSON.parse(k), formData: JSON.parse(f) });
    } catch {}
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Current dasha
  const currentDasha = useMemo(() => {
    if (!kundliData?.dasha) return null;
    const now = new Date();
    return kundliData.dasha.find((d: any) => new Date(d.start) <= now && new Date(d.end) >= now) || kundliData.dasha[0];
  }, [kundliData]);

  const moonPhase = useMemo(() => getMoonPhase(), []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLocationSearch = async (query: string, isPartner = false) => {
    const setState = isPartner ? setPartnerLocSearch : setLocSearch;
    setState(p => ({ ...p, query }));
    if (query.length < 3) { setState(p => ({ ...p, results: [], show: false })); return; }
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setState(p => ({ ...p, results: data, show: true }));
    } catch {}
  };

  const selectLocation = (loc: any, isPartner = false) => {
    if (isPartner) {
      setPartnerData(f => ({ ...f, location: loc.display_name, lat: loc.lat, lon: loc.lon }));
      setPartnerLocSearch(p => ({ ...p, query: loc.display_name, show: false }));
    } else {
      setFormData(f => ({ ...f, location: loc.display_name, lat: loc.lat, lon: loc.lon }));
      setLocSearch(p => ({ ...p, query: loc.display_name, show: false }));
    }
  };

  const handleGenerateKundli = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lat || formData.lat === "0") {
      alert("Please select your birth location from the search dropdown.");
      return;
    }
    setLoading(true);
    try {
      const res    = await fetch("/api/kundli", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const result = await res.json();
      if (result.success) {
        setKundliData(result.data);
        setMessages([{ role: "model", content: `The cosmos has aligned for ${formData.name}. ✨ I can see your chart clearly — ask me anything about your destiny, career, love, or health.` }]);
        setShowChips(true);
        setCurrentTab("horoscope");
        localStorage.setItem("aura_kundli", JSON.stringify(result.data));
        localStorage.setItem("aura_form",   JSON.stringify(formData));
        setSavedSession({ kundliData: result.data, formData });
        fetchAiFeature('daily', undefined, undefined, result.data);
      } else {
        alert("Error: " + result.error);
      }
    } catch (err: any) {
      alert("Failed to generate Kundli: " + err.message);
    }
    setLoading(false);
  };

  const loadSavedSession = () => {
    if (!savedSession) return;
    setKundliData(savedSession.kundliData);
    setFormData(savedSession.formData);
    setMessages([{ role: "model", content: `Welcome back, ${savedSession.formData.name}! 🌙 The stars remember you. What would you like to explore today?` }]);
    setShowChips(true);
    setCurrentTab("horoscope");
    fetchAiFeature('daily', undefined, undefined, savedSession.kundliData);
  };

  const handleSendMessage = async (e?: React.FormEvent, override?: string) => {
    if (e) e.preventDefault();
    const userMsg = override || inputMsg;
    if (!userMsg.trim()) return;
    setInputMsg("");
    setShowChips(false);
    const updated: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(updated);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, kundliContext: kundliData }),
      });
      if (!res.ok) throw new Error("Chat failed.");
      const reader  = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false, modelResponse = "";
      setMessages(p => [...p, { role: "model", content: "" }]);
      while (reader && !done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        modelResponse += decoder.decode(value, { stream: true });
        setMessages(p => { const n = [...p]; n[n.length - 1] = { role: "model", content: modelResponse }; return n; });
      }
    } catch {
      setMessages(p => [...p, { role: "model", content: "The signals are temporarily disrupted. Please try again." }]);
    }
    setChatLoading(false);
  };

  const fetchAiFeature = async (mode: string, partnerParams?: any, decisionQuery?: string, overrideContext?: any) => {
    setLoadingModes(p => ({ ...p, [mode]: true }));
    setAiResponses(p => ({ ...p, [mode]: "" }));
    try {
      const initialMessage = decisionQuery || 
                             (mode === 'timeline' ? "Generate my life timeline." :
                              mode === 'career' ? "Give me career and finance predictions." :
                              mode === 'remedies' ? "Provide astrological remedies." :
                              mode === 'compatibility' ? "Analyze our compatibility." :
                              mode === 'daily' ? "Give me my daily horoscope with luck scores." : "Read my chart.");
      
      const payload: any = { messages: [{ role: "user", content: initialMessage }], kundliContext: overrideContext || kundliData, mode };
      if (partnerParams) payload.partnerKundli = partnerParams;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false, modelResponse = "";
      while (reader && !done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        modelResponse += decoder.decode(value, { stream: true });
        setAiResponses(p => ({ ...p, [mode]: modelResponse }));
      }
    } catch {
      setAiResponses(p => ({ ...p, [mode]: "Error consulting the stars. Please try again." }));
    }
    setLoadingModes(p => ({ ...p, [mode]: false }));
  };

  const handleCompatibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerData.lat || partnerData.lat === "0") { alert("Select partner's location."); return; }
    setLoadingModes(p => ({ ...p, compatibility: true }));
    try {
      const kRes = await fetch("/api/kundli", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(partnerData) });
      const kData = await kRes.json();
      if (!kData.success) throw new Error(kData.error);
      await fetchAiFeature('compatibility', kData.data);
    } catch (err: any) {
      alert("Failed to calculate compatibility: " + err.message);
      setLoadingModes(p => ({ ...p, compatibility: false }));
    }
  };

  const handleDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionQuestion.trim()) return;
    fetchAiFeature('decision', null, decisionQuestion);
  };

  // ── Render: Main App ────────────────────────────────────────────────────────
  if (kundliData) {
    const sun  = kundliData.planets.Sun;
    const moon = kundliData.planets.Moon;

    return (
      <>
        <StarCanvas />
        <main className="app-main" style={{ position: "relative", zIndex: 1 }}>

          {/* Profile Banner */}
          <div className="profile-banner">
            <div className="profile-info">
              <div className="profile-name">{formData.name}</div>
              <div className="profile-signs">
                <span style={{ color: ELEMENT_COLORS[sun?.element] }}>☉ {sun?.rashi}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ color: ELEMENT_COLORS[moon?.element] }}>☽ {moon?.rashi}</span>
                {currentDasha && <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ color: "var(--color-secondary-accent)" }}>
                    {PLANET_GLYPHS[currentDasha.planet]} {currentDasha.planet} Dasha
                  </span>
                </>}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button className="btn-ghost" onClick={() => setKundliData(null)}>← New Chart</button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="tab-nav">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setCurrentTab(t.id)}
                className={`nav-tab ${currentTab === t.id ? "active-tab" : ""}`}>
                {t.label}
              </button>
            ))}
          </nav>

          <div className="tab-content" style={{ overflowY: "auto", flex: 1, paddingBottom: "2rem" }}>

            {/* TODAY'S FORECAST */}
            {currentTab === "horoscope" && (
              <div className="glass-panel fade-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                  <h3 style={{ margin: 0 }}>Today&apos;s Forecast</h3>
                  <div className="moon-phase-badge">{moonPhase.emoji} {moonPhase.name}</div>
                </div>

                  <div className="markdown-body chat-bubble model" style={{ borderRadius: "12px", width: "100%", whiteSpace: "pre-wrap", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {loadingModes['daily'] && !aiResponses['daily'] ? (
                      <AstroLoader msg="Reading today's stars..." />
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponses['daily']}</ReactMarkdown>
                    )}
                  </div>
              </div>
            )}

            {/* AI CHAT */}
            {currentTab === "chat" && (
              <div className="glass-panel fade-in" style={{ display: "flex", flexDirection: "column", height: "65vh" }}>
                <h3 style={{ marginBottom: "1rem", flexShrink: 0 }}>Ask Aura</h3>
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                  {messages.map((m, i) => (
                    <div key={i} className={`chat-bubble ${m.role}`}>
                      {m.role === "model" && <span className="bubble-icon">✦</span>}
                      <div className="markdown-body" style={{ flex: 1, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                        {m.content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown> : <AstroLoader msg="Aura is thinking..." />}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {showChips && messages.length <= 1 && (
                  <div className="suggestion-chips">
                    {SUGGESTIONS.map(q => (
                      <button key={q} className="chip" onClick={() => handleSendMessage(undefined, q)}>{q}</button>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="chat-form">
                  <input type="text" className="form-input" value={inputMsg}
                    onChange={e => setInputMsg(e.target.value)} disabled={chatLoading}
                    placeholder="Ask destiny..." style={{ flex: 1 }} />
                  <button type="submit" className="btn-primary"
                    style={{ width: "auto", padding: "0 1.5rem" }}
                    disabled={chatLoading || !inputMsg.trim()}>
                    {chatLoading ? "…" : "Send"}
                  </button>
                </form>
              </div>
            )}

            {/* GENERIC AI FEATURE TABS (Timeline, Career, Remedies) */}
            {['timeline', 'career', 'remedies'].includes(currentTab) && (
              <div className="glass-panel fade-in">
                <h3 style={{ marginBottom: "1.5rem" }}>{TABS.find(t => t.id === currentTab)?.label}</h3>
                
                {!aiResponses[currentTab] && !loadingModes[currentTab] && (
                  <button className="btn-primary" onClick={() => fetchAiFeature(currentTab)}>
                    ✨ Extract {TABS.find(t => t.id === currentTab)?.label} Insights
                  </button>
                )}

                {(loadingModes[currentTab] || aiResponses[currentTab]) && (
                  <div className="markdown-body" style={{ background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {loadingModes[currentTab] && !aiResponses[currentTab] ? (
                       <AstroLoader msg={`Analyzing ${currentTab}...`} />
                    ) : (
                       <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponses[currentTab]}</ReactMarkdown>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* DECISION MAKER */}
            {currentTab === "decision" && (
              <div className="glass-panel fade-in">
                <h3 style={{ marginBottom: "0.5rem" }}>Decision Maker Mode</h3>
                <p style={{ fontSize: "0.85rem", opacity: 0.7, marginBottom: "2rem" }}>Ask a specific YES/NO question, and Aura will consult your chart to calculate the probability of success.</p>
                
                <form onSubmit={handleDecision} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
                  <input type="text" className="form-input" value={decisionQuestion}
                    onChange={e => setDecisionQuestion(e.target.value)} disabled={loadingModes['decision']}
                    placeholder="E.g., Should I switch my job this month?" style={{ flex: 1, minWidth: "250px" }} />
                  <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={loadingModes['decision'] || !decisionQuestion.trim()}>
                    {loadingModes['decision'] ? "Calculating..." : "Consult"}
                  </button>
                </form>
                
                {(loadingModes['decision'] || aiResponses['decision']) && (
                  <div className="markdown-body" style={{ background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {loadingModes['decision'] && !aiResponses['decision'] ? (
                      <AstroLoader msg="Weighing the probabilities..." />
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponses['decision']}</ReactMarkdown>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* COMPATIBILITY */}
            {currentTab === "compatibility" && (
              <div className="glass-panel fade-in">
                <h3 style={{ marginBottom: "0.5rem" }}>Love & Compatibility Analysis</h3>
                <p style={{ fontSize: "0.85rem", opacity: 0.7, marginBottom: "2rem" }}>Enter the birth details of your partner to evaluate relationship harmony, longevity, and key dynamics.</p>
                
                {!aiResponses['compatibility'] && !loadingModes['compatibility'] && (
                  <form onSubmit={handleCompatibility} style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "12px" }}>
                    <div className="form-group">
                      <label>Partner's Name</label>
                      <input type="text" className="form-input" required value={partnerData.name} onChange={e => setPartnerData(f => ({...f, name: e.target.value}))} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input type="date" className="form-input" required value={partnerData.dateOfBirth} onChange={e => setPartnerData(f => ({...f, dateOfBirth: e.target.value}))}/>
                      </div>
                      <div className="form-group">
                        <label>Time of Birth</label>
                        <input type="time" className="form-input" required value={partnerData.timeOfBirth} onChange={e => setPartnerData(f => ({...f, timeOfBirth: e.target.value}))}/>
                      </div>
                    </div>
                    <div className="form-group" style={{ position: "relative" }}>
                      <label>Birth Location</label>
                      <input type="text" className="form-input" value={partnerLocSearch.query} onChange={e => handleLocationSearch(e.target.value, true)} placeholder="Search city…" autoComplete="off" required />
                      {partnerLocSearch.show && (
                        <div className="dropdown-panel">
                          {partnerLocSearch.results.map((loc: any, i: number) => (
                             <div key={i} className="dropdown-item" onClick={() => selectLocation(loc, true)}>{loc.display_name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="submit" className="btn-primary" style={{ marginTop: "1rem" }} disabled={loadingModes['compatibility']}>
                      Match Charts ✨
                    </button>
                  </form>
                )}
                
                {(loadingModes['compatibility'] || aiResponses['compatibility']) && (
                  <div className="markdown-body" style={{ background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {loadingModes['compatibility'] && !aiResponses['compatibility'] ? (
                       <AstroLoader msg="Calculating compatibility..." />
                    ) : (
                       <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponses['compatibility']}</ReactMarkdown>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PANCHANG */}
            {currentTab === "panchang" && (
              <div className="glass-panel fade-in">
                <h3 style={{ marginBottom: "0.5rem", textAlign: "center" }}>Panchang at Birth</h3>
                <p style={{ textAlign: "center", fontSize: "0.8rem", marginBottom: "2rem" }}>
                  {formData.dateOfBirth} · {formData.timeOfBirth} · {formData.location}
                </p>
                <div className="panchang-grid">
                  {[
                    { label: "Tithi",       val: kundliData.panchang.tithi,     sub: "Lunar Day",          icon: "🌕" },
                    { label: "Nakshatra",   val: kundliData.panchang.nakshatra, sub: `Pada ${kundliData.panchang.nakshatraPada}`, icon: "⭐" },
                    { label: "Yoga",        val: kundliData.panchang.yoga,      sub: "Sun+Moon combination",icon: "☯️" },
                    { label: "Karana",      val: kundliData.panchang.karana,    sub: "Half Tithi",          icon: "🔮" },
                    { label: "Moon Sign",   val: moon?.rashi,                   sub: moon?.element,         icon: "☽" },
                    { label: "Sun Sign",    val: sun?.rashi,                    sub: sun?.element,          icon: "☉" },
                  ].map(item => (
                    <div key={item.label} className="panchang-card">
                      <div className="panchang-icon">{item.icon}</div>
                      <div className="panchang-label">{item.label}</div>
                      <div className="panchang-val">{item.val}</div>
                      <div className="panchang-sub">{item.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DASHA */}
            {currentTab === "dasha" && (
              <div className="glass-panel fade-in">
                <h3 style={{ marginBottom: "0.5rem", textAlign: "center" }}>Vimsottari Dasha Timeline</h3>
                <p style={{ textAlign: "center", fontSize: "0.8rem", marginBottom: "2rem" }}>120-year planetary period cycle based on Moon Nakshatra</p>
                <div className="dasha-list">
                  {kundliData.dasha.map((d: any, i: number) => {
                    const now       = new Date();
                    const start     = new Date(d.start);
                    const end       = new Date(d.end);
                    const isActive  = start <= now && end >= now;
                    const isPast    = end < now;
                    return (
                      <div key={i} className={`dasha-item ${isActive ? "dasha-active" : ""} ${isPast ? "dasha-past" : ""}`}>
                        <div className="dasha-glyph">{PLANET_GLYPHS[d.planet] || d.planet[0]}</div>
                        <div className="dasha-body">
                          <div className="dasha-planet">{d.planet} Mahadasha</div>
                          <div className="dasha-dates">{start.getFullYear()} — {end.getFullYear()}</div>
                        </div>
                        <div className="dasha-years">{d.years} yrs</div>
                        {isActive && <div className="dasha-now-badge">NOW</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PLANETS */}
            {currentTab === "planets" && (
              <div className="glass-panel fade-in">
                <h3 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Planetary Positions</h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="planets-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Planet</th>
                        <th>Rashi</th>
                        <th>House</th>
                        <th>Element</th>
                        <th>Degree</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(kundliData.planets).map(([name, p]: [string, any]) => (
                        <tr key={name}>
                          <td>
                            <span style={{ marginRight: "0.5rem", fontSize: "1rem" }}>{PLANET_GLYPHS[name]}</span>
                            {name}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {p.rashiSymbol} {p.rashi}
                          </td>
                          <td style={{ textAlign: "center", color: "var(--color-accent)" }}>{p.house}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className="element-badge" style={{ background: ELEMENT_COLORS[p.element] + "25", color: ELEMENT_COLORS[p.element], border: `1px solid ${ELEMENT_COLORS[p.element]}44` }}>
                              {p.element}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", opacity: 0.7 }}>{p.degree}°</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CHART VIEW */}
            {currentTab === "chart" && (
               <div className="glass-panel fade-in" style={{ textAlign: "center" }}>
                 <h3 style={{ marginBottom: "0.5rem" }}>Your Celestial Map</h3>
                 <p style={{ fontSize: "0.8rem", marginBottom: "1.5rem" }}>Hover over a planet glyph to see its placement details</p>
                 <KundliChart planets={kundliData.planets} />
               </div>
            )}

          </div>
        </main>
      </>
    );
  }

  // ── Render: Landing Page ────────────────────────────────────────────────────
  return (
    <>
      <StarCanvas />
      <main className="main-content" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1>Aura</h1>
          <p>Unlock the mysteries of your soul through the stars.</p>
        </div>

        {savedSession && (
          <div className="resume-banner">
            <div>
              <div style={{ fontWeight: 600 }}>Welcome back, {savedSession.formData.name} ✨</div>
              <div style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: "0.2rem" }}>Your last reading is saved</div>
            </div>
            <button className="btn-resume" onClick={loadSavedSession}>Resume →</button>
          </div>
        )}

        <div className="glass-panel" style={{ maxWidth: "480px", width: "100%" }}>
          <form onSubmit={handleGenerateKundli} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h4 style={{ opacity: 0.7, textTransform: "uppercase", letterSpacing: "1.5px", fontSize: "0.75rem" }}>Birth Details</h4>

            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" className="form-input" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Arjun Sharma" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Birth Date</label>
                <input type="date" name="dateOfBirth" className="form-input" value={formData.dateOfBirth} onChange={e => setFormData(f => ({ ...f, dateOfBirth: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Birth Time</label>
                <input type="time" name="timeOfBirth" className="form-input" value={formData.timeOfBirth} onChange={e => setFormData(f => ({ ...f, timeOfBirth: e.target.value }))} required />
              </div>
            </div>

            <div className="form-group" style={{ position: "relative" }}>
              <label>Birth Location</label>
              <input type="text" className="form-input" value={locSearch.query}
                onChange={e => handleLocationSearch(e.target.value, false)}
                placeholder="Search city…" autoComplete="off" required />
              {locSearch.show && (
                <div className="dropdown-panel">
                  {locSearch.results.map((loc: any, i: number) => (
                    <div key={i} className="dropdown-item" onClick={() => selectLocation(loc, false)}>
                      {loc.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <AstroLoader msg="Aligning the stars..." />
            ) : (
              <button type="submit" className="btn-primary">
                ✨ Generate My Kundli
              </button>
            )}
          </form>
        </div>
      </main>
    </>
  );
}
