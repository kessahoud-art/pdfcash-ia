import PDFDocument from 'pdfkit';

function clean(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[✅❌🔥💰📄📘🎯💼🎓🎬📱✓→←↓↑•★☆]/g, '')
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

  const { content: C, docLabel, color } = req.body || {};
  if (!C || !C.title) return res.status(400).json({ error: "Contenu manquant" });

  const col = color || { c1: "#1a0535", c2: "#0d1030", ac: "#7c3aed" };
  const pn = parseInt((C.price_suggested || "3000").replace(/\D/g, "")) || 3000;

  function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#7c3aed");
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [124,58,237];
  }
  function rgb(arr) { return `rgb(${arr[0]},${arr[1]},${arr[2]})`; }
  function lgt(arr, a) { return [Math.min(arr[0]+a,255), Math.min(arr[1]+a,255), Math.min(arr[2]+a,255)]; }
  function dkn(arr, a) { return [Math.max(arr[0]-a,0), Math.max(arr[1]-a,0), Math.max(arr[2]-a,0)]; }

  const AC  = hexRgb(col.ac);   // accent color
  const BG  = hexRgb(col.c1);   // cover background
  const W   = 595.28;
  const H   = 841.89;
  const M   = 52;
  const TW  = W - M * 2;
  const BOTTOM = H - 55;

  // ── TEXT COLORS (all on white background) ──
  const BLACK      = [15, 15, 15];      // main body text
  const DARK       = [30, 32, 50];      // headings
  const MEDIUM     = [80, 85, 110];     // secondary text
  const LIGHT_GRAY = [140, 145, 165];   // captions, labels
  const WHITE_COL  = [255, 255, 255];   // text on dark backgrounds
  const GREEN_DARK = [20, 100, 55];     // key takeaways text
  const GREEN_BG   = [236, 253, 245];   // key takeaways background
  const GREEN_ACC  = [16, 185, 129];    // green accent
  const ACCENT_BG  = lgt(AC, 200).map((v,i) => Math.min(v, i===0?240:i===1?240:255)); // very light accent bg

  try {
    const doc = new PDFDocument({
      size: "A4", margin: 0, autoFirstPage: false,
      info: {
        Title: clean(C.title),
        Author: clean(C.author) || "PDF Cash IA",
        Creator: "PDF Cash IA"
      }
    });

    const chunks = [];
    doc.on("data", c => chunks.push(c));

    let y = 0, pageNum = 0;

    // ── INNER PAGE HEADER (white bg) ──
    function addHeader(title, section) {
      // White background header with colored bottom border
      doc.rect(0, 0, W, 26).fill(rgb([252, 252, 255]));
      doc.rect(0, 25, W, 2).fill(rgb(AC));
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text(clean(title).slice(0, 52).toUpperCase(), M, 9, { lineBreak: false });
      doc.fillColor(rgb(LIGHT_GRAY)).font("Helvetica").fontSize(7);
      doc.text(clean(section), W - M - 120, 9, { width: 120, align: "right", lineBreak: false });
      return 40;
    }

    // ── INNER PAGE FOOTER (white bg) ──
    function addFooter(n) {
      doc.rect(0, H - 20, W, 20).fill(rgb([252, 252, 255]));
      doc.rect(0, H - 20, W, 1).fill(rgb([220, 220, 235]));
      doc.fillColor(rgb(LIGHT_GRAY)).font("Helvetica").fontSize(7);
      doc.text("PDF Cash IA  -  pdfcash-ia.vercel.app", 0, H - 12, { align: "center", width: W, lineBreak: false });
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text(String(n), W - M, H - 12, { lineBreak: false });
    }

    function newPage(title, section) {
      doc.addPage();
      pageNum++;
      addFooter(pageNum);
      y = addHeader(title, section);
    }

    function ensureSpace(needed, title, section) {
      if (y + needed > BOTTOM) newPage(title, section);
    }

    // ════════════════════════════════
    // PAGE 1 — COVER (dark background)
    // ════════════════════════════════
    doc.addPage();
    pageNum++;

    // Cover background - use accent color
    doc.rect(0, 0, W, H).fill(rgb(BG));
    // Subtle decoration circles
    doc.circle(W - 40, 80, 160)
       .fillOpacity(0.08).fill(rgb(AC)).fillOpacity(1);
    doc.circle(40, H - 80, 100)
       .fillOpacity(0.06).fill(rgb(lgt(AC, 40))).fillOpacity(1);
    // Top accent bar
    doc.rect(0, 0, W, 7).fill(rgb(AC));
    doc.rect(W * 0.35, 0, W * 0.35, 7).fill(rgb(lgt(AC, 60)));

    // Cover footer bar
    doc.rect(0, H - 34, W, 34).fill(rgb([0, 0, 8]));
    doc.fillColor(rgb([100, 100, 140])).font("Helvetica").fontSize(9);
    doc.text("Par " + clean(C.author || "Expert Digital"), M, H - 20, { lineBreak: false });
    doc.fillColor(rgb(lgt(AC, 80))).font("Helvetica-Bold").fontSize(9);
    doc.text("PDF Cash IA", W - M - 65, H - 20, { lineBreak: false });

    let cy = 34;

    // Document type
    doc.fillColor(rgb(lgt(AC, 100))).font("Helvetica-Bold").fontSize(9);
    doc.text(clean(docLabel || "DOCUMENT").toUpperCase(), M, cy, { lineBreak: false });
    cy += 26;

    // Main title
    const titleText = clean(C.title);
    doc.fillColor(rgb([245, 245, 255])).font("Helvetica-Bold").fontSize(26);
    const th = doc.heightOfString(titleText, { width: TW - 10 });
    doc.text(titleText, M, cy, { width: TW - 10 });
    cy += th + 12;

    // Subtitle
    if (C.subtitle) {
      const subText = clean(C.subtitle);
      doc.fillColor(rgb([175, 175, 210])).font("Helvetica").fontSize(13);
      const sh = doc.heightOfString(subText, { width: TW - 10 });
      doc.text(subText, M, cy, { width: TW - 10 });
      cy += sh + 14;
    }

    // Tagline
    if (C.tagline) {
      doc.rect(M, cy, 3, 32).fill(rgb(lgt(AC, 80)));
      doc.fillColor(rgb(lgt(AC, 110))).font("Helvetica-Oblique").fontSize(12);
      const tagH = doc.heightOfString('"' + clean(C.tagline) + '"', { width: TW - 16 });
      doc.text('"' + clean(C.tagline) + '"', M + 12, cy + 4, { width: TW - 16 });
      cy += Math.max(tagH + 18, 38);
    }

    // Price box
    doc.rect(M, cy, 230, 30).fill(rgb([8, 55, 30]));
    doc.rect(M, cy, 4, 30).fill(rgb(GREEN_ACC));
    doc.fillColor(rgb([100, 235, 155])).font("Helvetica-Bold").fontSize(13);
    doc.text("Prix conseille : " + clean(C.price_suggested || ""), M + 12, cy + 9, { lineBreak: false });
    cy += 42;

    // Info line
    doc.fillColor(rgb([100, 100, 145])).font("Helvetica").fontSize(10);
    doc.text(
      (C.chapters || []).length + " chapitres  -  Exemples en FCFA  -  Contexte africain",
      M, cy
    );

    // ════════════════════════════════
    // PAGE 2 — TABLE DES MATIERES
    // ════════════════════════════════
    newPage(C.title, "TABLE DES MATIERES");

    // Section title
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(22);
    doc.text("Table des Matieres", M, y);
    y += 30;
    // Accent underline
    doc.rect(M, y, 28, 3).fill(rgb(AC));
    y += 14;

    (C.table_of_contents || []).forEach((item, i) => {
      ensureSpace(22, C.title, "TABLE DES MATIERES");
      // Alternating very light backgrounds
      const rowBg = i % 2 === 0 ? [248, 248, 252] : [255, 255, 255];
      doc.rect(M, y - 3, TW, 18).fill(rgb(rowBg));
      // Left accent line
      doc.rect(M, y - 3, 3, 18).fill(rgb(AC));
      // Number
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
      doc.text(String(i + 1).padStart(2, "0"), M + 8, y + 1, { lineBreak: false, width: 22 });
      // Item text - BLACK on white
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(11);
      doc.text(clean(item), M + 34, y + 1, { width: TW - 44, lineBreak: false });
      y += 20;
    });

    // Description below TOC
    if (C.description) {
      y += 12;
      ensureSpace(50, C.title, "TABLE DES MATIERES");
      doc.rect(M, y, TW, 1).fill(rgb([220, 220, 235]));
      y += 12;
      doc.fillColor(rgb(MEDIUM)).font("Helvetica-Oblique").fontSize(11);
      const dh = doc.heightOfString(clean(C.description), { width: TW });
      doc.text(clean(C.description), M, y, { width: TW });
      y += dh + 8;
    }

    // ════════════════════════════════
    // CHAPTERS
    // ════════════════════════════════
    newPage(C.title, "CHAPITRES");

    (C.chapters || []).forEach((ch, ci) => {
      const chTitle = clean(ch.title || "Chapitre " + (ci + 1));

      // Widow prevention
      doc.font("Helvetica-Bold").fontSize(15);
      const titleH = doc.heightOfString(chTitle, { width: TW - 14 });
      ensureSpace(titleH + 32 + 55, C.title, chTitle.slice(0, 35));

      // Chapter number label
      doc.fillColor(rgb(LIGHT_GRAY)).font("Helvetica-Bold").fontSize(8);
      doc.text("CHAPITRE " + String(ci + 1).padStart(2, "0"), M, y, { lineBreak: false });
      y += 12;

      // Chapter title box — light accent background, DARK text
      const boxH = titleH + 16;
      const accentBg = [
        Math.min(BG[0] + 180, 235),
        Math.min(BG[1] + 160, 230),
        Math.min(BG[2] + 100, 245)
      ];
      doc.rect(M, y, TW, boxH).fill(rgb(accentBg));
      doc.rect(M, y, 5, boxH).fill(rgb(AC));
      // DARK text on light background — always readable
      doc.fillColor(rgb(dkn(AC, 30))).font("Helvetica-Bold").fontSize(15);
      doc.text(chTitle, M + 14, y + 8, { width: TW - 22 });
      y += boxH + 14;

      // Chapter content
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
          // Widow prevention
          ensureSpace(hh + 50, C.title, chTitle.slice(0, 35));
          y += 6;
          // Sub-heading in accent color — readable
          doc.fillColor(rgb(dkn(AC, 20))).font("Helvetica-Bold").fontSize(12);
          doc.text(headText, M, y, { width: TW });
          y += hh + 7;
          // Reset to black for body
          doc.fillColor(rgb(BLACK)).font("Helvetica").fontSize(11);
        } else {
          doc.font("Helvetica").fontSize(11);
          const ph = doc.heightOfString(trimmed, { width: TW, lineGap: 2 });
          ensureSpace(ph + 4, C.title, chTitle.slice(0, 35));
          // BLACK text on WHITE background
          doc.fillColor(rgb(BLACK)).font("Helvetica").fontSize(11);
          doc.text(trimmed, M, y, { width: TW, align: "justify", lineGap: 2 });
          y += ph + 10;
        }
      });

      // Thin separator between chapters (not a page break)
      if (ci < (C.chapters || []).length - 1) {
        ensureSpace(18, C.title, "CHAPITRES");
        y += 6;
        doc.rect(M + TW / 3, y, TW / 3, 0.8).fill(rgb([200, 200, 220]));
        y += 12;
      }
    });

    // ════════════════════════════════
    // KEY TAKEAWAYS
    // ════════════════════════════════
    if (y > BOTTOM * 0.65) {
      newPage(C.title, "POINTS CLES");
    } else {
      y += 20;
      doc.rect(M, y, TW, 1).fill(rgb([210, 210, 230]));
      y += 16;
    }

    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(20);
    doc.text("Points Cles a Retenir", M, y);
    y += 28;
    doc.rect(M, y, 24, 3).fill(rgb(GREEN_ACC));
    y += 14;

    (C.key_takeaways || []).forEach(k => {
      const kText = clean(k);
      if (!kText) return;
      doc.font("Helvetica").fontSize(11);
      const kh = doc.heightOfString(kText, { width: TW - 32, lineGap: 2 });
      const bh = Math.max(kh + 14, 28);
      ensureSpace(bh + 8, C.title, "POINTS CLES");

      // GREEN light background, GREEN dark text — always readable
      doc.rect(M, y - 3, TW, bh).fill(rgb(GREEN_BG));
      doc.rect(M, y - 3, 4, bh).fill(rgb(GREEN_ACC));
      doc.fillColor(rgb(GREEN_ACC)).font("Helvetica-Bold").fontSize(13);
      doc.text("OK", M + 6, y + 3, { lineBreak: false, width: 20 });
      doc.fillColor(rgb(GREEN_DARK)).font("Helvetica").fontSize(11);
      doc.text(kText, M + 28, y + 3, { width: TW - 38, lineGap: 2 });
      y += bh + 7;
    });

    // ════════════════════════════════
    // CONCLUSION
    // ════════════════════════════════
    if (y > BOTTOM * 0.55) {
      newPage(C.title, "CONCLUSION");
    } else {
      y += 22;
    }

    // CTA box — light accent bg, dark text
    const ctaText = clean(C.call_to_action || "Passe a l'action maintenant !");
    doc.font("Helvetica-Bold").fontSize(14);
    const ctaH = doc.heightOfString(ctaText, { width: TW - 28, align: "center" });
    const ctaBox = ctaH + 52;
    ensureSpace(ctaBox + 90, C.title, "CONCLUSION");

    // CTA background: very light accent
    const ctaBg = [
      Math.min(BG[0] + 200, 245),
      Math.min(BG[1] + 185, 240),
      Math.min(BG[2] + 130, 255)
    ];
    doc.rect(M, y, TW, ctaBox).fill(rgb(ctaBg));
    // Top accent bar
    doc.rect(M, y, TW, 5).fill(rgb(AC));
    // Bottom border
    doc.rect(M, y + ctaBox - 2, TW, 2).fill(rgb(AC));
    // CTA text — DARK color readable on light bg
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(14);
    doc.text(ctaText, M + 14, y + 18, { width: TW - 28, align: "center" });
    // Price — accent color
    doc.fillColor(rgb(dkn(AC, 10))).font("Helvetica-Bold").fontSize(15);
    doc.text(clean(C.price_suggested || ""), M, y + ctaBox - 20, { align: "center", width: TW, lineBreak: false });
    y += ctaBox + 22;

    // Revenue table
    ensureSpace(70, C.title, "CONCLUSION");
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(12);
    doc.text("POTENTIEL DE REVENUS", M, y);
    y += 16;

    const bW = (TW - 16) / 3;
    [[10, "10 ventes"], [50, "50 ventes"], [100, "100 ventes"]].forEach(([qty, lbl], i) => {
      const bx = M + i * (bW + 8);
      // Light background boxes
      doc.rect(bx, y, bW, 42).fill(rgb([246, 248, 252]));
      doc.rect(bx, y, bW, 3).fill(rgb(AC));
      doc.rect(bx, y, 1, 42).fill(rgb([210, 215, 230]));
      doc.rect(bx + bW - 1, y, 1, 42).fill(rgb([210, 215, 230]));
      // Label
      doc.fillColor(rgb(LIGHT_GRAY)).font("Helvetica").fontSize(9);
      doc.text(lbl, bx, y + 9, { align: "center", width: bW, lineBreak: false });
      // Amount — dark green readable
      doc.fillColor(rgb([14, 120, 70])).font("Helvetica-Bold").fontSize(13);
      doc.text((pn * qty).toLocaleString("fr-FR") + " F", bx, y + 22, { align: "center", width: bW, lineBreak: false });
    });
    y += 55;

    // WhatsApp sales message
    if (C.sales_message) {
      ensureSpace(80, C.title, "CONCLUSION");
      doc.fillColor(rgb([14, 110, 50])).font("Helvetica-Bold").fontSize(10);
      doc.text("MESSAGE DE VENTE WHATSAPP", M, y);
      y += 14;
      const msgText = clean(C.sales_message);
      const mh = doc.heightOfString(msgText, { width: TW - 14, lineGap: 2 });
      // Light green background
      doc.rect(M, y - 4, TW, mh + 18).fill(rgb([240, 255, 248]));
      doc.rect(M, y - 4, 3, mh + 18).fill(rgb([37, 180, 90]));
      doc.rect(M, y - 4, TW, 1).fill(rgb([180, 235, 210]));
      // DARK green text — readable
      doc.fillColor(rgb([12, 85, 42])).font("Helvetica").fontSize(11);
      doc.text(msgText, M + 10, y + 4, { width: TW - 18, lineGap: 2 });
      y += mh + 24;
    }

    // Facebook Ads script if available
    if (C.facebook_ads && C.facebook_ads.texte_principal) {
      ensureSpace(80, C.title, "CONCLUSION");
      doc.fillColor(rgb([30, 80, 180])).font("Helvetica-Bold").fontSize(10);
      doc.text("SCRIPT FACEBOOK ADS", M, y);
      y += 14;
      const adsText = clean(C.facebook_ads.texte_principal);
      const ah = doc.heightOfString(adsText, { width: TW - 14, lineGap: 2 });
      doc.rect(M, y - 4, TW, ah + 18).fill(rgb([240, 245, 255]));
      doc.rect(M, y - 4, 3, ah + 18).fill(rgb([59, 130, 246]));
      doc.fillColor(rgb([20, 60, 160])).font("Helvetica").fontSize(10);
      doc.text(adsText, M + 10, y + 4, { width: TW - 18, lineGap: 2 });
    }

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
