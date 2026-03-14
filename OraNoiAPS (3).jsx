import { useState, useRef, useEffect } from "react";

const COLORS = {
  navy: "#1a3a5c",
  navyLight: "#234b75",
  teal: "#0e8a7a",
  tealLight: "#12a896",
  amber: "#e8921a",
  cream: "#faf8f4",
  stone: "#f0ece4",
  muted: "#8a9bb0",
  danger: "#c0392b",
  warning: "#e67e22",
  success: "#27ae60",
};

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const MOCK_USERS = {
  admin: { id: "admin", name: "Mario Rossi", role: "admin", email: "mario@oranoiaps.it", password: "admin123" },
  socio1: { id: "s1", name: "Giulia Bianchi", role: "socio", email: "giulia@email.it", password: "pass123", quotaPagata: true, scadenza: "2026-12-31", familiare: "Lorenzo, 8 anni, autismo" },
  socio2: { id: "s2", name: "Franco Melis", role: "socio", email: "franco@email.it", password: "pass123", quotaPagata: false, scadenza: "2025-12-31", familiare: "Anna, 45 anni, SLA", sospeso: true },
};

const MOCK_SOCI = [
  { id: "s1", nome: "Giulia Bianchi", email: "giulia@email.it", familiare: "Lorenzo, 8 anni, autismo", quota: true, scadenza: "2026-12-31", sospeso: false, iscritto: "2024-03-15" },
  { id: "s2", nome: "Franco Melis", email: "franco@email.it", familiare: "Anna, 45 anni, SLA", quota: false, scadenza: "2025-12-31", sospeso: true, iscritto: "2023-06-20" },
  { id: "s3", nome: "Carla Pinna", email: "carla@email.it", familiare: "Marco, 12 anni, down", quota: true, scadenza: "2026-09-30", sospeso: false, iscritto: "2024-01-10" },
  { id: "s4", nome: "Roberto Serra", email: "roberto@email.it", familiare: "Piera, 70 anni, Alzheimer", quota: true, scadenza: "2026-11-15", sospeso: false, iscritto: "2023-11-05" },
];

const MOCK_VOLONTARI = [
  { id: "v1", nome: "Lucia Cao", attivita: "Sportello ascolto", ore: 24, presenze: 12 },
  { id: "v2", nome: "Stefano Mura", attivita: "Trasporti", ore: 18, presenze: 9 },
  { id: "v3", nome: "Maria Deidda", attivita: "Amministrazione", ore: 30, presenze: 15 },
];

const MOCK_CONTABILITA = [
  { id: 1, data: "2026-01-10", tipo: "entrata", desc: "Quote associative gennaio", importo: 240 },
  { id: 2, data: "2026-01-15", tipo: "uscita", desc: "Cancelleria segreteria", importo: 45 },
  { id: 3, data: "2026-02-01", tipo: "entrata", desc: "Contributo Comune Cagliari", importo: 500 },
  { id: 4, data: "2026-02-20", tipo: "uscita", desc: "Rimborso spese volontario", importo: 30 },
  { id: 5, data: "2026-03-01", tipo: "entrata", desc: "Quote associative marzo", importo: 180 },
];

// ─── CLAUDE API ──────────────────────────────────────────────────────────────
async function askClaude(messages, systemPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages,
    }),
  });
  const data = await response.json();
  return data.content?.map(b => b.text || "").filter(Boolean).join("") || "Errore nella risposta.";
}

const SYSTEM_SOCI = `Sei "Assistente Ora Noi", il tuttofare digitale personale dei soci di Ora Noi APS, associazione sarda che tutela le famiglie caregiver di persone con disabilita in Sardegna.

Il tuo obiettivo e essere come un figlio paziente e competente sempre disponibile: guidi la persona passo passo, in linguaggio semplice, senza gergo tecnico o burocratico. Rispondi sempre in italiano. Tono caldo, umano, concreto. Se una persona e anziana o poco pratica di tecnologia, adatta il linguaggio di conseguenza.

SUPPORTO DIGITALE: Come fare lo SPID passo per passo, usare la CIE, aprire una PEC, usare email e allegati, accedere a siti istituzionali INPS Regione Comune, usare smartphone e PC per pratiche burocratiche.

DIRITTI CAREGIVER: L.R. Sardegna 12/2023, Fondo Nazionale Caregiver, indennita di accompagnamento, assegno di cura, riconoscimento caregiver familiare, L.104/92 permessi lavorativi, invalidita civile.

SEGRETARIO PERSONALE: Scrivi domande lettere ricorsi per conto del socio, aiuta a compilare moduli INPS ASL Comune, spiega comunicazioni e provvedimenti ricevuti, redigi richieste a enti pubblici.

ORIENTAMENTO SANITARIO: Farmaci terapie LEA, prenotazione visite specialistiche, assistenza domiciliare, piani terapeutici, servizi ASL Sassari e Sardegna.

Guida sempre passo per passo. Chiedi sempre se la persona ha capito. Queste famiglie vivono situazioni molto difficili: ogni risposta deve farle sentire meno sole.`;

