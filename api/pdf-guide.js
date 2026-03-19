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
  const col = color || { ac: "#059669" };
  function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#059669");
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [5,150,105];
  }
  function rgb(arr) { return `rgb(${arr[0]},${arr[1]},${arr[2]})`; }
  function lgt(arr, a) { return arr.map(v => Math.min(v + a, 255)); }

  const AC    = hexRgb(col.ac || col.c1 || "#059669");
  const DARK  = [15, 20, 35];
  const GRAY  = [90, 95, 120];
  const LGRAY = [160, 165, 185];
  const BORDER= [215, 220, 232];
  const ORANGE= [217, 119, 6];
  const RED   = [185, 28, 28];

  const W = 595.28;
  const H = 841.89;
  const ML = 55;
  const MR = 55;
  const TW = W - ML - MR;
  const BOTTOM = H - 45;

  const author   = clean(authorName || C.author || 'Coach Business Afrique');
  const title    = clean(C.title || 'Guide Pratique');
  const chapters = C.chapters || [];
  const pn = parseInt((C.price_suggested || "5000").replace(/\D/g, "")) || 5000;

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
      if (y + needed > BOTTOM) newPage(section || "GUIDE PRATIQUE");
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
    function bullet(text, section, col) {
      const t = clean(text);
      if (!t) return;
      const c = col || AC;
      doc.font("Helvetica").fontSize(10);
      const ph = doc.heightOfString(t, { width: TW - 16, lineGap: 2 });
      ensureSpace(ph + 8, section);
      doc.fillColor(rgb(c)).font("Helvetica-Bold").fontSize(12);
      doc.text("-", ML, y, { lineBreak: false });
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(t, ML + 14, y, { width: TW - 16, lineGap: 2 });
      y += ph + 10;
    }

    // ── ENCADRÉ CONSEIL ──
    function conseilBox(text, section) {
      const t = clean(text);
      if (!t) return;
      doc.font("Helvetica").fontSize(10);
      const th = doc.heightOfString(t, { width: TW - 30, lineGap: 2 });
      const boxH = th + 44;
      ensureSpace(boxH + 10, section);
      doc.rect(ML, y, TW, boxH).lineWidth(1.5).strokeColor(rgb(AC)).stroke();
      doc.moveTo(ML, y).lineTo(ML + TW, y).lineWidth(3).strokeColor(rgb(AC)).stroke();
      doc.moveTo(ML, y).lineTo(ML, y + boxH).lineWidth(4).strokeColor(rgb(AC)).stroke();
      doc.rect(ML, y, 70, 20).fill(rgb(AC));
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(8);
      doc.text("CONSEIL PRO", ML + 4, y + 7, { lineBreak: false });
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(t, ML + 14, y + 26, { width: TW - 28, lineGap: 2 });
      y += boxH + 12;
    }

    // ── ENCADRÉ ERREUR ──
    function erreurBox(text, section) {
      const t = clean(text);
      if (!t) return;
      doc.font("Helvetica").fontSize(10);
      const th = doc.heightOfString(t, { width: TW - 30, lineGap: 2 });
      const boxH = th + 44;
      ensureSpace(boxH + 10, section);
      doc.rect(ML, y, TW, boxH).lineWidth(1.5).strokeColor(rgb(RED)).stroke();
      doc.moveTo(ML, y).lineTo(ML + TW, y).lineWidth(3).strokeColor(rgb(RED)).stroke();
      doc.moveTo(ML, y).lineTo(ML, y + boxH).lineWidth(4).strokeColor(rgb(RED)).stroke();
      doc.rect(ML, y, 100, 20).fill(rgb(RED));
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(8);
      doc.text("ERREUR A EVITER", ML + 4, y + 7, { lineBreak: false });
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(t, ML + 14, y + 26, { width: TW - 28, lineGap: 2 });
      y += boxH + 12;
    }

    // ── ENCADRÉ ACTION ──
    function actionBox(text, section) {
      const t = clean(text);
      if (!t) return;
      doc.font("Helvetica-Bold").fontSize(10);
      const th = doc.heightOfString(t, { width: TW - 30, lineGap: 2 });
      const boxH = th + 44;
      ensureSpace(boxH + 10, section);
      doc.rect(ML, y, TW, boxH).lineWidth(1.5).strokeColor(rgb(ORANGE)).stroke();
      doc.moveTo(ML, y).lineTo(ML + TW, y).lineWidth(3).strokeColor(rgb(ORANGE)).stroke();
      doc.moveTo(ML, y).lineTo(ML, y + boxH).lineWidth(4).strokeColor(rgb(ORANGE)).stroke();
      doc.rect(ML, y, 110, 20).fill(rgb(ORANGE));
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(8);
      doc.text("ACTION IMMEDIATE", ML + 4, y + 7, { lineBreak: false });
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(10);
      doc.text(t, ML + 14, y + 26, { width: TW - 28, lineGap: 2 });
      y += boxH + 12;
    }

    // ── ÉTAPE BLOC ──
    function etapeBlock(num, ch) {
      const etapeTitle = clean(ch.title || "Etape " + num);
      const content = clean(ch.content || "");

      newPage("ETAPE " + String(num).padStart(2, "0"));

      // Numéro étape — grand badge
      doc.rect(ML, y, 60, 60).fill(rgb(AC));
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(8);
      doc.text("ETAPE", ML, y + 10, { width: 60, align: "center", lineBreak: false });
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(24);
      doc.text(String(num).padStart(2,"0"), ML, y + 22, { width: 60, align: "center", lineBreak: false });

      // Titre étape
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(16);
      const titleH = doc.heightOfString(etapeTitle, { width: TW - 74 });
      doc.text(etapeTitle, ML + 70, y + 18, { width: TW - 74 });
      y += Math.max(68, titleH + 34);

      // Ligne accent
      doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(2).strokeColor(rgb(AC)).stroke();
      y += 14;

      // Résultat attendu
      doc.fillColor(rgb(LGRAY)).font("Helvetica-Oblique").fontSize(9);
      doc.text("Resultat attendu : appliquer cette etape en moins de 24 heures", ML, y, { lineBreak: false });
      y += 18;

      // Contenu de l'étape
      const paras = content.split(/\n+/).filter(p => p.trim().length > 5);
      const total = paras.length;

      // Séparer contenu en intro, étapes, erreur, conseil
      const intro    = paras.slice(0, Math.ceil(total * 0.25));
      const corps    = paras.slice(Math.ceil(total * 0.25), Math.ceil(total * 0.75));
      const fin      = paras.slice(Math.ceil(total * 0.75));

      // Introduction
      intro.forEach(p => {
        const t = p.trim();
        if (!t) return;
        const isHeading = (t.endsWith(":") && t.length < 80) || t.startsWith("**") || /^\d+[\.\)]\s/.test(t);
        if (isHeading) {
          const ht = t.replace(/\*\*/g,"").replace(/:$/,"").replace(/^\d+[\.\)]\s/,"");
          if (!ht) return;
          ensureSpace(30, "ETAPE " + num);
          y += 4;
          doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
          doc.text(ht, ML, y, { width: TW });
          y += doc.heightOfString(ht, { width: TW }) + 6;
        } else {
          writePara(t, "ETAPE " + num);
        }
      });

      // Corps — étapes détaillées
      corps.forEach(p => {
        const t = p.trim();
        if (!t) return;
        const isHeading = (t.endsWith(":") && t.length < 80) || t.startsWith("**") || /^\d+[\.\)]\s/.test(t);
        if (isHeading) {
          const ht = t.replace(/\*\*/g,"").replace(/:$/,"").replace(/^\d+[\.\)]\s/,"");
          if (!ht) return;
          ensureSpace(30, "ETAPE " + num);
          y += 4;
          doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
          doc.text(ht, ML, y, { width: TW });
          y += doc.heightOfString(ht, { width: TW }) + 6;
        } else {
          bullet(t, "ETAPE " + num);
        }
      });

      // Fin — erreur + conseil
      const erreur  = fin[0] ? fin[0].trim() : "";
      const conseil = fin[1] ? fin[1].trim() : "";
      const action  = fin[2] ? fin[2].trim() : "";

      if (erreur) {
        y += 4;
        erreurBox(erreur, "ETAPE " + num);
      }
      if (conseil) {
        conseilBox(conseil, "ETAPE " + num);
      }
      if (action) {
        actionBox(action, "ETAPE " + num);
      } else {
        // Action par défaut
        actionBox(
          "Applique immediatement cette etape. Note tes resultats et passe a l'etape suivante.",
          "ETAPE " + num
        );
      }
    }

    // ════════════════════════════════════════
    // PAGE 1 — COUVERTURE
    // ════════════════════════════════════════
    doc.addPage();
    pageNum++;

    doc.rect(0, 0, W, 5).fill(rgb(AC));

    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("GUIDE PRATIQUE", 0, 22, { width: W, align: "center", characterSpacing: 3, lineBreak: false });

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

    // Infos guide
    const nbEtapes = Math.min(chapters.length, 6);
    doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(10);
    doc.text(
      nbEtapes + " etapes  |  Actions immediates  |  Resultats mesurables",
      0, cy, { width: W, align: "center", lineBreak: false }
    );
    cy += 22;

    // Métriques
    const bW3 = (TW - 16) / 3;
    [
      { label: "Etapes", val: nbEtapes + " actions", col: AC },
      { label: "Application", val: "24h max", col: ORANGE },
      { label: "Resultat", val: "Mesurable", col: RED }
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

    // Auteur + marque
    doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(9);
    doc.text("Par : " + author, ML, H - 50, { lineBreak: false });
    doc.moveTo(ML, H - 46).lineTo(W - MR, H - 46).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
    doc.text("PDF Cash IA", 0, H - 36, { width: W, align: "center", lineBreak: false });
    doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(8);
    doc.text("pdfcash-ia.vercel.app", 0, H - 22, { width: W, align: "center", lineBreak: false });

    // ════════════════════════════════════════
    // PAGE 2 — VUE D'ENSEMBLE + PROMESSE
    // ════════════════════════════════════════
    newPage("VUE D'ENSEMBLE");

    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(20);
    doc.text("Vue d'ensemble du Guide", ML, y);
    y += 26;
    doc.moveTo(ML, y).lineTo(ML + 30, y).lineWidth(3).strokeColor(rgb(AC)).stroke();
    y += 16;

    // Liste des étapes avec flèche visuelle
    chapters.slice(0, 6).forEach((ch, i) => {
      ensureSpace(32, "VUE D'ENSEMBLE");
      const num = i + 1;
      const isLast = i === Math.min(chapters.length, 6) - 1;

      // Cercle numéro
      doc.circle(ML + 13, y + 13, 13).fill(rgb(AC));
      doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(10);
      doc.text(String(num), ML, y + 8, { width: 26, align: "center", lineBreak: false });

      // Titre étape
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(11);
      doc.text(clean(ch.title || "Etape " + num), ML + 34, y + 8, { width: TW - 50, lineBreak: false });

      // Flèche vers suivant
      if (!isLast) {
        doc.moveTo(ML + 13, y + 26).lineTo(ML + 13, y + 36)
          .lineWidth(1.5).strokeColor(rgb(AC)).dash(3, { space: 2 }).stroke();
        doc.undash();
      }
      y += isLast ? 30 : 38;
    });

    // Description
    if (C.description) {
      y += 14;
      doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
      y += 14;
      doc.fillColor(rgb(GRAY)).font("Helvetica-Oblique").fontSize(10);
      const dh = doc.heightOfString(clean(C.description), { width: TW, lineGap: 2 });
      ensureSpace(dh + 10, "VUE D'ENSEMBLE");
      doc.text(clean(C.description), ML, y, { width: TW, lineGap: 2 });
      y += dh + 10;
    }

    // Promesse principale
    y += 10;
    ensureSpace(60, "VUE D'ENSEMBLE");
    doc.rect(ML, y, TW, 52).lineWidth(1.5).strokeColor(rgb(AC)).stroke();
    doc.moveTo(ML, y).lineTo(ML + TW, y).lineWidth(3).strokeColor(rgb(AC)).stroke();
    doc.moveTo(ML, y).lineTo(ML, y + 52).lineWidth(4).strokeColor(rgb(AC)).stroke();
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(8);
    doc.text("PROMESSE", ML + 8, y + 7, { lineBreak: false, characterSpacing: 1 });
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(11);
    const promesse = clean(C.tagline || C.subtitle || "Applique ce guide et obtiens des resultats concrets en moins de 7 jours.");
    doc.text(promesse, ML + 10, y + 22, { width: TW - 20 });
    y += 60;

    // ════════════════════════════════════════
    // ÉTAPES — 1 par page
    // ════════════════════════════════════════
    chapters.slice(0, 6).forEach((ch, i) => {
      etapeBlock(i + 1, ch);
    });

    // ════════════════════════════════════════
    // PAGE FINALE — CHECKLIST + CTA
    // ════════════════════════════════════════
    newPage("CHECKLIST FINALE");

    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(20);
    doc.text("Checklist de Completion", ML, y);
    y += 26;
    doc.moveTo(ML, y).lineTo(ML + 30, y).lineWidth(3).strokeColor(rgb(AC)).stroke();
    y += 16;

    doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(10);
    doc.text("Coche chaque etape une fois completee :", ML, y, { width: TW });
    y += 18;

    // Checklist
    chapters.slice(0, 6).forEach((ch, i) => {
      ensureSpace(28, "CHECKLIST FINALE");
      // Checkbox vide
      doc.rect(ML, y + 2, 16, 16).lineWidth(1.5).strokeColor(rgb(AC)).stroke();
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text("Etape " + (i+1) + " : " + clean(ch.title || ""), ML + 24, y + 4, { width: TW - 24, lineBreak: false });
      doc.moveTo(ML + 24, y + 20).lineTo(W - MR, y + 20).lineWidth(0.3).strokeColor(rgb(BORDER)).stroke();
      y += 26;
    });

    // Points clés
    y += 14;
    doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
    y += 14;
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(14);
    doc.text("Points Cles a Retenir", ML, y);
    y += 20;
    doc.moveTo(ML, y).lineTo(ML + 25, y).lineWidth(2).strokeColor(rgb(AC)).stroke();
    y += 12;

    (C.key_takeaways || []).forEach(k => {
      const kText = clean(k);
      if (!kText) return;
      doc.font("Helvetica").fontSize(10);
      const kh = doc.heightOfString(kText, { width: TW - 16, lineGap: 2 });
      ensureSpace(kh + 14, "CHECKLIST FINALE");
      doc.moveTo(ML, y).lineTo(ML, y + kh + 4).lineWidth(3).strokeColor(rgb(AC)).stroke();
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(kText, ML + 12, y, { width: TW - 16, lineGap: 2 });
      y += kh + 14;
    });

    // CTA final
    ensureSpace(80, "CHECKLIST FINALE");
    y += 14;
    const ctaText = clean(C.call_to_action || "Commence l'etape 1 maintenant et transforme ta situation !");
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
    ensureSpace(30, "CHECKLIST FINALE");
    y += 10;
    doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
    y += 10;
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("PDF Cash IA  -  pdfcash-ia.vercel.app", 0, y, { width: W, align: "center", lineBreak: false });

    // ── FINALISATION ──
    doc.end();
    await new Promise(resolve => doc.on("end", resolve));

    const buf = Buffer.concat(chunks);
    const fname = ((C.title || "guide")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "").replace(/ +/g, "_").slice(0, 40)) + "_Guide.pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch (err) {
    console.error("PDF-Guide error:", err);
    return res.status(500).json({ error: "Erreur PDF Guide: " + err.message });
  }
}
