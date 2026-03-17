/* ═══════════════════════════════════════
   PDF CASH IA — APP LOGIC
═══════════════════════════════════════ */

/* ── STATE ── */
let state = {
  step: "home",        // home | generating | preview
  docType: "ebook",
  docLabel: "Ebook",
  topic: "",
  content: null,
  progress: 0,
  progressTimer: null,
};

/* ── HELPERS ── */
function $(id) { return document.getElementById(id); }

function showStep(name) {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  const el = $("step-" + name);
  if (el) el.classList.add("active");
  state.step = name;
  $("btn-reset").classList.toggle("hidden", name === "home");
  window.scrollTo(0, 0);
}

function calcRevenue(priceStr, qty) {
  const num = parseInt((priceStr || "3000").replace(/\D/g, "")) || 3000;
  return (num * qty).toLocaleString("fr-FR") + " FCFA";
}

function showError(msg) {
  const box = $("error-box");
  box.textContent = "⚠️ " + msg;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 5000);
}

/* ── PROGRESS ANIMATION ── */
function startProgress() {
  let p = 0, labelIdx = 0;
  $("progress-bar").style.width = "0%";
  $("progress-pct").textContent = "0%";
  updateStepItems(-1);

  state.progressTimer = setInterval(() => {
    p += Math.random() * 5 + 1;
    if (p > 92) p = 92;
    const rounded = Math.round(p);
    $("progress-bar").style.width = rounded + "%";
    $("progress-pct").textContent = rounded + "%";
    const newLabel = Math.min(Math.floor(p / 20), 4);
    if (newLabel !== labelIdx) { labelIdx = newLabel; updateStepItems(newLabel); }
  }, 400);
}

function stopProgress() {
  clearInterval(state.progressTimer);
  $("progress-bar").style.width = "100%";
  $("progress-pct").textContent = "100%";
  updateStepItems(5); // all done
}

function updateStepItems(activeIdx) {
  document.querySelectorAll(".step-item").forEach((el, i) => {
    el.classList.remove("done", "active");
    if (i < activeIdx) { el.classList.add("done"); el.textContent = "✅ " + el.textContent.replace(/^[^\s]+\s/, ""); }
    else if (i === activeIdx) { el.classList.add("active"); el.textContent = "⚡ " + el.textContent.replace(/^[^\s]+\s/, ""); }
    else { el.textContent = "⏸️ " + el.textContent.replace(/^[^\s]+\s/, ""); }
  });
}

/* ── GENERATE ── */
async function generate() {
  const topic = $("topic-input").value.trim();
  if (!topic) return;
  state.topic = topic;
  $("error-box").classList.add("hidden");

  showStep("generating");
  $("gen-topic").textContent = "« " + (topic.length > 60 ? topic.slice(0, 60) + "..." : topic) + " »";
  startProgress();

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: state.topic,
        docType: state.docType,
        docLabel: state.docLabel,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Erreur serveur");
    }

    const data = await res.json();
    state.content = data;

    stopProgress();
    setTimeout(() => {
      renderPreview(data);
      showStep("preview");
    }, 600);

  } catch (err) {
    stopProgress();
    showStep("home");
    showError(err.message || "Erreur de génération. Réessaie !");
  }
}

/* ── RENDER PREVIEW ── */
function renderPreview(c) {
  $("preview-type-badge").textContent = "✦ " + state.docLabel.toUpperCase() + " ✦";
  $("preview-title").textContent = c.title || "";
  $("preview-subtitle").textContent = c.subtitle || "";
  $("preview-tagline").textContent = """ + (c.tagline || "") + """;
  $("preview-price").textContent = "💰 Prix conseillé : " + (c.price_suggested || "");

  // TOC
  const toc = $("preview-toc");
  toc.innerHTML = "";
  (c.table_of_contents || []).slice(0, 7).forEach((item, i) => {
    toc.innerHTML += `<div class="toc-item"><span class="toc-num">${i + 1}.</span><span>${item}</span></div>`;
  });

  // Chapter 1
  const ch1 = (c.chapters || [])[0];
  if (ch1) {
    $("preview-ch-title").textContent = ch1.title || "";
    $("preview-ch-text").textContent = (ch1.content || "").slice(0, 280) + "... [contenu complet dans le PDF]";
  }

  // Revenue
  $("rev-10").textContent = calcRevenue(c.price_suggested, 10);
  $("rev-50").textContent = calcRevenue(c.price_suggested, 50);
  $("rev-100").textContent = calcRevenue(c.price_suggested, 100);

  // WhatsApp
  const msg = c.sales_message || "";
  $("preview-wa-msg").textContent = msg;
  $("btn-wa-share").href = "https://wa.me/?text=" + encodeURIComponent(msg);

  // TikTok
  $("preview-tiktok").textContent = """ + (c.viral_hook || "") + """;

  // Takeaways
  const tw = $("preview-takeaways");
  tw.innerHTML = "";
  (c.key_takeaways || []).forEach(t => {
    tw.innerHTML += `<div class="takeaway-item"><span class="takeaway-check">✓</span><span>${t}</span></div>`;
  });
}