const SYSTEM_SEGRETERIA = `Sei il segretario virtuale di Ora Noi APS, associazione sarda che tutela le famiglie caregiver di persone con disabilità in Sardegna. Il presidente si chiama Mario.

Aiuti la segreteria a redigere documenti, lettere formali, PEC, comunicati. Conosci lo stile istituzionale dell'associazione: formale, diretto, fondato su riferimenti normativi precisi.

Sei esperto in:
- Redazione di PEC e lettere ufficiali
- Comunicazioni a Regione Sardegna, INPS, Ministeri
- Comunicati stampa associativi
- Verbali di assemblea e riunioni
- Ricerca normativa (L.R. 12/2023, Fondo Nazionale Caregiver, D.Lgs 117/2017 CTS)

Quando redigi un documento, includi sempre: oggetto chiaro, riferimenti normativi pertinenti, tono formale ma assertivo. Chiedi sempre i dettagli necessari se mancano.`;

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Badge({ status }) {
  const map = {
    attivo: { label: "Attivo", bg: "#d5f5e3", color: "#1e8449" },
    scadenza: { label: "In scadenza", bg: "#fef9e7", color: "#b7950b" },
    sospeso: { label: "Sospeso", bg: "#fdecea", color: "#c0392b" },
  };
  const s = map[status] || map.attivo;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function getSocioStatus(s) {
  if (s.sospeso) return "sospeso";
  const today = new Date();
  const scad = new Date(s.scadenza);
  const diff = (scad - today) / (1000 * 60 * 60 * 24);
  if (diff < 30) return "scadenza";
  return "attivo";
}

// ─── CHAT COMPONENT ──────────────────────────────────────────────────────────
function Chat({ systemPrompt, placeholder, accentColor }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const reply = await askClaude(newMsgs, systemPrompt);
      setMessages([...newMsgs, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: "Si è verificato un errore. Riprova tra poco." }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 420 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: COLORS.muted, marginTop: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 14 }}>{placeholder}</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%",
              padding: "10px 14px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user" ? accentColor : "white",
              color: m.role === "user" ? "white" : "#1a1a2e",
              fontSize: 14,
              lineHeight: 1.6,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", background: accentColor,
                  animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s`
                }} />
              ))}
            </div>
            <span style={{ fontSize: 13, color: COLORS.muted }}>Elaboro...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.stone}`, display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Scrivi la tua domanda..."
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 24,
            border: `1.5px solid ${COLORS.stone}`, fontSize: 14, outline: "none",
            fontFamily: "inherit", background: COLORS.cream,
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 20px", borderRadius: 24, border: "none",
            background: loading || !input.trim() ? COLORS.muted : accentColor,
            color: "white", fontWeight: 700, fontSize: 14, cursor: loading || !input.trim() ? "default" : "pointer",
            transition: "all 0.2s",
          }}
        >
          Invia
        </button>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}

// ─── VIEWS ───────────────────────────────────────────────────────────────────

function SportelloView() {
  return (
    <div style={{ height: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: COLORS.navy, fontSize: 20, fontWeight: 800 }}>Sportello AI — Diritti e Servizi</h2>
        <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 13 }}>
          Chiedi qualsiasi cosa: SPID, INPS, L.104, Fondo Caregiver, provvedimenti regionali…
        </p>
      </div>
      <div style={{ background: "white", borderRadius: 12, border: `1px solid ${COLORS.stone}`, overflow: "hidden", height: "calc(100% - 80px)" }}>
        <Chat
          systemPrompt={SYSTEM_SOCI}
          placeholder="Ciao! Sono qui per aiutarti. Come posso essere utile oggi?"
          accentColor={COLORS.teal}
        />
      </div>
    </div>
  );
}

