import PDFDocument from 'pdfkit';

// Remove emojis and special chars that PDFKit can't render
function clean(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')  // emojis
    .replace(/[\u{2600}-\u{27BF}]/gu, '')     // misc symbols
    .replace(/[✅❌🔥💰📄📘🎯💼🎓🎬📱✓→←↓↑•]/g, '')
    .replace(/[^\x00-\x7E\u00C0-\u024F\u2018\u2019\u201C\u201D\u2013\u2014]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanKeep(str) {
  // Keep basic punctuation and latin chars, remove emojis only
  if (!str) return '';
  return String(str)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[✅❌🔥💰📄📘🎯💼🎓🎬📱]/g, '')
    .trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { content: C, docLabel, color } = req.body || {};
  if (!C || !C.title) return res.status(400).json({ error: "Contenu manquant" });

  const col = color || { c1: "#1a0535", c2: "#0d1030", ac: "#7c3aed" };
  const pn = parseInt((C.price_suggested || "3000").replace(/\D/g, "")) || 3000;

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
      info: { Title: clean(C.title), Author: clean(C.author) || "PDF Cash IA", Creator: "PDF Cash IA" }
    });
    const chunks = [];
    doc.on("data", c => chunks.push(c));

    let y = 0, pageNum = 0;

    function addHeader(title, section) {
      doc.rect(0, 0, W, 28).fill(rgb([10, 10, 22]));
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text(clean(title).slice(0, 50).toUpperCase(), M, 10, { lineBreak: false });
      doc.fillColor(rgb([80, 80, 120])).font("Helvetica").fontSize(7);
      doc.text(clean(section), W - M - 120, 10, { width: 120, align: "right", lineBreak: false });
      doc.rect(0, 27, W, 1.5).fill(rgb(AC));
      return 44;
    }

    function addFooter(n) {
      doc.rect(0, H - 22, W, 22).fill(rgb([8, 8, 18]));
      doc.fillColor(rgb([60, 60, 100])).font("Helvetica").fontSize(7);
      doc.text("PDF Cash IA  -  pdfcash-ia.vercel.app", 0, H - 13, { align: "center", width: W, lineBreak: false });
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text(String(n), W - M, H - 13, { lineBreak: false });
    }

    function newPage(title, section) {
      doc.addPage(); pageNum++;
      addFooter(pageNum);
      y = addHeader(title, section);
    }

    function ensureSpace(needed, title, section) {
      if (y + needed > BOTTOM) newPage(title, section);
    }

    // ══ PAGE 1: COVER ══
    doc.addPage(); pageNum++;

    // Background
    doc.rect(0, 0, W, H).fill(rgb(BG));
    // Subtle circle decorations
    doc.circle(W - 60, 100, 120).fillOpacity(0.06).fill(rgb(AC)).fillOpacity(1);
    doc.circle(60, H - 100, 80).fillOpacity(0.05).fill(rgb(lgt(AC, 30))).fillOpacity(1);
    // Top bar
    doc.rect(0, 0, W, 6).fill(rgb(AC));
    doc.rect(W * 0.38, 0, W * 0.32, 6).fill(rgb(lgt(AC, 50)));
    addFooter(pageNum);

    let cy = 36;

    // Type label
    doc.fillColor(rgb(lgt(AC, 80))).font("Helvetica-Bold").fontSize(9);
    doc.text(clean(docLabel || "DOCUMENT").toUpperCase(), M, cy, { lineBreak: false });
    cy += 28;

    // Title
    const titleText = clean(C.title);
    doc.fillColor(rgb([240, 240, 255])).font("Helvetica-Bold").fontSize(24);
    const th = doc.heightOfString(titleText, { width: TW - 20 });
    doc.text(titleText, M, cy, { width: TW - 20 });
    cy += th + 14;

    // Subtitle
    if (C.subtitle) {
      const subText = clean(C.subtitle);
      doc.fillColor(rgb([160, 160, 195])).font("Helvetica").fontSize(12);
      const sh = doc.heightOfString(subText, { width: TW - 20 });
      doc.text(subText, M, cy, { width: TW - 20 });
      cy += sh + 14;
    }

    // Tagline
    if (C.tagline) {
      const tagText = '"' + clean(C.tagline) + '"';
      doc.rect(M, cy, 3, 28).fill(rgb(AC));
      doc.fillColor(rgb(lgt(AC, 90))).font("Helvetica-Oblique").fontSize(12);
      const tagh = doc.heightOfString(tagText, { width: TW - 16 });
      doc.text(tagText, M + 12, cy + 4, { width: TW - 16 });
      cy += Math.max(tagh + 16, 36);
    }

    // Price box
    const priceText = "Prix conseille : " + clean(C.price_suggested || "");
    doc.rect(M, cy, 220, 28).fill(rgb([8, 50, 28]));
    doc.rect(M, cy, 3, 28).fill(rgb([16, 185, 129]));
    doc.fillColor(rgb([74, 222, 128])).font("Helvetica-Bold").fontSize(12);
    doc.text(priceText, M + 10, cy + 9, { lineBreak: false });
    cy += 40;

    // Chapter count
    doc.fillColor(rgb([80, 80, 120])).font("Helvetica").fontSize(10);
    doc.text((C.chapters || []).length + " chapitres  -  Exemples en FCFA  -  Contexte africain", M, cy);

    // Cover footer bar
    doc.rect(0, H - 36, W, 36).fill(rgb([0, 0, 0]));
    doc.fillColor(rgb([80, 80, 120])).font("Helvetica").fontSize(9);
    doc.text("Par " + clean(C.author || "Expert Digital"), M, H - 22, { lineBreak: false });
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("PDF Cash IA", W - M - 70, H - 22, { lineBreak: false });

    // ══ TABLE DES MATIERES ══
    newPage(C.title, "TABLE DES MATIERES");

    doc.fillColor(rgb([30, 30, 60])).font("Helvetica-Bold").fontSize(20);
    doc.text("Table des Matieres", M, y);
    y += 28;
    doc.rect(M, y, 20, 3).fill(rgb(AC));
    y += 12;

    (C.table_of_contents || []).forEach((item, i) => {
      ensureSpace(22, C.title, "TABLE DES MATIERES");
      doc.rect(M, y - 3, TW, 18).fill(i % 2 === 0 ? rgb([245, 245, 252]) : rgb([238, 238, 248]));
      // Number
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
      doc.text(String(i + 1).padStart(2, "0"), M + 5, y + 2, { lineBreak: false, width: 22 });
      // Text
      doc.fillColor(rgb([40, 42, 68])).font("Helvetica").fontSize(11);
      doc.text(clean(item), M + 30, y + 2, { width: TW - 40, lineBreak: false });
      y += 20;
    });

    if (C.description) {
      y += 10;
      ensureSpace(40, C.title, "TABLE DES MATIERES");
      doc.rect(M, y, TW, 0.5).fill(rgb([200, 200, 220]));
      y += 10;
      doc.fillColor(rgb([90, 90, 130])).font("Helvetica-Oblique").fontSize(11);
      const descH = doc.heightOfString(clean(C.description), { width: TW });
      doc.text(clean(C.description), M, y, { width: TW });
      y += descH + 8;
    }

    // ══ CHAPTERS - NO FORCED PAGE BREAKS ══
    newPage(C.title, "CHAPITRES");

    (C.chapters || []).forEach((ch, ci) => {
      const chTitle = clean(ch.title || "Chapitre " + (ci + 1));

      // Smart widow prevention: if heading + min content won't fit, new page
      doc.font("Helvetica-Bold").fontSize(15);
      const titleH = doc.heightOfString(chTitle, { width: TW - 16 });
      ensureSpace(titleH + 36 + 50, C.title, chTitle.slice(0, 35));

      // Chapter number
      doc.fillColor(rgb([120, 120, 160])).font("Helvetica-Bold").fontSize(8);
      doc.text("CHAPITRE " + String(ci + 1).padStart(2, "0"), M, y, { lineBreak: false });
      y += 12;

      // Chapter title box
      const boxH = titleH + 18;
      doc.rect(M, y, TW, boxH).fill(rgb(BG));
      doc.rect(M, y, 5, boxH).fill(rgb(AC));
      doc.fillColor(rgb([235, 235, 255])).font("Helvetica-Bold").fontSize(15);
      doc.text(chTitle, M + 14, y + 9, { width: TW - 22 });
      y += boxH + 14;

      // Chapter content - paragraph by paragraph, no forced breaks
      const content = clean(ch.content || "");
      const paras = content.split(/\n+/).filter(p => p.trim().length > 2);

      doc.fillColor(rgb([50, 55, 75])).font("Helvetica").fontSize(11);

      paras.forEach(para => {
        const trimmed = para.trim();
        if (!trimmed || trimmed.length < 3) return;

        // Detect sub-heading: ends with colon, or short + bold marker, or numbered step
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
          // Widow prevention: don't leave heading alone at bottom
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

      // Thin separator between chapters (NOT a page break)
      if (ci < (C.chapters || []).length - 1) {
        ensureSpace(18, C.title, "CHAPITRES");
        y += 5;
        doc.rect(M + TW / 3, y, TW / 3, 0.7).fill(rgb([50, 50, 80]));
        y += 12;
      }
    });

    // ══ KEY TAKEAWAYS ══
    // Only new page if less than 35% space remains
    if (y > BOTTOM * 0.65) {
      newPage(C.title, "POINTS CLES");
    } else {
      y += 18;
      doc.rect(M, y, TW, 1).fill(rgb(AC));
      y += 14;
    }

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

    // ══ FINAL PAGE ══
    if (y > BOTTOM * 0.55) {
      newPage(C.title, "CONCLUSION");
    } else {
      y += 18;
    }

    // CTA box
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

    // Revenue table
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

    // Sales message
    if (C.sales_message) {
      ensureSpace(75, C.title, "CONCLUSION");
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
      .replace(/[^a-zA-Z0-9 ]/g, "").replace(/ +/g, "_").slice(0, 45)) + ".pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch (err) {
    console.error("PDF error:", err);
    return res.status(500).json({ error: "Erreur PDF: " + err.message });
  }
}
