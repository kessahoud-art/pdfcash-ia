import PDFDocument from 'pdfkit';

function clean(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[✅❌🔥💰📄📘🎯💼🎓🎬📱✓→←↓↑•]/g, '')
    .replace(/[^\x00-\x7E\u00C0-\u024F\u2018\u2019\u201C\u201D\u2013\u2014]/g, '')
    .replace(/\s+/g, ' ').trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { content: C, visuals: V, docLabel, color } = req.body || {};
  if (!C || !C.title) return res.status(400).json({ error: "Contenu manquant" });

  const col = color || { c1: "#1a0535", c2: "#0d1030", ac: "#7c3aed" };
  const pn = parseInt((C.price_suggested || "3000").replace(/\D/g, "")) || 3000;

  // Visuals map from client-generated data
  const visualsMap = {};
  if (V && Array.isArray(V)) {
    V.forEach(v => { if (v && v.chapter_index !== undefined) visualsMap[v.chapter_index] = v; });
  }

  function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#7c3aed");
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [124, 58, 237];
  }
  function rgb(arr) { return `rgb(${arr[0]},${arr[1]},${arr[2]})`; }
  function lgt(arr, a) { return [Math.min(arr[0]+a,255), Math.min(arr[1]+a,255), Math.min(arr[2]+a,255)]; }

  const AC = hexRgb(col.ac);
  const BG = hexRgb(col.c1);
  const W = 595.28, H = 841.89, M = 52, TW = W - M * 2;
  const BOTTOM = H - 60;

  try {
    const doc = new PDFDocument({
      size: "A4", margin: 0, autoFirstPage: false,
      info: { Title: clean(C.title), Author: clean(C.author) || "PDF Cash IA", Creator: "PDF Cash IA Premium" }
    });
    const chunks = [];
    doc.on("data", c => chunks.push(c));

    let y = 0, pageNum = 0;

    function addHeader(title, section) {
      doc.rect(0, 0, W, 30).fill(rgb([8, 8, 20]));
      doc.rect(0, 29, W, 1.5).fill(rgb(AC));
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text(clean(title).slice(0, 50).toUpperCase(), M, 11, { lineBreak: false });
      doc.fillColor(rgb([60, 60, 100])).font("Helvetica").fontSize(7);
      doc.text(clean(section), W - M - 130, 11, { width: 130, align: "right", lineBreak: false });
      doc.fillColor(rgb(lgt(AC, 80))).font("Helvetica-Bold").fontSize(6);
      doc.text("PREMIUM", W - M - 42, 20, { lineBreak: false });
      return 47;
    }

    function addFooter(n) {
      doc.rect(0, H - 24, W, 24).fill(rgb([6, 6, 16]));
      doc.fillColor(rgb([50, 50, 90])).font("Helvetica").fontSize(7);
      doc.text("PDF Cash IA Premium  -  pdfcash-ia.vercel.app", 0, H - 14, { align: "center", width: W, lineBreak: false });
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text(String(n), W - M, H - 14, { lineBreak: false });
    }

    function newPage(title, section) {
      doc.addPage(); pageNum++;
      addFooter(pageNum);
      y = addHeader(title, section);
    }

    function ensureSpace(needed, title, section) {
      if (y + needed > BOTTOM) newPage(title, section);
    }

    // ── DRAW VISUAL (client-generated data) ──
    function drawVisual(visual, title, section) {
      if (!visual || !visual.type || !visual.data) return;
      const d = visual.data;

      if (visual.type === "steps" && d.steps && d.steps.length) {
        const steps = d.steps.slice(0, 6);
        const boxH = 24 + steps.length * 28 + 14;
        ensureSpace(boxH + 14, title, section);
        y += 6;

        // Header bar
        doc.rect(M, y, TW, 22).fill(rgb(BG));
        doc.fillColor(rgb(lgt(AC, 80))).font("Helvetica-Bold").fontSize(10);
        doc.text(clean(d.title || "Etapes cles"), M + 10, y + 7, { lineBreak: false });
        y += 22;

        steps.forEach((step, i) => {
          ensureSpace(30, title, section);
          doc.rect(M, y, TW, 26).fill(i % 2 === 0 ? rgb([245, 245, 255]) : rgb([238, 238, 250]));
          // Number circle
          doc.circle(M + 16, y + 13, 10).fill(rgb(AC));
          doc.fillColor(rgb([255, 255, 255])).font("Helvetica-Bold").fontSize(9);
          doc.text(String(i + 1), M + 16, y + 8, { align: "center", width: 0, lineBreak: false });
          // Step text
          doc.fillColor(rgb([40, 42, 70])).font("Helvetica").fontSize(11);
          doc.text(clean(step), M + 34, y + 8, { width: TW - 42, lineBreak: false });
          y += 26;
        });
        y += 12;
      }

      else if (visual.type === "chart" && d.values && d.values.length) {
        const values = d.values.slice(0, 5);
        const chartH = 22 + values.length * 32 + 14;
        ensureSpace(chartH + 14, title, section);
        y += 6;

        doc.rect(M, y, TW, 22).fill(rgb(BG));
        doc.fillColor(rgb(lgt(AC, 80))).font("Helvetica-Bold").fontSize(10);
        doc.text(clean(d.title || "Donnees"), M + 10, y + 7, { lineBreak: false });
        y += 22;

        const maxVal = Math.max(...values.map(v => Number(v.value) || 0)) || 1;
        values.forEach((item, i) => {
          ensureSpace(34, title, section);
          doc.rect(M, y, TW, 28).fill(i % 2 === 0 ? rgb([245, 250, 247]) : rgb([238, 248, 242]));
          doc.fillColor(rgb([45, 50, 70])).font("Helvetica").fontSize(10);
          doc.text(clean(item.label || ""), M + 8, y + 9, { lineBreak: false, width: 110 });
          const barW = Math.max(((Number(item.value) || 0) / maxVal) * (TW - 185), 4);
          doc.rect(M + 120, y + 9, barW, 12).fill(rgb(AC));
          doc.fillColor(rgb([16, 185, 129])).font("Helvetica-Bold").fontSize(10);
          const valStr = (Number(item.value) || 0).toLocaleString("fr-FR") + " " + clean(item.unit || "FCFA");
          doc.text(valStr, M + TW - 88, y + 9, { lineBreak: false, width: 84, align: "right" });
          y += 28;
        });
        y += 12;
      }

      else if (visual.type === "highlight" && d.points && d.points.length) {
        const points = d.points.slice(0, 5);
        const boxH = 24 + points.length * 22 + 10;
        ensureSpace(boxH + 14, title, section);
        y += 6;

        doc.rect(M, y, TW, boxH).fill(rgb([240, 248, 255]));
        doc.rect(M, y, TW, 22).fill(rgb(BG));
        doc.rect(M, y, TW, 3).fill(rgb(AC));
        doc.fillColor(rgb(lgt(AC, 80))).font("Helvetica-Bold").fontSize(10);
        doc.text(clean(d.title || "Points importants"), M + 10, y + 8, { lineBreak: false });
        y += 22;

        points.forEach(point => {
          ensureSpace(24, title, section);
          doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
          doc.text(">", M + 8, y + 2, { lineBreak: false });
          doc.fillColor(rgb([38, 48, 78])).font("Helvetica").fontSize(11);
          doc.text(clean(point), M + 22, y + 2, { width: TW - 30, lineBreak: false });
          y += 22;
        });
        y += 8;
      }

      else if (visual.type === "quote" && d.text) {
        const qText = clean(d.text);
        doc.font("Helvetica-Oblique").fontSize(12);
        const qh = doc.heightOfString(qText, { width: TW - 36 });
        const boxH = qh + 32;
        ensureSpace(boxH + 14, title, section);
        y += 6;

        doc.rect(M, y, TW, boxH).fill(rgb([245, 245, 255]));
        doc.rect(M, y, 4, boxH).fill(rgb(AC));
        doc.rect(M + TW - 4, y, 4, boxH).fill(rgb(AC));
        doc.fillColor(rgb(lgt(AC, 60))).font("Helvetica-Bold").fontSize(20);
        doc.text('"', M + 12, y + 3, { lineBreak: false });
        doc.fillColor(rgb([48, 50, 80])).font("Helvetica-Oblique").fontSize(12);
        doc.text(qText, M + 24, y + 14, { width: TW - 38 });
        if (d.source) {
          doc.fillColor(rgb([90, 90, 140])).font("Helvetica-Bold").fontSize(9);
          doc.text("- " + clean(d.source), M + 24, y + boxH - 12, { lineBreak: false });
        }
        y += boxH + 12;
      }
    }

    // ══ COVER ══
    doc.addPage(); pageNum++;
    doc.rect(0, 0, W, H).fill(rgb(BG));
    doc.circle(W - 60, 100, 120).fillOpacity(0.06).fill(rgb(AC)).fillOpacity(1);
    doc.circle(60, H - 100, 80).fillOpacity(0.05).fill(rgb(lgt(AC, 30))).fillOpacity(1);
    doc.rect(0, 0, W, 6).fill(rgb(AC));
    doc.rect(W * 0.38, 0, W * 0.32, 6).fill(rgb(lgt(AC, 50)));
    addFooter(pageNum);

    let cy = 36;
    doc.fillColor(rgb(lgt(AC, 80))).font("Helvetica-Bold").fontSize(9);
    doc.text(clean(docLabel || "DOCUMENT").toUpperCase() + "  -  EDITION PREMIUM", M, cy, { lineBreak: false });
    cy += 28;

    const titleText = clean(C.title);
    doc.fillColor(rgb([240, 240, 255])).font("Helvetica-Bold").fontSize(24);
    const th = doc.heightOfString(titleText, { width: TW - 20 });
    doc.text(titleText, M, cy, { width: TW - 20 });
    cy += th + 14;

    if (C.subtitle) {
      doc.fillColor(rgb([160, 160, 195])).font("Helvetica").fontSize(12);
      const sh = doc.heightOfString(clean(C.subtitle), { width: TW - 20 });
      doc.text(clean(C.subtitle), M, cy, { width: TW - 20 });
      cy += sh + 14;
    }

    if (C.tagline) {
      doc.rect(M, cy, 3, 28).fill(rgb(AC));
      doc.fillColor(rgb(lgt(AC, 90))).font("Helvetica-Oblique").fontSize(12);
      doc.text('"' + clean(C.tagline) + '"', M + 12, cy + 4, { width: TW - 16 });
      cy += 40;
    }

    doc.rect(M, cy, 220, 28).fill(rgb([8, 50, 28]));
    doc.rect(M, cy, 3, 28).fill(rgb([16, 185, 129]));
    doc.fillColor(rgb([74, 222, 128])).font("Helvetica-Bold").fontSize(12);
    doc.text("Prix conseille : " + clean(C.price_suggested || ""), M + 10, cy + 9, { lineBreak: false });
    cy += 40;

    doc.fillColor(rgb([80, 80, 120])).font("Helvetica").fontSize(10);
    doc.text((C.chapters || []).length + " chapitres  -  Visuels inclus  -  Exemples en FCFA", M, cy);

    doc.rect(0, H - 36, W, 36).fill(rgb([0, 0, 0]));
    doc.fillColor(rgb([80, 80, 120])).font("Helvetica").fontSize(9);
    doc.text("Par " + clean(C.author || "Expert Digital"), M, H - 22, { lineBreak: false });
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("PDF Cash IA  -  Edition Premium", W - M - 140, H - 22, { lineBreak: false });

    // ══ TABLE DES MATIERES ══
    newPage(C.title, "TABLE DES MATIERES");
    doc.fillColor(rgb([30, 30, 60])).font("Helvetica-Bold").fontSize(20);
    doc.text("Table des Matieres", M, y);
    y += 26;
    doc.rect(M, y, 20, 3).fill(rgb(AC));
    y += 12;

    (C.table_of_contents || []).forEach((item, i) => {
      ensureSpace(22, C.title, "TABLE DES MATIERES");
      doc.rect(M, y - 3, TW, 18).fill(i % 2 === 0 ? rgb([245, 245, 252]) : rgb([238, 238, 248]));
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
      doc.text(String(i + 1).padStart(2, "0"), M + 5, y + 2, { lineBreak: false, width: 22 });
      doc.fillColor(rgb([40, 42, 68])).font("Helvetica").fontSize(11);
      doc.text(clean(item), M + 30, y + 2, { width: TW - 40, lineBreak: false });
      y += 20;
    });

    // ══ CHAPTERS WITH VISUALS ══
    newPage(C.title, "CHAPITRES");

    (C.chapters || []).forEach((ch, ci) => {
      const chTitle = clean(ch.title || "Chapitre " + (ci + 1));
      doc.font("Helvetica-Bold").fontSize(15);
      const titleH = doc.heightOfString(chTitle, { width: TW - 16 });
      ensureSpace(titleH + 36 + 50, C.title, chTitle.slice(0, 35));

      doc.fillColor(rgb([120, 120, 160])).font("Helvetica-Bold").fontSize(8);
      doc.text("CHAPITRE " + String(ci + 1).padStart(2, "0"), M, y, { lineBreak: false });
      y += 12;

      const boxH = titleH + 18;
      doc.rect(M, y, TW, boxH).fill(rgb(BG));
      doc.rect(M, y, 5, boxH).fill(rgb(AC));
      doc.fillColor(rgb([235, 235, 255])).font("Helvetica-Bold").fontSize(15);
      doc.text(chTitle, M + 14, y + 9, { width: TW - 22 });
      y += boxH + 14;

      // Content
      const content = clean(ch.content || "");
      const paras = content.split(/\n+/).filter(p => p.trim().length > 2);
      doc.fillColor(rgb([50, 55, 75])).font("Helvetica").fontSize(11);

      paras.forEach(para => {
        const trimmed = para.trim();
        if (!trimmed || trimmed.length < 3) return;

        const isHeading = (
          (trimmed.endsWith(":") && trimmed.length < 80) ||
          trimmed.startsWith("**") ||
          (/^\d+[\.\)]\s/.test(trimmed) && trimmed.length < 100 && trimmed.length > 5)
        );

        if (isHeading) {
          const headText = trimmed.replace(/\*\*/g, "").replace(/:$/, "").replace(/^\d+[\.\)]\s/, "");
          if (!headText || headText.length < 2) return;
          doc.font("Helvetica-Bold").fontSize(12);
          const hh = doc.heightOfString(headText, { width: TW });
          ensureSpace(hh + 45, C.title, chTitle.slice(0, 35));
          y += 5;
          doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(12);
          doc.text(headText, M, y, { width: TW });
          y += hh + 7;
          doc.fillColor(rgb([50, 55, 75])).font("Helvetica").fontSize(11);
        } else {
          doc.font("Helvetica").fontSize(11);
          const ph = doc.heightOfString(trimmed, { width: TW, lineGap: 1.5 });
          ensureSpace(ph + 4, C.title, chTitle.slice(0, 35));
          doc.fillColor(rgb([50, 55, 75])).font("Helvetica").fontSize(11);
          doc.text(trimmed, M, y, { width: TW, align: "justify", lineGap: 1.5 });
          y += ph + 9;
        }
      });

      // Draw visual after chapter content
      const visual = visualsMap[ci];
      if (visual) {
        drawVisual(visual, C.title, chTitle.slice(0, 35));
      }

      // Thin separator
      if (ci < (C.chapters || []).length - 1) {
        ensureSpace(16, C.title, "CHAPITRES");
        y += 4;
        doc.rect(M + TW / 3, y, TW / 3, 0.7).fill(rgb([50, 50, 80]));
        y += 12;
      }
    });

    // ══ KEY TAKEAWAYS ══
    if (y > BOTTOM * 0.65) newPage(C.title, "POINTS CLES");
    else { y += 18; doc.rect(M, y, TW, 1).fill(rgb(AC)); y += 14; }

    doc.fillColor(rgb([30, 30, 60])).font("Helvetica-Bold").fontSize(20);
    doc.text("Points Cles a Retenir", M, y);
    y += 26;
    doc.rect(M, y, 20, 3).fill(rgb([16, 185, 129]));
    y += 12;

    (C.key_takeaways || []).forEach(k => {
      const kText = clean(k);
      if (!kText) return;
      doc.font("Helvetica").fontSize(11);
      const kh = doc.heightOfString(kText, { width: TW - 34, lineGap: 1.5 });
      const bh = Math.max(kh + 14, 28);
      ensureSpace(bh + 8, C.title, "POINTS CLES");
      doc.rect(M, y - 3, TW, bh).fill(rgb([238, 252, 244]));
      doc.rect(M, y - 3, 4, bh).fill(rgb([16, 185, 129]));
      doc.fillColor(rgb([16, 185, 129])).font("Helvetica-Bold").fontSize(13);
      doc.text("v", M + 8, y + 3, { lineBreak: false });
      doc.fillColor(rgb([20, 95, 50])).font("Helvetica").fontSize(11);
      doc.text(kText, M + 26, y + 3, { width: TW - 38, lineGap: 1.5 });
      y += bh + 7;
    });

    // ══ CONCLUSION ══
    if (y > BOTTOM * 0.55) newPage(C.title, "CONCLUSION");
    else y += 18;

    const ctaText = clean(C.call_to_action || "Passe a l'action maintenant !");
    doc.font("Helvetica-Bold").fontSize(13);
    const ctaH = doc.heightOfString(ctaText, { width: TW - 24, align: "center" });
    const ctaBox = ctaH + 46;
    ensureSpace(ctaBox + 85, C.title, "CONCLUSION");

    doc.rect(M, y, TW, ctaBox).fill(rgb(BG));
    doc.rect(M, y, TW, ctaBox).lineWidth(1.5).stroke(rgb(AC));
    doc.rect(M, y, TW, 5).fill(rgb(AC));
    doc.fillColor(rgb([235, 235, 255])).font("Helvetica-Bold").fontSize(13);
    doc.text(ctaText, M + 12, y + 16, { width: TW - 24, align: "center" });
    doc.fillColor(rgb([74, 222, 128])).font("Helvetica-Bold").fontSize(13);
    doc.text(clean(C.price_suggested || ""), M, y + ctaBox - 18, { align: "center", width: TW, lineBreak: false });
    y += ctaBox + 20;

    ensureSpace(65, C.title, "CONCLUSION");
    doc.fillColor(rgb([45, 48, 70])).font("Helvetica-Bold").fontSize(11);
    doc.text("POTENTIEL DE REVENUS", M, y);
    y += 14;

    const bW = (TW - 16) / 3;
    [[10, "10 ventes"], [50, "50 ventes"], [100, "100 ventes"]].forEach(([qty, lbl], i) => {
      const bx = M + i * (bW + 8);
      doc.rect(bx, y, bW, 38).fill(rgb([248, 250, 252]));
      doc.rect(bx, y, bW, 3).fill(rgb(AC));
      doc.fillColor(rgb([90, 110, 130])).font("Helvetica").fontSize(9);
      doc.text(lbl, bx, y + 8, { align: "center", width: bW, lineBreak: false });
      doc.fillColor(rgb([16, 185, 129])).font("Helvetica-Bold").fontSize(12);
      doc.text((pn * qty).toLocaleString("fr-FR") + " F", bx, y + 20, { align: "center", width: bW, lineBreak: false });
    });
    y += 50;

    if (C.sales_message) {
      ensureSpace(70, C.title, "CONCLUSION");
      doc.fillColor(rgb([0, 120, 60])).font("Helvetica-Bold").fontSize(10);
      doc.text("MESSAGE DE VENTE WHATSAPP", M, y);
      y += 13;
      const msgText = clean(C.sales_message);
      const mh = doc.heightOfString(msgText, { width: TW - 14, lineGap: 1.5 });
      doc.rect(M, y - 3, TW, mh + 16).fill(rgb([234, 252, 242]));
      doc.rect(M, y - 3, 3, mh + 16).fill(rgb([37, 211, 102]));
      doc.fillColor(rgb([18, 75, 42])).font("Helvetica").fontSize(10);
      doc.text(msgText, M + 10, y + 4, { width: TW - 18, lineGap: 1.5 });
    }

    doc.end();
    await new Promise(resolve => doc.on("end", resolve));

    const buf = Buffer.concat(chunks);
    const fname = ((C.title || "document")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "").replace(/ +/g, "_").slice(0, 45)) + "_premium.pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch (err) {
    console.error("PDF Premium error:", err);
    return res.status(500).json({ error: "Erreur PDF Premium: " + err.message });
  }
}
