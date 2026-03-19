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
  const col = color || { ac: "#7c3aed" };
  function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#7c3aed");
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [124,58,237];
  }
  function rgb(arr) { return `rgb(${arr[0]},${arr[1]},${arr[2]})`; }
  function lgt(arr, a) { return arr.map(v => Math.min(v + a, 255)); }

  const AC    = hexRgb(col.ac || col.c1 || "#7c3aed");
  const DARK  = [15, 20, 35];
  const GRAY  = [90, 95, 120];
  const LGRAY = [160, 165, 185];
  const BORDER= [215, 220, 232];
  const GREEN = [22, 163, 74];
  const ORANGE= [217, 119, 6];
  const YELLOW= [234, 179, 8];

  const W = 595.28;
  const H = 841.89;
  const ML = 55;
  const MR = 55;
  const TW = W - ML - MR;
  const BOTTOM = H - 45;

  const author   = clean(authorName || C.author || 'Formateur Expert');
  const title    = clean(C.title || 'Mini-Formation');
  const chapters = C.chapters || [];
  const pn = parseInt((C.price_suggested || "10000").replace(/\D/g, "")) || 10000;

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
      doc.moveTo(0, 0).lineTo(W, 0).lineWidth(3).strokeColor(rgb(AC)).stroke();
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
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text(String(n), W - MR, H - 13, { lineBreak: false });
    }

    function newPage(section) {
      doc.addPage();
      pageNum++;
      addFooter(pageNum);
      y = addHeader(section);
    }

    function ensureSpace(needed, section) {
      if (y + needed > BOTTOM) newPage(section || "FORMATION");
    }

    // ── PARAGRAPH ──
    function writePara(text, section) {
      const t = clean(text);
      if (!t || t.length < 5) return;
      doc.font("Helvetica").fontSize(10);
      const ph = doc.heightOfString(t, { width: TW, lineGap: 3 });
      ensureSpace(ph + 8, section);
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(t, ML, y, { width: TW, align: "justify", lineGap: 3 });
      y += ph + 10;
    }

    // ── BULLET ──
    function bullet(text, section, color) {
      const t = clean(text);
      if (!t) return;
      const col = color || AC;
      doc.font("Helvetica").fontSize(10);
      const ph = doc.heightOfString(t, { width: TW - 16, lineGap: 2 });
      ensureSpace(ph + 8, section);
      doc.fillColor(rgb(col)).font("Helvetica-Bold").fontSize(11);
      doc.text("-", ML, y, { lineBreak: false });
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(t, ML + 14, y, { width: TW - 16, lineGap: 2 });
      y += ph + 10;
    }

    // ── ENCADRÉ EXERCICE ──
    function exerciseBox(text, num, section) {
      const t = clean(text);
      if (!t) return;
      doc.font("Helvetica").fontSize(10);
      const th = doc.heightOfString(t, { width: TW - 30, lineGap: 2 });
      const boxH = th + 44;
      ensureSpace(boxH + 10, section);

      // Bordure verte
      doc.rect(ML, y, TW, boxH).lineWidth(1.5).strokeColor(rgb(GREEN)).stroke();
      doc.moveTo(ML, y).lineTo(ML + TW, y).lineWidth(3).strokeColor(rgb(GREEN)).stroke();

      // Badge exercice
      doc.rect(ML, y, 90, 20).fill(rgb(GREEN));
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(8);
      doc.text("EXERCICE " + String(num).padStart(2,"0"), ML + 4, y + 7, { lineBreak: false });

      // Texte exercice
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(t, ML + 14, y + 26, { width: TW - 28, lineGap: 2 });
      y += boxH + 12;
    }

    // ── ENCADRÉ RETENIR ──
    function retainBox(text, section) {
      const t = clean(text);
      if (!t) return;
      doc.font("Helvetica-Bold").fontSize(10);
      const th = doc.heightOfString(t, { width: TW - 30, lineGap: 2 });
      const boxH = th + 44;
      ensureSpace(boxH + 10, section);

      doc.rect(ML, y, TW, boxH).lineWidth(1.5).strokeColor(rgb(YELLOW)).stroke();
      doc.moveTo(ML, y).lineTo(ML + TW, y).lineWidth(3).strokeColor(rgb(YELLOW)).stroke();

      doc.rect(ML, y, 80, 20).fill(rgb(YELLOW));
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(8);
      doc.text("A RETENIR", ML + 4, y + 7, { lineBreak: false });

      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(10);
      doc.text(t, ML + 14, y + 26, { width: TW - 28, lineGap: 2 });
      y += boxH + 12;
    }

    // ── LEÇON BLOC ──
    function lessonBlock(num, ch) {
      const leconTitle = clean(ch.title || "Lecon " + num);
      const content = clean(ch.content || "");

      newPage("LECON " + String(num).padStart(2,"0"));

      // Badge numéro leçon
      doc.rect(ML, y, 50, 50).fill(rgb(AC));
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(22);
      doc.text(String(num).padStart(2,"0"), ML, y + 14, { width: 50, align: "center", lineBreak: false });

      // Titre leçon
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(15);
      const titleH = doc.heightOfString(leconTitle, { width: TW - 60 });
      doc.text(leconTitle, ML + 60, y + 10, { width: TW - 60 });
      y += Math.max(56, titleH + 26);

      // Ligne accent
      doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(2).strokeColor(rgb(AC)).stroke();
      y += 14;

      // Durée estimée
      doc.fillColor(rgb(LGRAY)).font("Helvetica-Oblique").fontSize(9);
      doc.text("Duree estimee : 10 - 15 minutes  |  Difficulte : Accessible", ML, y, { lineBreak: false });
      y += 18;

      // Contenu de la leçon
      const paras = content.split(/\n+/).filter(p => p.trim().length > 5);
      const totalParas = paras.length;

      paras.forEach((para, i) => {
        const trimmed = para.trim();
        if (!trimmed) return;

        const isHeading = (
          (trimmed.endsWith(":") && trimmed.length < 80) ||
          trimmed.startsWith("**") ||
          (/^\d+[\.\)]\s/.test(trimmed) && trimmed.length < 100)
        );

        if (isHeading) {
          const headText = trimmed.replace(/\*\*/g, "").replace(/:$/, "").replace(/^\d+[\.\)]\s/, "");
          if (!headText || headText.length < 2) return;
          ensureSpace(40, "LECON " + num);
          y += 6;
          doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
          doc.text(headText, ML, y, { width: TW });
          y += doc.heightOfString(headText, { width: TW }) + 6;
        } else {
          writePara(trimmed, "LECON " + num);
        }
      });

      // Exercice pratique (tiré des 2 derniers paragraphes)
      y += 6;
      const exerciseText = paras.slice(-2).join(". ") ||
        "Applique immediatement ce que tu viens d'apprendre. Note tes observations et resultats.";
      exerciseBox(exerciseText.slice(0, 300), num, "LECON " + num);

      // A retenir (depuis key_takeaways)
      const retainText = (C.key_takeaways || [])[num - 1] ||
        "Cette lecon est une etape cle de ta formation. Reviens la relire si necessaire.";
      retainBox(retainText, "LECON " + num);
    }

    // ════════════════════════════════════════
    // PAGE 1 — COUVERTURE
    // ════════════════════════════════════════
    doc.addPage();
    pageNum++;

    doc.rect(0, 0, W, 5).fill(rgb(AC));

    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("MINI-FORMATION", 0, 22, { width: W, align: "center", characterSpacing: 3, lineBreak: false });

    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(26);
    const th = doc.heightOfString(title, { width: TW, align: "center" });
    doc.text(title, ML, 50, { width: TW, align: "center" });
    let cy = 50 + th + 18;

    doc.moveTo(W/2 - 50, cy).lineTo(W/2 + 50, cy).lineWidth(2.5).strokeColor(rgb(AC)).stroke();
    cy += 18;

    if (C.subtitle) {
      doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(12);
      const sh = doc.heightOfString(clean(C.subtitle), { width: TW, align: "center" });
      doc.text(clean(C.subtitle), ML, cy, { width: TW, align: "center" });
      cy += sh + 16;
    }

    // Infos formation
    const nbLecons = Math.min(chapters.length, 6);
    doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(10);
    doc.text(
      nbLecons + " lecons  |  Exercices pratiques  |  Plan d'action inclus",
      0, cy, { width: W, align: "center", lineBreak: false }
    );
    cy += 22;

    // Métriques
    const bW3 = (TW - 16) / 3;
    [
      { label: "Lecons", val: nbLecons + " modules", col: AC },
      { label: "Duree totale", val: (nbLecons * 12) + " minutes", col: GREEN },
      { label: "Niveau", val: "Accessible", col: ORANGE }
    ].forEach((m, i) => {
      const bx = ML + i * (bW3 + 8);
      doc.rect(bx, cy, bW3, 48).lineWidth(1).strokeColor(rgb(BORDER)).stroke();
      doc.moveTo(bx, cy).lineTo(bx + bW3, cy).lineWidth(3).strokeColor(rgb(m.col)).stroke();
      doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(8);
      doc.text(m.label, bx, cy + 9, { align: "center", width: bW3, lineBreak: false });
      doc.fillColor(rgb(m.col)).font("Helvetica-Bold").fontSize(13);
      doc.text(m.val, bx, cy + 26, { align: "center", width: bW3, lineBreak: false });
    });
    cy += 62;

    // Prix
    doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(10);
    doc.text("Prix :", 0, cy, { width: W, align: "center", lineBreak: false });
    cy += 18;
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(20);
    doc.text(clean(C.price_suggested || ""), 0, cy, { width: W, align: "center", lineBreak: false });

    // Formateur + marque
    doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(9);
    doc.text("Formateur : " + author, ML, H - 50, { lineBreak: false });
    doc.moveTo(ML, H - 46).lineTo(W - MR, H - 46).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
    doc.text("PDF Cash IA", 0, H - 36, { width: W, align: "center", lineBreak: false });
    doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(8);
    doc.text("pdfcash-ia.vercel.app", 0, H - 22, { width: W, align: "center", lineBreak: false });

    // ════════════════════════════════════════
    // PAGE 2 — PROGRAMME + OBJECTIFS
    // ════════════════════════════════════════
    newPage("PROGRAMME DE FORMATION");

    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(20);
    doc.text("Programme de Formation", ML, y);
    y += 26;
    doc.moveTo(ML, y).lineTo(ML + 30, y).lineWidth(3).strokeColor(rgb(AC)).stroke();
    y += 16;

    // Liste des leçons
    chapters.slice(0, 6).forEach((ch, i) => {
      ensureSpace(28, "PROGRAMME DE FORMATION");
      const num = i + 1;

      // Badge numéro
      doc.rect(ML, y, 26, 26).fill(rgb(AC));
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(10);
      doc.text(String(num).padStart(2,"0"), ML, y + 8, { width: 26, align: "center", lineBreak: false });

      // Titre leçon
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(11);
      doc.text(clean(ch.title || "Lecon " + num), ML + 34, y + 7, { width: TW - 60, lineBreak: false });

      // Durée
      doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(9);
      doc.text("~12 min", W - MR - 35, y + 9, { lineBreak: false });

      doc.moveTo(ML + 34, y + 24).lineTo(W - MR, y + 24).lineWidth(0.4).strokeColor(rgb(BORDER)).stroke();
      y += 30;
    });

    // Objectifs de la formation
    y += 14;
    doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
    y += 16;

    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(14);
    doc.text("Objectifs de la Formation", ML, y);
    y += 20;
    doc.moveTo(ML, y).lineTo(ML + 25, y).lineWidth(2).strokeColor(rgb(AC)).stroke();
    y += 12;

    (C.key_takeaways || []).slice(0, 5).forEach(k => {
      bullet(clean(k), "PROGRAMME DE FORMATION", GREEN);
    });

    // Description
    if (C.description) {
      y += 10;
      doc.fillColor(rgb(GRAY)).font("Helvetica-Oblique").fontSize(10);
      const dh = doc.heightOfString(clean(C.description), { width: TW, lineGap: 2 });
      ensureSpace(dh + 10, "PROGRAMME DE FORMATION");
      doc.text(clean(C.description), ML, y, { width: TW, lineGap: 2 });
      y += dh + 10;
    }

    // ════════════════════════════════════════
    // LEÇONS — 1 par page
    // ════════════════════════════════════════
    chapters.slice(0, 6).forEach((ch, i) => {
      lessonBlock(i + 1, ch);
    });

    // ════════════════════════════════════════
    // PAGE FINALE — PLAN D'ACTION
    // ════════════════════════════════════════
    newPage("PLAN D'ACTION");

    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(20);
    doc.text("Ton Plan d'Action", ML, y);
    y += 26;
    doc.moveTo(ML, y).lineTo(ML + 30, y).lineWidth(3).strokeColor(rgb(AC)).stroke();
    y += 16;

    doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(11);
    doc.text("Applique ces etapes dans les 48 heures qui suivent ta formation :", ML, y, { width: TW });
    y += 22;

    // Étapes du plan d'action
    const actions = (C.key_takeaways || []).slice(0, 5);
    actions.forEach((action, i) => {
      ensureSpace(55, "PLAN D'ACTION");
      const t = clean(action);

      // Numéro étape
      doc.rect(ML, y, 30, 30).fill(i < 3 ? rgb(AC) : rgb(GREEN));
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(13);
      doc.text(String(i + 1), ML, y + 9, { width: 30, align: "center", lineBreak: false });

      // Texte action
      doc.font("Helvetica").fontSize(10);
      const ah = doc.heightOfString(t, { width: TW - 44, lineGap: 2 });
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(t, ML + 40, y + 8, { width: TW - 44, lineGap: 2 });

      // Ligne checkbox
      const boxTop = y + Math.max(32, ah + 16);
      doc.moveTo(ML + 40, boxTop).lineTo(W - MR, boxTop)
        .lineWidth(0.4).strokeColor(rgb(BORDER)).stroke();

      y += Math.max(44, ah + 22);
    });

    // CTA final
    ensureSpace(80, "PLAN D'ACTION");
    y += 16;
    const ctaText = clean(C.call_to_action || "Applique ce que tu as appris et transforme ta vie !");
    doc.font("Helvetica-Bold").fontSize(12);
    const ctaH = doc.heightOfString(ctaText, { width: TW - 30, align: "center" });
    const ctaBox = ctaH + 40;
    doc.rect(ML, y, TW, ctaBox).lineWidth(2).strokeColor(rgb(AC)).stroke();
    doc.moveTo(ML, y).lineTo(ML + TW, y).lineWidth(4).strokeColor(rgb(AC)).stroke();
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(12);
    doc.text(ctaText, ML + 15, y + 14, { width: TW - 30, align: "center" });
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(13);
    doc.text(clean(C.price_suggested || ""), ML, y + ctaBox - 20, { align: "center", width: TW, lineBreak: false });
    y += ctaBox + 16;

    // Marque finale
    ensureSpace(30, "PLAN D'ACTION");
    y += 10;
    doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
    y += 10;
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("PDF Cash IA  -  pdfcash-ia.vercel.app", 0, y, { width: W, align: "center", lineBreak: false });

    // ── FINALISATION ──
    doc.end();
    await new Promise(resolve => doc.on("end", resolve));

    const buf = Buffer.concat(chunks);
    const fname = ((C.title || "formation")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "").replace(/ +/g, "_").slice(0, 40)) + "_Formation.pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch (err) {
    console.error("PDF-Formation error:", err);
    return res.status(500).json({ error: "Erreur PDF Formation: " + err.message });
  }
}