function SegnalazioneView() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ tipo: "", descrizione: "", data: "", ente: "" });
  const [inviata, setInviata] = useState(false);

  const tipi = [
    "Mancato riconoscimento caregiver",
    "Fondi non erogati",
    "Non applicazione L.R. 12/2023",
    "Discriminazione",
    "Altro",
  ];

  if (inviata) return (
    <div style={{ textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
      <h3 style={{ color: COLORS.teal }}>Segnalazione inviata con successo</h3>
      <p style={{ color: COLORS.muted }}>La segreteria di Ora Noi APS ti contatterà entro 3 giorni lavorativi.</p>
      <button onClick={() => { setInviata(false); setStep(0); setForm({ tipo: "", descrizione: "", data: "", ente: "" }); }}
        style={{ marginTop: 16, padding: "10px 24px", borderRadius: 24, border: "none", background: COLORS.teal, color: "white", fontWeight: 700, cursor: "pointer" }}>
        Nuova segnalazione
      </button>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", color: COLORS.navy, fontSize: 20, fontWeight: 800 }}>Segnala una Violazione</h2>
      <p style={{ margin: "0 0 20px", color: COLORS.muted, fontSize: 13 }}>Registra una violazione dei tuoi diritti come caregiver</p>

      <div style={{ background: "white", borderRadius: 12, border: `1px solid ${COLORS.stone}`, padding: 24 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["Tipo", "Dettagli", "Conferma"].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: i <= step ? COLORS.teal : COLORS.stone,
                color: i <= step ? "white" : COLORS.muted, fontSize: 13, fontWeight: 700
              }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: i <= step ? COLORS.navy : COLORS.muted, fontWeight: i === step ? 700 : 400 }}>{s}</span>
              {i < 2 && <div style={{ width: 24, height: 1, background: COLORS.stone }} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div>
            <p style={{ fontWeight: 600, color: COLORS.navy, marginBottom: 12 }}>Che tipo di violazione vuoi segnalare?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tipi.map(t => (
                <button key={t} onClick={() => { setForm({ ...form, tipo: t }); setStep(1); }}
                  style={{
                    padding: "12px 16px", borderRadius: 8, border: `2px solid ${form.tipo === t ? COLORS.teal : COLORS.stone}`,
                    background: form.tipo === t ? "#e8f8f5" : "white", textAlign: "left", cursor: "pointer",
                    color: COLORS.navy, fontWeight: 500, fontSize: 14, transition: "all 0.15s"
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy }}>Ente coinvolto</label>
              <input value={form.ente} onChange={e => setForm({ ...form, ente: e.target.value })}
                placeholder="es. Regione Sardegna, Comune di Cagliari, INPS..."
                style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${COLORS.stone}`, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy }}>Data approssimativa</label>
              <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${COLORS.stone}`, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy }}>Descrizione dettagliata</label>
              <textarea value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })}
                placeholder="Descrivi cosa è successo, chi ha agito, quali documenti hai..."
                rows={5}
                style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${COLORS.stone}`, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(0)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1.5px solid ${COLORS.stone}`, background: "white", cursor: "pointer", fontWeight: 600 }}>Indietro</button>
              <button onClick={() => setStep(2)} disabled={!form.descrizione}
                style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: form.descrizione ? COLORS.teal : COLORS.muted, color: "white", fontWeight: 700, cursor: form.descrizione ? "pointer" : "default" }}>
                Continua
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ fontWeight: 600, color: COLORS.navy, marginBottom: 16 }}>Riepilogo segnalazione</p>
            {[["Tipo", form.tipo], ["Ente", form.ente || "Non specificato"], ["Data", form.data || "Non specificata"], ["Descrizione", form.descrizione]].map(([k, v]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
                <div style={{ fontSize: 14, color: COLORS.navy, marginTop: 2 }}>{v}</div>
              </div>
            ))}
            <div style={{ background: "#fef9e7", border: "1px solid #f0c040", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: "#7d6608" }}>
              🔒 I tuoi dati sono protetti e visibili solo alla segreteria di Ora Noi APS.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1.5px solid ${COLORS.stone}`, background: "white", cursor: "pointer", fontWeight: 600 }}>Modifica</button>
              <button onClick={() => setInviata(true)}
                style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: COLORS.teal, color: "white", fontWeight: 700, cursor: "pointer" }}>
                Invia segnalazione
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SegreteriaView() {
  return (
    <div style={{ height: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: COLORS.navy, fontSize: 20, fontWeight: 800 }}>Segretario AI</h2>
        <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 13 }}>
          Bozze PEC, lettere ufficiali, comunicati, ricerca normativa…
        </p>
      </div>
      <div style={{ background: "white", borderRadius: 12, border: `1px solid ${COLORS.stone}`, overflow: "hidden", height: "calc(100% - 80px)" }}>
        <Chat
          systemPrompt={SYSTEM_SEGRETERIA}
          placeholder='Dimmi cosa ti serve: "Scrivi una PEC alla Regione Sardegna riguardo..." oppure "Cerca la normativa su..."'
          accentColor={COLORS.navy}
        />
      </div>
    </div>
  );
}

function LibroSociView({ soci, setSoci }) {
  const [selected, setSelected] = useState(null);

  function toggleSospeso(id) {
    setSoci(soci.map(s => s.id === id ? { ...s, sospeso: !s.sospeso } : s));
  }

  const sel = soci.find(s => s.id === selected);

  return (
    <div style={{ display: "flex", gap: 16, height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <h2 style={{ margin: "0 0 16px", color: COLORS.navy, fontSize: 20, fontWeight: 800 }}>Libro Soci</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {soci.map(s => {
            const st = getSocioStatus(s);
            return (
              <div key={s.id} onClick={() => setSelected(s.id === selected ? null : s.id)}
                style={{
                  background: "white", borderRadius: 10, border: `2px solid ${selected === s.id ? COLORS.teal : COLORS.stone}`,
                  padding: "12px 16px", cursor: "pointer", transition: "all 0.15s"
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 15 }}>{s.nome}</div>
                    <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{s.email}</div>
                  </div>
                  <Badge status={st} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {sel && (
        <div style={{ width: 280, background: "white", borderRadius: 12, border: `1px solid ${COLORS.stone}`, padding: 20, alignSelf: "flex-start" }}>
          <h3 style={{ margin: "0 0 16px", color: COLORS.navy, fontSize: 16 }}>{sel.nome}</h3>
          {[
            ["Email", sel.email],
            ["Familiare", sel.familiare],
            ["Iscritto dal", sel.iscritto],
            ["Scadenza quota", sel.scadenza],
            ["Quota pagata", sel.quota ? "✅ Sì" : "❌ No"],
          ].map(([k, v]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase" }}>{k}</div>
              <div style={{ fontSize: 13, color: COLORS.navy, marginTop: 2 }}>{v}</div>
            </div>
          ))}
          <button onClick={() => toggleSospeso(sel.id)}
            style={{
              width: "100%", marginTop: 8, padding: "10px", borderRadius: 8, border: "none",
              background: sel.sospeso ? COLORS.success : COLORS.danger,
              color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer"
            }}>
            {sel.sospeso ? "✅ Riattiva accesso" : "🚫 Sospendi accesso"}
          </button>
          <p style={{ fontSize: 11, color: COLORS.muted, textAlign: "center", margin: "8px 0 0" }}>
            {sel.sospeso ? "Il socio non può accedere alla piattaforma" : "Il socio ha accesso completo"}
          </p>
        </div>
      )}
    </div>
  );
}

function VolontariView() {
  return (
    <div>
      <h2 style={{ margin: "0 0 16px", color: COLORS.navy, fontSize: 20, fontWeight: 800 }}>Libro Volontari</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {MOCK_VOLONTARI.map(v => (
          <div key={v.id} style={{ background: "white", borderRadius: 10, border: `1px solid ${COLORS.stone}`, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, color: COLORS.navy }}>{v.nome}</div>
                <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{v.attivita}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, color: COLORS.teal, fontSize: 18 }}>{v.ore}h</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>{v.presenze} presenze</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContabilitaView() {
  const totEntrate = MOCK_CONTABILITA.filter(r => r.tipo === "entrata").reduce((s, r) => s + r.importo, 0);
  const totUscite = MOCK_CONTABILITA.filter(r => r.tipo === "uscita").reduce((s, r) => s + r.importo, 0);

  return (
    <div>
      <h2 style={{ margin: "0 0 16px", color: COLORS.navy, fontSize: 20, fontWeight: 800 }}>Contabilità</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Entrate", val: totEntrate, color: COLORS.success },
          { label: "Uscite", val: totUscite, color: COLORS.danger },
          { label: "Saldo", val: totEntrate - totUscite, color: COLORS.navy },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ flex: 1, background: "white", borderRadius: 10, border: `1px solid ${COLORS.stone}`, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>€ {val}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "white", borderRadius: 10, border: `1px solid ${COLORS.stone}`, overflow: "hidden" }}>
        {MOCK_CONTABILITA.map((r, i) => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < MOCK_CONTABILITA.length - 1 ? `1px solid ${COLORS.stone}` : "none" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy }}>{r.desc}</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 1 }}>{r.data}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: r.tipo === "entrata" ? COLORS.success : COLORS.danger }}>
              {r.tipo === "entrata" ? "+" : "-"}€ {r.importo}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function doLogin() {
    const user = Object.values(MOCK_USERS).find(u => u.email === email && u.password === password);
    if (!user) { setError("Credenziali non valide."); return; }
    if (user.sospeso) { setError("Il tuo account è sospeso. Contatta la segreteria di Ora Noi APS."); return; }
    onLogin(user);
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyLight} 50%, ${COLORS.teal} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 20, padding: 40, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🤝</div>
          <div style={{ fontWeight: 900, fontSize: 26, color: COLORS.navy, letterSpacing: -0.5 }}>Ora Noi APS</div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Piattaforma Associativa</div>
        </div>
        {error && (
          <div style={{ background: "#fdecea", border: "1px solid #f1948a", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: COLORS.danger }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, textTransform: "uppercase", letterSpacing: 0.5 }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="la-tua@email.it"
            style={{ width: "100%", marginTop: 6, padding: "11px 14px", borderRadius: 8, border: `1.5px solid ${COLORS.stone}`, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, textTransform: "uppercase", letterSpacing: 0.5 }}>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && doLogin()}
            style={{ width: "100%", marginTop: 6, padding: "11px 14px", borderRadius: 8, border: `1.5px solid ${COLORS.stone}`, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} />
        </div>
        <button onClick={doLogin}
          style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.navy})`, color: "white", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          Accedi
        </button>
        <div style={{ marginTop: 20, padding: "12px", background: COLORS.cream, borderRadius: 8, fontSize: 12, color: COLORS.muted }}>
          <strong>Demo:</strong><br />
          Admin: mario@oranoiaps.it / admin123<br />
          Socio: giulia@email.it / pass123<br />
          <span style={{ color: COLORS.danger }}>Sospeso: franco@email.it / pass123</span>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState(null);
  const [soci, setSoci] = useState(MOCK_SOCI);

  useEffect(() => {
    if (user) setView(user.role === "admin" ? "segreteria" : "assistente");
  }, [user]);

  if (!user) return <Login onLogin={setUser} />;

  const isAdmin = user.role === "admin";

  const socioNav = [
    { id: "assistente", icon: "🤖", label: "Assistente Ora Noi" },
    { id: "segnalazione", icon: "📝", label: "Segnala" },
  ];

  const adminNav = [
    { id: "segreteria", icon: "✍️", label: "Segretario AI" },
    { id: "soci", icon: "👥", label: "Libro Soci" },
    { id: "volontari", icon: "🙋", label: "Volontari" },
    { id: "contabilita", icon: "💶", label: "Contabilità" },
  ];

  const nav = isAdmin ? adminNav : socioNav;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.cream, display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyLight})`, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🤝</span>
          <span style={{ fontWeight: 900, fontSize: 18, color: "white", letterSpacing: -0.5 }}>Ora Noi APS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{user.name}</span>
          <button onClick={() => setUser(null)}
            style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "white", fontSize: 12, cursor: "pointer" }}>
            Esci
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* SIDEBAR */}
        <div style={{ width: 200, background: "white", borderRight: `1px solid ${COLORS.stone}`, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                borderRadius: 8, border: "none", background: view === n.id ? `linear-gradient(135deg, ${COLORS.teal}22, ${COLORS.navy}11)` : "transparent",
                color: view === n.id ? COLORS.navy : COLORS.muted, fontWeight: view === n.id ? 700 : 500,
                fontSize: 14, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                borderLeft: view === n.id ? `3px solid ${COLORS.teal}` : "3px solid transparent"
              }}>
              <span>{n.icon}</span> {n.label}
            </button>
          ))}

          {!isAdmin && (
            <div style={{ marginTop: "auto", padding: "12px", background: COLORS.cream, borderRadius: 8, fontSize: 12, color: COLORS.muted }}>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>Il mio account</div>
              <div>Quota: {soci.find(s => s.id === user.id)?.quota ? "✅ Pagata" : "❌ Non pagata"}</div>
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {view === "assistente" && <SportelloView />}
          {view === "segnalazione" && <SegnalazioneView />}
          {view === "segreteria" && <SegreteriaView />}
          {view === "soci" && <LibroSociView soci={soci} setSoci={setSoci} />}
          {view === "volontari" && <VolontariView />}
          {view === "contabilita" && <ContabilitaView />}
        </div>
      </div>
    </div>
  );
}
