import PDFDocument from 'pdfkit';

// Remove all emojis and non-latin chars that PDFKit can't render
function clean(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\x00-\x7E\u00C0-\u024F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Default author names per document type
const DEFAULT_AUTHORS = {
  ebook:         'Expert Digital Afrique',
  guide:         'Coach Business Afrique',
  business_plan: 'Consultant Business',
  formation:     'Formateur Expert',
  tiktok:        'Expert Contenu Digital',
  cv:            'Expert Carriere Afrique',
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { content: C, docType, docLabel, color, authorName } = req.body || {};
  if (!C || !C.title) return res.status(400).json({ error: "Contenu manquant" });

  // ── COLOR SETUP ──
  const col = color || { c1: "#7c3aed", ac: "#7c3aed" };

  function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#7c3aed");
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [124,58,237];
  }
  function rgb(arr) { return `rgb(${arr[0]},${arr[1]},${arr[2]})`; }
  function lgt(arr, a) { return arr.map(v => Math.min(v + a, 255)); }
  function dkn(arr, a) { return arr.map(v => Math.max(v - a, 0)); }

  const AC  = hexRgb(col.ac || col.c1);   // main accent color
  const BG  = hexRgb(col.c1);             // cover accent (used for lines/text only)

  // ── PAGE DIMENSIONS ──
  const W      = 595.28;
  const H      = 841.89;
  const M      = 55;          // left/right margin
  const TW     = W - M * 2;   // text width
  const BOTTOM = H - 50;      // bottom limit before footer

  // ── AUTHOR ──
  const author = clean(
    authorName ||
    C.author ||
    DEFAULT_AUTHORS[docType] ||
    'Expert Digital Afrique'
  );

  // ── PRICE ──
  const pn = parseInt((C.price_suggested || "3000").replace(/\D/g, "")) || 3000;

  try {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      autoFirstPage: false,
      info: {
        Title:   clean(C.title),
        Author:  author,
        Creator: "PDF Cash IA",
      }
    });

    const chunks = [];
    doc.on("data", c => chunks.push(c));

    let y = 0, pageNum = 0;

    // ════════════════════════════════════════
    // HEADER — appears on every inner page
    // ════════════════════════════════════════
    function addHeader(docTitle, section) {
      doc.moveTo(0, 0).lineTo(W, 0).lineWidth(3).strokeColor(rgb(AC)).stroke();
      doc.fillColor(rgb([80, 85, 110])).font("Helvetica-Bold").fontSize(7);
      doc.text(
        clean(docTitle).slice(0, 55),
        M, 8,
        { lineBreak: false }
      );
      doc.fillColor(rgb([160, 165, 185])).font("Helvetica").fontSize(7);
      doc.text(
        clean(section),
        W - M - 130, 8,
        { width: 130, align: "right", lineBreak: false }
      );
      doc.moveTo(M, 20).lineTo(W - M, 20).lineWidth(0.5).strokeColor(rgb([210, 215, 230])).stroke();
      return 32;
    }

    // ════════════════════════════════════════
    // FOOTER — appears on every page
    // ════════════════════════════════════════
    function addFooter(n) {
      doc.moveTo(M, H - 18).lineTo(W - M, H - 18).lineWidth(0.5).strokeColor(rgb([210, 215, 230])).stroke();
      doc.fillColor(rgb([160, 165, 185])).font("Helvetica").fontSize(7);
      doc.text("PDF Cash IA  -  pdfcash-ia.vercel.app", 0, H - 13, { align: "center", width: W, lineBreak: false });
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text(String(n), W - M, H - 13, { lineBreak: false });
    }

    function newPage(docTitle, section) {
      doc.addPage();
      pageNum++;
      addFooter(pageNum);
      y = addHeader(docTitle, section);
    }

    function ensureSpace(needed, docTitle, section) {
      if (y + needed > BOTTOM) newPage(docTitle, section);
    }

    // ════════════════════════════════════════
    // PAGE 1 — COUVERTURE MINIMALISTE PRO
    // Fond blanc par defaut — zero rect de fond
    // ════════════════════════════════════════
    doc.addPage();
    pageNum++;

    const centerX = W / 2;

    // Bande fine en haut (petite hauteur, pas toute la page)
    doc.rect(0, 0, W, 5).fill(rgb(AC));

    // Label type document
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text(
      clean(docLabel || docType || "DOCUMENT").toUpperCase(),
      0, 28,
      { width: W, align: "center", characterSpacing: 2, lineBreak: false }
    );

    // Titre principal
    const titleText = clean(C.title);
    doc.fillColor(rgb([20, 20, 35])).font("Helvetica-Bold").fontSize(32);
    const titleH = doc.heightOfString(titleText, { width: TW - 10, align: "center" });
    doc.text(titleText, M, 65, { width: TW - 10, align: "center" });

    let cy = 65 + titleH + 18;

    // Ligne decorative accent
    doc.moveTo(centerX - 45, cy).lineTo(centerX + 45, cy)
      .lineWidth(2.5).strokeColor(rgb(AC)).stroke();
    cy += 16;

    // Sous-titre
    if (C.subtitle) {
      const subText = clean(C.subtitle);
      doc.fillColor(rgb([100, 105, 130])).font("Helvetica").fontSize(13);
      const subH = doc.heightOfString(subText, { width: TW - 20, align: "center" });
      doc.text(subText, M, cy, { width: TW - 20, align: "center" });
      cy += subH + 16;
    }

    // Tagline en italique
    if (C.tagline) {
      const tagText = '"' + clean(C.tagline) + '"';
      doc.fillColor(rgb([140, 145, 165])).font("Helvetica-Oblique").fontSize(11);
      const tagH = doc.heightOfString(tagText, { width: TW - 30, align: "center" });
      doc.text(tagText, M, cy, { width: TW - 30, align: "center" });
      cy += tagH + 20;
    }

    // Separateur leger
    doc.moveTo(centerX - 25, cy).lineTo(centerX + 25, cy)
      .lineWidth(0.8).strokeColor(rgb([210, 215, 230])).stroke();
    cy += 18;

    // Info chapitres
    doc.fillColor(rgb([160, 165, 185])).font("Helvetica").fontSize(10);
    doc.text(
      (C.chapters || []).length + " chapitres  -  Exemples en FCFA  -  Contexte africain",
      0, cy,
      { width: W, align: "center", lineBreak: false }
    );
    cy += 30;

    // Prix
    doc.fillColor(rgb([120, 125, 150])).font("Helvetica").fontSize(10);
    doc.text("Prix :", 0, cy, { width: W, align: "center", lineBreak: false });
    cy += 18;

    doc.fillColor(rgb([20, 20, 35])).font("Helvetica-Bold").fontSize(20);
    doc.text(clean(C.price_suggested || (pn.toLocaleString("fr-FR") + " FCFA")), 0, cy, {
      width: W, align: "center", lineBreak: false
    });

    // Marque en bas de couverture
    // Bande fine en bas
    doc.rect(0, H - 38, W, 38).fill(rgb([245, 245, 248]));

    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(12);
    doc.text("PDF Cash IA", 0, H - 28, { width: W, align: "center", lineBreak: false });

    doc.fillColor(rgb([160, 165, 185])).font("Helvetica").fontSize(8);
    doc.text("pdfcash-ia.vercel.app", 0, H - 14, { width: W, align: "center", lineBreak: false });

    // ════════════════════════════════════════
    // PAGE 2 — TABLE DES MATIERES
    // ════════════════════════════════════════
    newPage(C.title, "TABLE DES MATIERES");

    doc.fillColor(rgb([20, 20, 35])).font("Helvetica-Bold").fontSize(22);
    doc.text("Table des Matieres", M, y);
    y += 28;

    doc.moveTo(M, y).lineTo(M + 30, y).lineWidth(3).strokeColor(rgb(AC)).stroke();
    y += 14;

    (C.table_of_contents || []).forEach((item, i) => {
      ensureSpace(20, C.title, "TABLE DES MATIERES");

      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
      doc.text(String(i + 1).padStart(2, "0"), M, y, { lineBreak: false, width: 24 });

      doc.moveTo(M + 28, y + 7).lineTo(M + 32, y + 7)
        .lineWidth(1).strokeColor(rgb([210, 215, 230])).stroke();

      doc.fillColor(rgb([30, 32, 50])).font("Helvetica").fontSize(11);
      doc.text(clean(item), M + 36, y, { width: TW - 46, lineBreak: false });

      doc.moveTo(M + 36, y + 15).lineTo(W - M, y + 15)
        .lineWidth(0.4).strokeColor(rgb([235, 238, 245])).stroke();

      y += 19;
    });

    // Description below TOC
    if (C.description) {
      y += 14;
      ensureSpace(50, C.title, "TABLE DES MATIERES");
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(rgb([210, 215, 230])).stroke();
      y += 12;
      doc.fillColor(rgb([100, 105, 130])).font("Helvetica-Oblique").fontSize(11);
      const dh = doc.heightOfString(clean(C.description), { width: TW });
      doc.text(clean(C.description), M, y, { width: TW });
      y += dh + 10;
    }

    // ════════════════════════════════════════
    // CHAPTERS
    // ════════════════════════════════════════
    newPage(C.title, "CHAPITRES");

    (C.chapters || []).forEach((ch, ci) => {
      const chTitle = clean(ch.title || "Chapitre " + (ci + 1));

      doc.font("Helvetica-Bold").fontSize(16);
      const titleH = doc.heightOfString(chTitle, { width: TW });
      ensureSpace(titleH + 24 + 60, C.title, chTitle.slice(0, 35));

      doc.fillColor(rgb([160, 165, 185])).font("Helvetica-Bold").fontSize(8);
      doc.text("CHAPITRE " + String(ci + 1).padStart(2, "0"), M, y, { lineBreak: false });
      y += 12;

      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(16);
      doc.text(chTitle, M, y, { width: TW });
      y += titleH + 4;

      doc.moveTo(M, y).lineTo(M + 50, y).lineWidth(2).strokeColor(rgb(AC)).stroke();
      y += 12;

      const content = clean(ch.content || "");
      const paras = content.split(/\n+/).filter(p => p.trim().length > 2);

      paras.forEach(para => {
        const trimmed = para.trim();
        if (!trimmed || trimmed.length < 3) return;

        const isHeading = (
          (trimmed.endsWith(":") && trimmed.length < 80) ||
          trimmed.startsWith("**") ||
          (/^\d+[\.\)]\s/.test(trimmed) && trimmed.length < 100)
        );

        if (isHeading) {
          const headText = trimmed
            .replace(/\*\*/g, "")
            .replace(/:$/, "")
            .replace(/^\d+[\.\)]\s/, "");
          if (!headText || headText.length < 2) return;

          doc.font("Helvetica-Bold").fontSize(12);
          const hh = doc.heightOfString(headText, { width: TW });
          ensureSpace(hh + 50, C.title, chTitle.slice(0, 35));
          y += 6;
          doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(12);
          doc.text(headText, M, y, { width: TW });
          y += hh + 6;

        } else {
          doc.font("Helvetica").fontSize(11);
          const ph = doc.heightOfString(trimmed, { width: TW, lineGap: 2 });
          ensureSpace(ph + 4, C.title, chTitle.slice(0, 35));
          doc.fillColor(rgb([15, 15, 15])).font("Helvetica").fontSize(11);
          doc.text(trimmed, M, y, { width: TW, align: "justify", lineGap: 2 });
          y += ph + 10;
        }
      });

      if (ci < (C.chapters || []).length - 1) {
        ensureSpace(20, C.title, "CHAPITRES");
        y += 8;
        doc.moveTo(M + TW / 3, y).lineTo(M + (TW * 2 / 3), y)
          .lineWidth(0.8).strokeColor(rgb([200, 205, 220])).stroke();
        y += 14;
      }
    });

    // ════════════════════════════════════════
    // KEY TAKEAWAYS
    // ════════════════════════════════════════
    if (y > BOTTOM * 0.65) {
      newPage(C.title, "POINTS CLES");
    } else {
      y += 22;
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(rgb([210, 215, 230])).stroke();
      y += 16;
    }

    doc.fillColor(rgb([20, 20, 35])).font("Helvetica-Bold").fontSize(20);
    doc.text("Points Cles a Retenir", M, y);
    y += 26;
    doc.moveTo(M, y).lineTo(M + 30, y).lineWidth(3).strokeColor(rgb(AC)).stroke();
    y += 14;

    (C.key_takeaways || []).forEach(k => {
      const kText = clean(k);
      if (!kText) return;

      doc.font("Helvetica").fontSize(11);
      const kh = doc.heightOfString(kText, { width: TW - 20, lineGap: 2 });
      ensureSpace(kh + 14, C.title, "POINTS CLES");

      doc.moveTo(M, y).lineTo(M, y + kh + 4)
        .lineWidth(3).strokeColor(rgb(AC)).stroke();

      doc.fillColor(rgb([15, 15, 15])).font("Helvetica").fontSize(11);
      doc.text(kText, M + 12, y, { width: TW - 20, lineGap: 2 });
      y += kh + 14;
    });

    // ════════════════════════════════════════
    // CONCLUSION PAGE
    // ════════════════════════════════════════
    if (y > BOTTOM * 0.55) {
      newPage(C.title, "CONCLUSION");
    } else {
      y += 22;
    }

    const ctaText = clean(C.call_to_action || "Passe a l'action maintenant !");
    doc.font("Helvetica-Bold").fontSize(14);
    const ctaH = doc.heightOfString(ctaText, { width: TW - 30, align: "center" });
    const ctaBox = ctaH + 50;
    ensureSpace(ctaBox + 90, C.title, "CONCLUSION");

    doc.rect(M, y, TW, ctaBox).lineWidth(2).strokeColor(rgb(AC)).stroke();
    doc.moveTo(M, y).lineTo(M + TW, y).lineWidth(4).strokeColor(rgb(AC)).stroke();

    doc.fillColor(rgb([20, 20, 35])).font("Helvetica-Bold").fontSize(14);
    doc.text(ctaText, M + 15, y + 16, { width: TW - 30, align: "center" });

    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(15);
    doc.text(
      clean(C.price_suggested || ""),
      M, y + ctaBox - 22,
      { align: "center", width: TW, lineBreak: false }
    );
    y += ctaBox + 24;

    ensureSpace(70, C.title, "CONCLUSION");
    doc.fillColor(rgb([20, 20, 35])).font("Helvetica-Bold").fontSize(12);
    doc.text("POTENTIEL DE REVENUS", M, y);
    y += 14;

    doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(rgb([210, 215, 230])).stroke();
    y += 10;

    const bW = (TW - 16) / 3;
    [[10, "10 ventes"], [50, "50 ventes"], [100, "100 ventes"]].forEach(([qty, lbl], i) => {
      const bx = M + i * (bW + 8);

      doc.rect(bx, y, bW, 44).lineWidth(1).strokeColor(rgb([210, 215, 230])).stroke();
      doc.moveTo(bx, y).lineTo(bx + bW, y).lineWidth(3).strokeColor(rgb(AC)).stroke();

      doc.fillColor(rgb([120, 125, 150])).font("Helvetica").fontSize(9);
      doc.text(lbl, bx, y + 9, { align: "center", width: bW, lineBreak: false });

      doc.fillColor(rgb(dkn(AC, 10))).font("Helvetica-Bold").fontSize(13);
      doc.text(
        (pn * qty).toLocaleString("fr-FR") + " F",
        bx, y + 23,
        { align: "center", width: bW, lineBreak: false }
      );
    });
    y += 58;

    if (C.sales_message) {
      ensureSpace(80, C.title, "CONCLUSION");
      doc.fillColor(rgb([20, 20, 35])).font("Helvetica-Bold").fontSize(10);
      doc.text("MESSAGE DE VENTE WHATSAPP", M, y);
      y += 12;

      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(rgb([210, 215, 230])).stroke();
      y += 10;

      const msgText = clean(C.sales_message);
      const mh = doc.heightOfString(msgText, { width: TW - 10, lineGap: 2 });
      ensureSpace(mh + 20, C.title, "CONCLUSION");

      doc.moveTo(M, y).lineTo(M, y + mh + 4)
        .lineWidth(3).strokeColor(rgb([37, 180, 90])).stroke();

      doc.fillColor(rgb([15, 15, 15])).font("Helvetica").fontSize(11);
      doc.text(msgText, M + 12, y, { width: TW - 18, lineGap: 2 });
      y += mh + 20;
    }

    if (C.facebook_ads && C.facebook_ads.texte_principal) {
      ensureSpace(80, C.title, "CONCLUSION");
      doc.fillColor(rgb([20, 20, 35])).font("Helvetica-Bold").fontSize(10);
      doc.text("SCRIPT FACEBOOK ADS", M, y);
      y += 12;

      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(rgb([210, 215, 230])).stroke();
      y += 10;

      const adsText = clean(C.facebook_ads.texte_principal);
      const ah = doc.heightOfString(adsText, { width: TW - 10, lineGap: 2 });
      ensureSpace(ah + 20, C.title, "CONCLUSION");

      doc.moveTo(M, y).lineTo(M, y + ah + 4)
        .lineWidth(3).strokeColor(rgb([59, 130, 246])).stroke();

      doc.fillColor(rgb([15, 15, 15])).font("Helvetica").fontSize(11);
      doc.text(adsText, M + 12, y, { width: TW - 18, lineGap: 2 });
    }

    // Finalize
    doc.end();
    await new Promise(resolve => doc.on("end", resolve));

    const buf = Buffer.concat(chunks);
    const fname = ((C.title || "document")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/ +/g, "_")
      .slice(0, 45)) + ".pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch (err) {
    console.error("PDF error:", err);
    return res.status(500).json({ error: "Erreur PDF: " + err.message });
  }
}