/* ── PDF GENERATION ── */
function buildPDFHTML(c) {
  const typeLabel = state.docLabel;

  const chaptersHTML = (c.chapters || []).map((ch, i) => `
    <div class="chapter${i > 0 ? " page-break" : ""}">
      <div class="ch-num">CHAPITRE ${String(i + 1).padStart(2, "0")}</div>
      <div class="ch-title">${ch.title || ""}</div>
      <div class="ch-content">
        ${(ch.content || "").split("\n").filter(Boolean).map(p => `<p>${p}</p>`).join("")}
      </div>
    </div>
  `).join("");

  const tocHTML = (c.table_of_contents || []).map((item, i) => `
    <div class="toc-row">
      <span class="toc-n">${String(i + 1).padStart(2, "0")}</span>
      <span class="toc-t">${item}</span>
    </div>
  `).join("");

  const takeawaysHTML = (c.key_takeaways || []).map(t => `
    <div class="kp-row"><span class="kp-check">✓</span><span>${t}</span></div>
  `).join("");

  const priceNum = parseInt((c.price_suggested || "3000").replace(/\D/g, "")) || 3000;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${c.title || "Document"}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#fff;color:#111}
.page-break{page-break-before:always}

/* COVER */
.cover{
  width:100vw;min-height:100vh;
  background:linear-gradient(145deg,#0d0618 0%,#1a0535 55%,#0a0f1e 100%);
  display:flex;flex-direction:column;
  padding:0;page-break-after:always;
  position:relative;overflow:hidden;
}
.cover::before{content:'';position:absolute;top:-80px;right:-80px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,#7c3aed33 0%,transparent 70%);}
.cover::after{content:'';position:absolute;bottom:100px;left:-80px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,#ec489911 0%,transparent 70%);}
.c-bar{height:7px;background:linear-gradient(90deg,#7c3aed,#ec4899,#f59e0b);flex-shrink:0;}
.c-body{flex:1;padding:52px 48px 36px;position:relative;z-index:1;}
.c-badge{display:inline-block;background:rgba(124,58,237,.25);border:1px solid rgba(124,58,237,.5);border-radius:30px;padding:7px 20px;color:#a78bfa;font-family:'Sora',sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:36px;}
.c-title{font-family:'Sora',sans-serif;font-size:38px;font-weight:900;color:#fff;line-height:1.15;margin-bottom:18px;max-width:500px;}
.c-subtitle{font-size:16px;color:#9ca3af;line-height:1.7;margin-bottom:24px;max-width:440px;}
.c-tagline{font-style:italic;color:#a78bfa;font-size:15px;border-left:4px solid #7c3aed;padding-left:18px;margin-bottom:36px;max-width:420px;line-height:1.6;}
.c-price{display:inline-flex;align-items:center;gap:10px;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);border-radius:12px;padding:14px 22px;color:#10b981;font-family:'Sora',sans-serif;font-weight:700;font-size:15px;}
.c-footer{background:rgba(0,0,0,.4);padding:22px 48px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,.06);position:relative;z-index:1;flex-shrink:0;}
.c-author{color:#6b7280;font-size:13px;}
.c-brand{color:#7c3aed;font-family:'Sora',sans-serif;font-size:13px;font-weight:700;}

/* INNER PAGE */
.inner{padding:32mm 24mm 28mm;page-break-after:always;position:relative;}
.ph{display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;margin-bottom:36px;border-bottom:2px solid #7c3aed;}
.ph-title{font-family:'Sora',sans-serif;font-size:9px;color:#7c3aed;font-weight:700;letter-spacing:2px;text-transform:uppercase;}
.ph-page{font-size:9px;color:#9ca3af;font-family:'Sora',sans-serif;}

/* TOC */
.h2{font-family:'Sora',sans-serif;font-size:28px;font-weight:900;color:#111;margin-bottom:8px;}
.h2-line{width:64px;height:5px;background:linear-gradient(90deg,#7c3aed,#ec4899);border-radius:3px;margin-bottom:30px;}
.toc-row{display:flex;gap:16px;align-items:flex-start;padding:12px 16px;margin-bottom:6px;border-radius:8px;background:#f9fafb;border:1px solid #f0f0f0;}
.toc-n{font-family:'Sora',sans-serif;font-weight:900;font-size:20px;color:#7c3aed;min-width:32px;flex-shrink:0;}
.toc-t{font-size:13px;color:#374151;line-height:1.5;padding-top:3px;}

/* CHAPTER */
.ch-num{font-family:'Sora',sans-serif;font-size:9px;font-weight:700;color:#9ca3af;letter-spacing:4px;margin-bottom:8px;}
.ch-title{font-family:'Sora',sans-serif;font-size:26px;font-weight:900;color:#fff;line-height:1.2;padding:22px 26px;background:linear-gradient(135deg,#1a0535,#0a0f1e);border-left:5px solid #7c3aed;border-radius:0 12px 12px 0;margin-bottom:28px;}
.ch-content p{font-size:13px;color:#374151;line-height:1.85;margin-bottom:14px;text-align:justify;}

/* TAKEAWAYS */
.kp-row{display:flex;gap:14px;align-items:flex-start;padding:14px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:10px;}
.kp-check{color:#10b981;font-weight:900;font-size:16px;flex-shrink:0;margin-top:1px;}

/* CTA */
.cta-box{background:linear-gradient(135deg,#1a0535,#0a0f1e);border:2px solid #7c3aed;border-radius:18px;padding:36px;text-align:center;margin-bottom:28px;}
.cta-text{font-family:'Sora',sans-serif;font-size:22px;font-weight:900;color:#fff;margin-bottom:12px;line-height:1.3;}
.cta-sub{font-size:13px;color:#9ca3af;line-height:1.7;margin-bottom:22px;}
.cta-price{font-family:'Sora',sans-serif;font-size:18px;font-weight:700;color:#10b981;}
.rev-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px;}
.rev-c{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center;}
.rev-q{font-size:11px;color:#9ca3af;margin-bottom:5px;}
.rev-a{font-family:'Sora',sans-serif;font-size:17px;font-weight:900;color:#10b981;}
.brand{text-align:center;padding-top:24px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:10px;margin-top:24px;}
</style>
</head>
<body>

<div class="cover">
  <div class="c-bar"></div>
  <div class="c-body">
    <div class="c-badge">✦ ${typeLabel} ✦</div>
    <div class="c-title">${c.title || ""}</div>
    <div class="c-subtitle">${c.subtitle || ""}</div>
    <div class="c-tagline">"${c.tagline || ""}"</div>
    <div class="c-price">💰 Prix conseillé : ${c.price_suggested || ""}</div>
  </div>
  <div class="c-footer">
    <div class="c-author">Par ${c.author || "Expert Digital"}</div>
    <div class="c-brand">PDF Cash IA ✦</div>
  </div>
</div>

<div class="inner">
  <div class="ph">
    <span class="ph-title">${(c.title || "").substring(0, 45)}</span>
    <span class="ph-page">TABLE DES MATIÈRES</span>
  </div>
  <div class="h2">Table des Matières</div>
  <div class="h2-line"></div>
  ${tocHTML}
</div>

${chaptersHTML}

<div class="inner page-break">
  <div class="ph">
    <span class="ph-title">${(c.title || "").substring(0, 45)}</span>
    <span class="ph-page">POINTS CLÉS</span>
  </div>
  <div class="h2">Points Clés à Retenir</div>
  <div class="h2-line" style="background:linear-gradient(90deg,#10b981,#34d399)"></div>
  ${takeawaysHTML}
</div>

<div class="inner page-break">
  <div class="ph">
    <span class="ph-title">${(c.title || "").substring(0, 45)}</span>
    <span class="ph-page">CONCLUSION</span>
  </div>
  <div class="cta-box">
    <div class="cta-text">🚀 ${c.call_to_action || "Passe à l'action maintenant !"}</div>
    <div class="cta-sub">${c.description || ""}</div>
    <div class="cta-price">💰 ${c.price_suggested || ""}</div>
  </div>
  <div style="font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:#374151;margin-bottom:12px">📊 TON POTENTIEL DE REVENUS</div>
  <div class="rev-grid">
    <div class="rev-c"><div class="rev-q">10 ventes</div><div class="rev-a">${(priceNum * 10).toLocaleString("fr-FR")} FCFA</div></div>
    <div class="rev-c"><div class="rev-q">50 ventes</div><div class="rev-a">${(priceNum * 50).toLocaleString("fr-FR")} FCFA</div></div>
    <div class="rev-c"><div class="rev-q">100 ventes</div><div class="rev-a">${(priceNum * 100).toLocaleString("fr-FR")} FCFA</div></div>
  </div>
  <div class="brand">Créé avec PDF Cash IA — Transforme tes idées en argent 💸</div>
</div>

</body>
</html>`;
}

function downloadPDF() {
  if (!state.content) return;

  // Show overlay
  const overlay = document.createElement("div");
  overlay.id = "pdf-downloading";
  overlay.innerHTML = `
    <div class="big-icon">📥</div>
    <h3>Préparation du PDF...</h3>
    <p>Ton document va s'ouvrir pour impression / sauvegarde</p>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => {
    const html = buildPDFHTML(state.content);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (state.content.title || "document").replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_").slice(0, 50) + ".html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    document.body.removeChild(overlay);
  }, 800);
}

/* ── UPDATE GENERATE BUTTON ── */
function updateGenerateBtn() {
  const btn = $("btn-generate");
  const val = $("topic-input").value.trim();
  if (val) {
    btn.disabled = false;
    btn.textContent = `⚡ Générer mon ${state.docLabel}`;
  } else {
    btn.disabled = true;
    btn.textContent = "✍️ Écris ton sujet d'abord";
  }
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {

  // Doc type buttons
  document.querySelectorAll(".doc-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".doc-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.docType = btn.dataset.type;
      state.docLabel = btn.dataset.label;
      updateGenerateBtn();
    });
  });

  // Topic input
  $("topic-input").addEventListener("input", updateGenerateBtn);

  // Suggestions
  document.querySelectorAll(".sug-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $("topic-input").value = btn.textContent;
      updateGenerateBtn();
      $("topic-input").focus();
    });
  });

  // Generate button
  $("btn-generate").addEventListener("click", generate);

  // Reset buttons
  const doReset = () => {
    state.content = null;
    $("topic-input").value = "";
    updateGenerateBtn();
    showStep("home");
  };
  $("btn-reset").addEventListener("click", doReset);
  $("btn-reset2") && $("btn-reset2").addEventListener("click", doReset);

  // New same type
  $("btn-new-same") && $("btn-new-same").addEventListener("click", () => {
    $("topic-input").value = "";
    updateGenerateBtn();
    showStep("home");
  });

  // Download
  $("btn-download") && $("btn-download").addEventListener("click", downloadPDF);

  // Copy message
  $("btn-copy-msg") && $("btn-copy-msg").addEventListener("click", () => {
    const msg = $("preview-wa-msg").textContent;
    navigator.clipboard?.writeText(msg).catch(() => {});
    const btn = $("btn-copy-msg");
    btn.textContent = "✅ Copié !";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "📋 Copier"; btn.classList.remove("copied"); }, 2000);
  });

  // Init step labels text (store original)
  const stepTexts = ["Analyse du sujet", "Rédaction des chapitres", "Design professionnel", "Calcul du potentiel", "Emballage final"];
  document.querySelectorAll(".step-item").forEach((el, i) => {
    el.textContent = "⏸️ " + stepTexts[i];
    el.dataset.label = stepTexts[i];
  });

  // Fix updateStepItems to use data-label
  window._stepTexts = stepTexts;

  updateGenerateBtn();
  showStep("home");
});

/* ── OVERRIDE updateStepItems to use stored labels ── */
function updateStepItems(activeIdx) {
  const labels = window._stepTexts || ["Analyse du sujet", "Rédaction des chapitres", "Design professionnel", "Calcul du potentiel", "Emballage final"];
  document.querySelectorAll(".step-item").forEach((el, i) => {
    el.classList.remove("done", "active");
    if (i < activeIdx) { el.classList.add("done"); el.textContent = "✅ " + labels[i]; }
    else if (i === activeIdx) { el.classList.add("active"); el.textContent = "⚡ " + labels[i]; }
    else { el.textContent = "⏸️ " + labels[i]; }
  });
}
