"use client";

import { useState, useRef, useEffect } from "react";
import KundliChart from "@/components/KundliChart";

export default function Home() {
  const [formData, setFormData] = useState({ name: "", dateOfBirth: "1995-10-15", timeOfBirth: "14:30", location: "", lat: "0", lon: "0" });
  const [kundliData, setKundliData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // View/Tab state
  const [currentTab, setCurrentTab] = useState("horoscope");
  
  // Location Search State
  const [locSearch, setLocSearch] = useState({ query: "", results: [], show: false });

  // Chat/Horoscope state
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleLocationSearch = async (query: string) => {
    setLocSearch(prev => ({ ...prev, query }));
    if (query.length < 3) {
        setLocSearch(prev => ({ ...prev, results: [], show: false }));
        return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setLocSearch(prev => ({ ...prev, results: data, show: true }));
    } catch (err) {
      console.error("Location search failed", err);
    }
  };

  const selectLocation = (loc: any) => {
    setFormData({ ...formData, location: loc.display_name, lat: loc.lat, lon: loc.lon });
    setLocSearch(prev => ({ ...prev, query: loc.display_name, show: false }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerateKundli = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lat || formData.lat === "0") {
      alert("Please select your birth location from the search dropdown.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/kundli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      
      if (result.success) {
        setKundliData(result.data);
        setMessages([{ role: 'model', content: `The cosmos has aligned for ${formData.name}. How can I assist you with your specific question?` }]);
        setCurrentTab("horoscope"); // Set Today's Forecast as the default view
      } else {
        alert("Error: " + result.error);
      }
    } catch (err: any) {
      alert("Failed to generate Kundli: " + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, overrideStr?: string) => {
    if (e) e.preventDefault();
    const userMsg = overrideStr || inputMessage;
    if (!userMsg.trim()) return;
    
    setInputMessage("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      const chatContext = [...messages, { role: 'user', content: userMsg }];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatContext, kundliContext: kundliData })
      });
      if (!res.ok) throw new Error("Chat failed.");
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let modelResponse = "";
      setMessages(prev => [...prev, { role: 'model', content: "" }]);

      while (reader && !done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        modelResponse += chunkValue;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = modelResponse;
          return newMessages;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: "The signals are weak. Retrying..." }]);
    }
    setIsChatLoading(false);
  };

  if (kundliData) {
    return (
      <main className="main-content" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
        
        {/* Navigation Bar */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', opacity: 0.7, marginBottom: '1.5rem' }}>Aura | {formData.name}</h2>
          <nav style={{ display: 'flex', justifyContent: 'center', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', maxWidth: '800px', margin: '0 auto' }}>
            <button onClick={() => setCurrentTab('horoscope')} className={currentTab === 'horoscope' ? 'nav-tab active-tab' : 'nav-tab'}>Today&apos;s Forecast</button>
            <button onClick={() => setCurrentTab('chat')} className={currentTab === 'chat' ? 'nav-tab active-tab' : 'nav-tab'}>Ask Aura</button>
            <button onClick={() => setCurrentTab('planets')} className={currentTab === 'planets' ? 'nav-tab active-tab' : 'nav-tab'}>Planet Details</button>
            <button onClick={() => setCurrentTab('chart')} className={currentTab === 'chart' ? 'nav-tab active-tab' : 'nav-tab'}>Birth Chart</button>
          </nav>
        </div>

        <div style={{ flex: 1, width: '100%', maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Chart Page */}
          {currentTab === 'chart' && (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem' }}>
              <h3 style={{ color: 'var(--color-secondary-accent)', marginBottom: '1.5rem' }}>Your Celestial Map</h3>
              <KundliChart planets={kundliData.planets} />
              <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Sun Position</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>{kundliData.planets.Sun?.house}th House</div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Moon Position</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>{kundliData.planets.Moon?.house}th House</div>
                </div>
              </div>
            </div>
          )}

          {/* Planetary Details Page */}
          {currentTab === 'planets' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Planetary Geometry</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ textAlign: 'left', padding: '1rem' }}>Body</th>
                      <th style={{ textAlign: 'center', padding: '1rem' }}>House</th>
                      <th style={{ textAlign: 'right', padding: '1rem' }}>Degrees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(kundliData.planets).map(([name, data]: [string, any]) => (
                      <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem' }}>{name} ({data.symbol})</td>
                        <td style={{ textAlign: 'center', padding: '1rem' }}>{data.house}</td>
                        <td style={{ textAlign: 'right', padding: '1rem' }}>{data.degree}°</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Today's Forecast Page */}
          {currentTab === 'horoscope' && (
            <div className="glass-panel" style={{ padding: '2rem', minHeight: '400px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Today&apos;s Forecast</h3>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--color-border)', lineHeight: '1.7' }}>
                <p style={{ opacity: 0.8 }}>Current planetary transits are influencing your birth placements. Based on today&apos;s celestial alignment, your primary focus is on your {kundliData.planets.Sun?.house}th House.</p>
                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1, padding: '1rem', background: 'rgba(139,92,246,0.05)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.1)' }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Current Flow</span><br/><b>Growth & Awakening</b>
                    </div>
                </div>
                <button onClick={() => { setCurrentTab('chat'); handleSendMessage(undefined, "Give me a detailed horoscope report for today based on my chart.")}} className="btn-primary" style={{ marginTop: '2rem', width: '100%' }}>Get Detailed AI Reading</button>
              </div>
            </div>
          )}

          {/* AI Chat Page */}
          {currentTab === 'chat' && (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Aura Chat</h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {messages.map((m, idx) => (
                  <div key={idx} style={{ 
                    padding: '1rem', 
                    background: m.role === 'user' ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)', 
                    borderRadius: '12px', 
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', 
                    maxWidth: '80%',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>{m.content}</div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={e => handleSendMessage(e)} style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <input type="text" className="form-input" value={inputMessage} onChange={e => setInputMessage(e.target.value)} disabled={isChatLoading} style={{ flex: 1 }} placeholder="Ask destiny..." />
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 1.5rem' }} disabled={isChatLoading || !inputMessage.trim()}>Send</button>
              </form>
            </div>
          )}

          <button onClick={() => setKundliData(null)} style={{ marginTop: '2rem', width: '100%', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', opacity: 0.5 }} className="btn-primary">Back to Start</button>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Aura</h1>
        <p style={{ opacity: 0.6 }}>Unlock the mysteries of your soul through the stars.</p>
      </div>

      <div className="glass-panel" style={{ maxWidth: '500px', width: '100%' }}>
        <form onSubmit={handleGenerateKundli} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ width: '100%' }}>
            <h4 style={{ marginBottom: '1.5rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem' }}>Identity Details</h4>
            <div className="form-group"><label>Full Name</label><input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} required /></div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}><label>Birth Date</label><input type="date" name="dateOfBirth" className="form-input" value={formData.dateOfBirth} onChange={handleChange} required /></div>
              <div className="form-group" style={{ flex: 1 }}><label>Birth Time</label><input type="time" name="timeOfBirth" className="form-input" value={formData.timeOfBirth} onChange={handleChange} required /></div>
            </div>
            <div className="form-group" style={{ position: 'relative', marginTop: '1rem' }}>
              <label>Birth Location</label>
              <input type="text" className="form-input" value={locSearch.query} onChange={(e) => handleLocationSearch(e.target.value)} placeholder="Search City..." autoComplete="off" required />
              {locSearch.show && (
                <div className="dropdown-panel">
                  {locSearch.results.map((loc: any, i) => (
                    <div key={i} onClick={() => selectLocation(loc)} className="dropdown-item">{loc.display_name}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>{loading ? 'Consulting Stars...' : 'Generate Reading'}</button>
        </form>
      </div>
    </main>
  );
}
