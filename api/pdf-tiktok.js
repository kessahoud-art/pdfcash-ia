import PDFDocument from 'pdfkit';

function clean(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\x00-\x7E\u00C0-\u024F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { content: C, color, authorName } = req.body || {};
  if (!C || !C.title) return res.status(400).json({ error: "Contenu manquant" });

  // ── COULEURS ──
  function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#010101");
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [1,1,1];
  }
  function rgb(arr) { return `rgb(${arr[0]},${arr[1]},${arr[2]})`; }
  function lgt(arr, a) { return arr.map(v => Math.min(v + a, 255)); }

  const col = color || { ac: "#ee1d52" };
  const AC    = hexRgb(col.ac || "#ee1d52");  // rouge TikTok
  const TEAL  = [105, 201, 208];              // bleu-vert TikTok
  const DARK  = [15, 15, 20];
  const GRAY  = [90, 90, 110];
  const LGRAY = [160, 165, 185];
  const BORDER= [220, 222, 230];
  const RED   = [238, 29, 82];
  const CYAN  = [105, 201, 208];

  const W = 595.28;
  const H = 841.89;
  const ML = 50;
  const MR = 50;
  const TW = W - ML - MR;
  const BOTTOM = H - 45;

  const author   = clean(authorName || C.author || 'Expert Contenu Digital');
  const title    = clean(C.title || 'Scripts TikTok');
  const chapters = C.chapters || [];

  try {
    const doc = new PDFDocument({
      size: "A4", margin: 0, autoFirstPage: false,
      info: { Title: title, Author: author, Creator: "PDF Cash IA" }
    });

    const chunks = [];
    doc.on("data", c => chunks.push(c));
    let y = 0, pageNum = 0;

    // ── HEADER ──
    function addHeader(section) {
      doc.moveTo(0, 0).lineTo(W, 0).lineWidth(3).strokeColor(rgb(RED)).stroke();
      doc.fillColor(rgb(GRAY)).font("Helvetica-Bold").fontSize(7);
      doc.text(title.slice(0, 55), ML, 8, { lineBreak: false });
      doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(7);
      doc.text(clean(section), W - MR - 130, 8, { width: 130, align: "right", lineBreak: false });
      doc.moveTo(ML, 20).lineTo(W - MR, 20).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
      return 32;
    }

    // ── FOOTER ──
    function addFooter(n) {
      doc.moveTo(ML, H - 18).lineTo(W - MR, H - 18).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
      doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(7);
      doc.text("PDF Cash IA  -  pdfcash-ia.vercel.app", 0, H - 13, { align: "center", width: W, lineBreak: false });
      doc.fillColor(rgb(RED)).font("Helvetica-Bold").fontSize(7);
      doc.text(String(n), W - MR, H - 13, { lineBreak: false });
    }

    function newPage(section) {
      doc.addPage();
      pageNum++;
      addFooter(pageNum);
      y = addHeader(section);
    }

    function ensureSpace(needed, section) {
      if (y + needed > BOTTOM) newPage(section || "SCRIPTS TIKTOK");
    }

    // ── HELPER : bloc script TikTok ──
    function scriptBlock(num, scriptData, label) {
      const chTitle = clean(scriptData.title || label || "Script " + num);
      const content = clean(scriptData.content || "");

      // Separator nouvelle page pour chaque script (plus propre)
      newPage("SCRIPT " + String(num).padStart(2, "0"));

      // Numéro de script — badge
      doc.rect(ML, y, 40, 40).fill(rgb(RED));
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(18);
      doc.text(String(num).padStart(2,"0"), ML, y + 12, { width: 40, align: "center", lineBreak: false });

      // Titre du script
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(14);
      doc.text(chTitle, ML + 50, y + 4, { width: TW - 50 });
      const titleH = doc.heightOfString(chTitle, { width: TW - 50 });
      const blockTop = y;
      y += Math.max(44, titleH + 16);

      // Ligne accent
      doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(1.5).strokeColor(rgb(RED)).stroke();
      y += 12;

      // Découper le contenu en sections : ACCROCHE / DÉVELOPPEMENT / CTA / HASHTAGS
      const sections = {
        accroche: [],
        developpement: [],
        cta: [],
        hashtags: []
      };

      const lines = content.split(/[.\n]+/).filter(l => l.trim().length > 5);
      const total = lines.length;
      lines.forEach((line, i) => {
        const t = line.trim();
        if (!t) return;
        // Heuristique de découpe
        if (i < Math.ceil(total * 0.2)) sections.accroche.push(t);
        else if (i < Math.ceil(total * 0.7)) sections.developpement.push(t);
        else if (t.toLowerCase().includes('#') || t.toLowerCase().includes('hashtag')) sections.hashtags.push(t);
        else sections.cta.push(t);
      });

      // Si pas de hashtags détectés → générer
      if (sections.hashtags.length === 0) {
        sections.hashtags.push("#business #argent #afrique #tiktok #conseils");
      }

      // ── ACCROCHE ──
      ensureSpace(80, "SCRIPT " + num);
      // Badge section
      doc.rect(ML, y, TW, 22).fill(rgb(lgt(RED, 220)));
      doc.fillColor(rgb(RED)).font("Helvetica-Bold").fontSize(9);
      doc.text("ACCROCHE  (0 - 3 secondes)", ML + 8, y + 7, { lineBreak: false, characterSpacing: 1 });
      y += 26;

      const accroche = sections.accroche.join(". ") || content.slice(0, 150);
      doc.font("Helvetica-Bold").fontSize(11);
      const ah = doc.heightOfString(accroche, { width: TW - 20, lineGap: 2 });
      ensureSpace(ah + 10, "SCRIPT " + num);
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(11);
      doc.text(accroche, ML + 10, y, { width: TW - 20, lineGap: 2 });
      y += ah + 14;

      // ── DÉVELOPPEMENT ──
      ensureSpace(60, "SCRIPT " + num);
      doc.rect(ML, y, TW, 22).fill(rgb(lgt(CYAN, 180)));
      doc.fillColor(rgb([0,100,120])).font("Helvetica-Bold").fontSize(9);
      doc.text("DEVELOPPEMENT  (3 - 45 secondes)", ML + 8, y + 7, { lineBreak: false, characterSpacing: 1 });
      y += 26;

      const dev = sections.developpement.slice(0, 6).join(". ") || content.slice(150, 500);
      doc.font("Helvetica").fontSize(10);
      const dh = doc.heightOfString(dev, { width: TW - 20, lineGap: 3 });
      ensureSpace(dh + 10, "SCRIPT " + num);
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(dev, ML + 10, y, { width: TW - 20, lineGap: 3 });
      y += dh + 14;

      // ── APPEL À L'ACTION ──
      ensureSpace(60, "SCRIPT " + num);
      doc.rect(ML, y, TW, 22).fill(rgb(lgt(TEAL, 160)));
      doc.fillColor(rgb([0,80,90])).font("Helvetica-Bold").fontSize(9);
      doc.text("APPEL A L'ACTION  (45 - 60 secondes)", ML + 8, y + 7, { lineBreak: false, characterSpacing: 1 });
      y += 26;

      const cta = sections.cta.slice(0, 3).join(". ") ||
        "Abonne-toi pour plus de conseils. Partage avec tes amis. Commente ce que tu en penses.";
      doc.font("Helvetica-Bold").fontSize(10);
      const ctaH = doc.heightOfString(cta, { width: TW - 20, lineGap: 2 });
      ensureSpace(ctaH + 10, "SCRIPT " + num);
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(10);
      doc.text(cta, ML + 10, y, { width: TW - 20, lineGap: 2 });
      y += ctaH + 14;

      // ── HASHTAGS ──
      ensureSpace(44, "SCRIPT " + num);
      doc.rect(ML, y, TW, 22).fill(rgb(lgt(DARK, 230)));
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(9);
      doc.text("HASHTAGS SUGGERES", ML + 8, y + 7, { lineBreak: false, characterSpacing: 1 });
      y += 26;

      const htags = sections.hashtags.join(" ") ||
        "#tiktok #afrique #business #viral #conseils";
      doc.font("Helvetica").fontSize(10);
      const hh = doc.heightOfString(htags, { width: TW - 20, lineGap: 2 });
      ensureSpace(hh + 10, "SCRIPT " + num);
      doc.fillColor(rgb(RED)).font("Helvetica-Bold").fontSize(10);
      doc.text(htags, ML + 10, y, { width: TW - 20, lineGap: 2 });
      y += hh + 16;

      // Durée estimée
      ensureSpace(20, "SCRIPT " + num);
      doc.fillColor(rgb(LGRAY)).font("Helvetica-Oblique").fontSize(9);
      doc.text("Duree estimee : 45 - 60 secondes  |  Format : Vertical 9:16  |  Voix : Dynamique", ML, y, {
        width: TW, lineBreak: false
      });
      y += 20;
    }

    // ════════════════════════════════════════
    // PAGE 1 — COUVERTURE
    // ════════════════════════════════════════
    doc.addPage();
    pageNum++;

    // Bande TikTok en haut
    doc.rect(0, 0, W, 5).fill(rgb(RED));
    doc.rect(0, 5, W, 2).fill(rgb(CYAN));

    // Label
    doc.fillColor(rgb(RED)).font("Helvetica-Bold").fontSize(9);
    doc.text("PACK SCRIPTS TIKTOK", 0, 22, { width: W, align: "center", characterSpacing: 3, lineBreak: false });

    // Titre
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(28);
    const th = doc.heightOfString(title, { width: TW, align: "center" });
    doc.text(title, ML, 50, { width: TW, align: "center" });
    let cy = 50 + th + 16;

    // Double ligne TikTok
    doc.moveTo(W/2 - 50, cy).lineTo(W/2 + 50, cy).lineWidth(2).strokeColor(rgb(RED)).stroke();
    cy += 4;
    doc.moveTo(W/2 - 40, cy).lineTo(W/2 + 40, cy).lineWidth(1).strokeColor(rgb(CYAN)).stroke();
    cy += 18;

    // Sous-titre
    if (C.subtitle) {
      doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(12);
      const sh = doc.heightOfString(clean(C.subtitle), { width: TW, align: "center" });
      doc.text(clean(C.subtitle), ML, cy, { width: TW, align: "center" });
      cy += sh + 20;
    }

    // Nombre de scripts
    const nbScripts = Math.min(chapters.length || 6, 6);
    doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(10);
    doc.text(nbScripts + " scripts complets  |  Accroches virales  |  Hashtags inclus", 0, cy, {
      width: W, align: "center", lineBreak: false
    });
    cy += 22;

    // Prix
    doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(10);
    doc.text("Prix :", 0, cy, { width: W, align: "center", lineBreak: false });
    cy += 18;
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(20);
    doc.text(clean(C.price_suggested || ""), 0, cy, { width: W, align: "center", lineBreak: false });

    // Marque bas
    doc.moveTo(ML, H - 46).lineTo(W - MR, H - 46).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
    doc.fillColor(rgb(RED)).font("Helvetica-Bold").fontSize(11);
    doc.text("PDF Cash IA", 0, H - 36, { width: W, align: "center", lineBreak: false });
    doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(8);
    doc.text("pdfcash-ia.vercel.app", 0, H - 22, { width: W, align: "center", lineBreak: false });

    // ════════════════════════════════════════
    // PAGE 2 — GUIDE D'UTILISATION
    // ════════════════════════════════════════
    newPage("GUIDE D'UTILISATION");

    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(18);
    doc.text("Comment utiliser ces scripts", ML, y);
    y += 24;
    doc.moveTo(ML, y).lineTo(ML + 30, y).lineWidth(3).strokeColor(rgb(RED)).stroke();
    y += 16;

    const tips = [
      "Lis le script a voix haute 2-3 fois avant de filmer pour le memoriser naturellement",
      "Adapte les exemples a ta ville et ta situation personnelle pour plus d'authenticite",
      "Filme en format vertical 9:16 avec bonne lumiere naturelle ou ring light",
      "Parle avec energie et passion - le ton dynamique est essentiel sur TikTok",
      "Ajoute une musique tendance en fond sonore depuis la bibliotheque TikTok",
      "Poste entre 18h et 21h (heure locale) pour maximiser la portee organique",
      "Reponds a tous les commentaires dans les 30 premieres minutes apres publication",
      "Utilise les hashtags suggeres + 2-3 hashtags tres populaires de ta niche"
    ];

    tips.forEach((tip, i) => {
      ensureSpace(30, "GUIDE D'UTILISATION");
      doc.rect(ML, y, 26, 26).fill(i % 2 === 0 ? rgb(RED) : rgb(CYAN));
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(11);
      doc.text(String(i + 1), ML, y + 8, { width: 26, align: "center", lineBreak: false });
      doc.font("Helvetica").fontSize(10);
      const th = doc.heightOfString(tip, { width: TW - 36, lineGap: 2 });
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(tip, ML + 34, y + 7, { width: TW - 36, lineGap: 2 });
      y += Math.max(32, th + 16);
    });

    // Accroche TikTok virale
    if (C.viral_hook) {
      y += 10;
      ensureSpace(60, "GUIDE D'UTILISATION");
      doc.rect(ML, y, TW, 50).lineWidth(2).strokeColor(rgb(RED)).stroke();
      doc.moveTo(ML, y).lineTo(ML + TW, y).lineWidth(4).strokeColor(rgb(RED)).stroke();
      doc.fillColor(rgb(RED)).font("Helvetica-Bold").fontSize(9);
      doc.text("ACCROCHE VIRALE BONUS", ML + 10, y + 8, { lineBreak: false, characterSpacing: 1 });
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(11);
      doc.text('"' + clean(C.viral_hook) + '"', ML + 10, y + 22, { width: TW - 20 });
      y += 58;
    }

    // ════════════════════════════════════════
    // SCRIPTS — 1 par page
    // ════════════════════════════════════════
    chapters.slice(0, 6).forEach((ch, i) => {
      scriptBlock(i + 1, ch, "Script " + (i + 1));
    });

    // ════════════════════════════════════════
    // PAGE FINALE — POINTS CLÉS + CTA
    // ════════════════════════════════════════
    newPage("POINTS CLES");

    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(18);
    doc.text("Points Cles a Retenir", ML, y);
    y += 24;
    doc.moveTo(ML, y).lineTo(ML + 30, y).lineWidth(3).strokeColor(rgb(RED)).stroke();
    y += 14;

    (C.key_takeaways || []).forEach(k => {
      const kText = clean(k);
      if (!kText) return;
      doc.font("Helvetica").fontSize(10);
      const kh = doc.heightOfString(kText, { width: TW - 16, lineGap: 2 });
      ensureSpace(kh + 14, "POINTS CLES");
      doc.moveTo(ML, y).lineTo(ML, y + kh + 4).lineWidth(3).strokeColor(rgb(RED)).stroke();
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(kText, ML + 12, y, { width: TW - 16, lineGap: 2 });
      y += kh + 14;
    });

    // CTA final
    ensureSpace(70, "POINTS CLES");
    y += 14;
    const ctaFinal = clean(C.call_to_action || "Commence a filmer ton premier script maintenant !");
    doc.font("Helvetica-Bold").fontSize(12);
    const cfH = doc.heightOfString(ctaFinal, { width: TW - 30, align: "center" });
    const cfBox = cfH + 40;
    doc.rect(ML, y, TW, cfBox).lineWidth(2).strokeColor(rgb(RED)).stroke();
    doc.moveTo(ML, y).lineTo(ML + TW, y).lineWidth(4).strokeColor(rgb(RED)).stroke();
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(12);
    doc.text(ctaFinal, ML + 15, y + 14, { width: TW - 30, align: "center" });
    doc.fillColor(rgb(RED)).font("Helvetica-Bold").fontSize(13);
    doc.text(clean(C.price_suggested || ""), ML, y + cfBox - 20, { align: "center", width: TW, lineBreak: false });
    y += cfBox + 14;

    ensureSpace(30, "POINTS CLES");
    y += 10;
    doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
    y += 10;
    doc.fillColor(rgb(RED)).font("Helvetica-Bold").fontSize(9);
    doc.text("PDF Cash IA  -  pdfcash-ia.vercel.app", 0, y, { width: W, align: "center", lineBreak: false });

    // ── FINALISATION ──
    doc.end();
    await new Promise(resolve => doc.on("end", resolve));

    const buf = Buffer.concat(chunks);
    const fname = ((C.title || "scripts-tiktok")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "").replace(/ +/g, "_").slice(0, 40)) + "_TikTok.pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch (err) {
    console.error("PDF-TikTok error:", err);
    return res.status(500).json({ error: "Erreur PDF TikTok: " + err.message });
  }
}
