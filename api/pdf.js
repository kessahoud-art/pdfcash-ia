import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { content: C, docType, docLabel, color } = req.body || {};
  if (!C || !C.title) return res.status(400).json({ error: "Contenu manquant" });

  const col = color || { c1: "#1a0535", c2: "#0d1030", ac: "#7c3aed" };
  const pn = parseInt((C.price_suggested || "3000").replace(/\D/g, "")) || 3000;

  // ── HELPERS ──
  function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#7c3aed");
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [124,58,237];
  }
  function rgbStr(arr) { return `rgb(${arr[0]},${arr[1]},${arr[2]})`; }
  function lighter(arr, amt) {
    return [Math.min(arr[0]+amt,255), Math.min(arr[1]+amt,255), Math.min(arr[2]+amt,255)];
  }

  const AC = hexRgb(col.ac);
  const BG = hexRgb(col.c1);
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 52;
  const TW = PAGE_W - MARGIN * 2;
  const BOTTOM_LIMIT = PAGE_H - 60;

  try {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      autoFirstPage: false,
      info: {
        Title: C.title || "Document",
        Author: C.author || "PDF Cash IA",
        Creator: "PDF Cash IA"
      }
    });

    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));

    // ── PAGE HEADER (inner pages) ──
    function addPageHeader(title, section) {
      doc.rect(0, 0, PAGE_W, 30).fill(rgbStr([10,10,25]));
      doc.fillColor(rgbStr(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text((title || "").slice(0,52).toUpperCase(), MARGIN, 11, { lineBreak: false });
      doc.fillColor("#606080").font("Helvetica").fontSize(7);
      doc.text(section, PAGE_W - MARGIN - 140, 11, { width: 140, align: "right", lineBreak: false });
      doc.rect(0, 29, PAGE_W, 1.5).fill(rgbStr(AC));
      return 46;
    }

    // ── SAFE TEXT with auto page break ──
    let curY = 0;
    let curPage = 0;

    function ensurePage(title, section) {
      if (curPage === 0) {
        doc.addPage();
        curPage++;
        curY = addPageHeader(title, section);
      }
    }

    function needNewPage(neededHeight, title, section) {
      if (curY + neededHeight > BOTTOM_LIMIT) {
        doc.addPage();
        curPage++;
        curY = addPageHeader(title, section);
      }
    }

    function textBlock(text, opts, title, section) {
      const h = doc.heightOfString(text, { width: opts.width || TW, lineBreak: true, lineGap: opts.lineGap || 0 });
      needNewPage(h + 6, title, section);
      doc.text(text, opts.x || MARGIN, curY, {
        width: opts.width || TW,
        align: opts.align || "left",
        lineGap: opts.lineGap || 2,
        lineBreak: true
      });
      curY += h + (opts.after || 8);
    }

    // ══════════════════════════════════════
    // PAGE 1 — COUVERTURE
    // ══════════════════════════════════════
    doc.addPage();
    curPage++;

    // Dark gradient background
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(rgbStr(BG));

    // Decorative circles
    doc.circle(PAGE_W - 60, 100, 140).fillOpacity(0.06).fill(rgbStr(AC)).fillOpacity(1);
    doc.circle(60, PAGE_H - 100, 100).fillOpacity(0.05).fill(rgbStr(lighter(AC, 40))).fillOpacity(1);

    // Top color bar
    doc.rect(0, 0, PAGE_W, 6).fill(rgbStr(AC));
    doc.rect(PAGE_W * 0.4, 0, PAGE_W * 0.35, 6).fill(rgbStr(lighter(AC, 60)));

    let cy = 38;

    // Type badge
    doc.roundedRect(MARGIN, cy, 140, 20, 10).fill(rgbStr([...AC.map(v => Math.min(v+20,255)), 0.15]));
    doc.fillColor(rgbStr(lighter(AC, 80))).font("Helvetica-Bold").fontSize(9);
    doc.text(`✦  ${(docLabel || "DOCUMENT").toUpperCase()}  ✦`, MARGIN + 8, cy + 6, { lineBreak: false });
    cy += 34;

    // Main title
    doc.fillColor("white").font("Helvetica-Bold").fontSize(26);
    const titleLines = doc.heightOfString(C.title || "", { width: TW - 30, lineBreak: true });
    doc.text(C.title || "", MARGIN, cy, { width: TW - 30, lineBreak: true });
    cy += titleLines + 14;

    // Subtitle
    if (C.subtitle) {
      doc.fillColor(rgbStr([170,170,200])).font("Helvetica").fontSize(13);
      const subH = doc.heightOfString(C.subtitle, { width: TW - 20, lineBreak: true });
      doc.text(C.subtitle, MARGIN, cy, { width: TW - 20, lineBreak: true });
      cy += subH + 18;
    }

    // Tagline with accent bar
    if (C.tagline) {
      doc.rect(MARGIN, cy, 3, 32).fill(rgbStr(AC));
      doc.fillColor(rgbStr(lighter(AC, 100))).font("Helvetica-Oblique").fontSize(12);
      doc.text(`"${C.tagline}"`, MARGIN + 12, cy + 4, { width: TW - 20, lineBreak: true });
      cy += 44;
    }

    cy += 10;

    // Price badge
    doc.roundedRect(MARGIN, cy, 200, 30, 6).fill(rgbStr([8,50,28]));
    doc.rect(MARGIN, cy, 3, 30).fill(rgbStr([16,185,129]));
    doc.fillColor(rgbStr([74,222,128])).font("Helvetica-Bold").fontSize(13);
    doc.text(`💰  Prix : ${C.price_suggested || ""}`, MARGIN + 12, cy + 9, { lineBreak: false });
    cy += 44;

    // Pages count
    doc.fillColor(rgbStr([100,100,140])).font("Helvetica").fontSize(10);
    doc.text(`${(C.chapters || []).length} chapitres complets  ·  Contexte africain  ·  Exemples en FCFA`, MARGIN, cy);

    // Cover footer
    doc.rect(0, PAGE_H - 38, PAGE_W, 38).fill(rgbStr([0,0,0]));
    doc.fillColor(rgbStr([100,100,140])).font("Helvetica").fontSize(9);
    doc.text(`Par ${C.author || "Expert Digital"}`, MARGIN, PAGE_H - 24, { lineBreak: false });
    doc.fillColor(rgbStr(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("PDF Cash IA", PAGE_W - MARGIN - 80, PAGE_H - 24, { lineBreak: false });

    // ══════════════════════════════════════
    // PAGE 2 — TABLE DES MATIÈRES
    // ══════════════════════════════════════
    doc.addPage();
    curPage++;
    curY = addPageHeader(C.title, "TABLE DES MATIÈRES");

    doc.fillColor(rgbStr([30,30,55])).font("Helvetica-Bold").fontSize(22);
    doc.text("Table des Matières", MARGIN, curY);
    curY += 32;
    doc.rect(MARGIN, curY, 22, 3).fill(rgbStr(AC));
    curY += 14;

    (C.table_of_contents || []).forEach((item, i) => {
      if (curY + 20 > BOTTOM_LIMIT) {
        doc.addPage(); curPage++;
        curY = addPageHeader(C.title, "TABLE DES MATIÈRES");
      }
      const isEven = i % 2 === 0;
      doc.rect(MARGIN, curY - 3, TW, 18).fill(isEven ? rgbStr([248,248,252]) : rgbStr([242,242,248]));
      doc.fillColor(rgbStr(AC)).font("Helvetica-Bold").fontSize(11);
      doc.text(String(i+1).padStart(2,"0"), MARGIN + 5, curY + 2, { lineBreak: false, width: 22 });
      doc.fillColor(rgbStr([50,50,70])).font("Helvetica").fontSize(11);
      doc.text(item, MARGIN + 30, curY + 2, { width: TW - 40, lineBreak: false });
      curY += 20;
    });

    curY += 10;

    // Description du document
    if (C.description) {
      doc.rect(MARGIN, curY, TW, 0.5).fill(rgbStr([220,220,240]));
      curY += 14;
      doc.fillColor(rgbStr([100,100,140])).font("Helvetica-Oblique").fontSize(11);
      const descH = doc.heightOfString(C.description, { width: TW, lineBreak: true });
      doc.text(C.description, MARGIN, curY, { width: TW, lineBreak: true });
      curY += descH + 10;
    }

    // ══════════════════════════════════════
    // CHAPITRES
    // ══════════════════════════════════════
    (C.chapters || []).forEach((ch, ci) => {
      doc.addPage();
      curPage++;
      curY = 28;

      // Chapter number label
      doc.fillColor(rgbStr([140,140,170])).font("Helvetica-Bold").fontSize(8);
      doc.text(`CHAPITRE ${String(ci+1).padStart(2,"0")}`, MARGIN, curY, { letterSpacing: 3, lineBreak: false });
      curY += 14;

      // Chapter title box with accent
      const chTitle = ch.title || `Chapitre ${ci+1}`;
      doc.font("Helvetica-Bold").fontSize(16);
      const chTitleH = doc.heightOfString(chTitle, { width: TW - 20, lineBreak: true });
      const boxH = chTitleH + 22;
      doc.rect(MARGIN, curY, TW, boxH).fill(rgbStr(BG));
      doc.rect(MARGIN, curY, 5, boxH).fill(rgbStr(AC));
      doc.fillColor("white").font("Helvetica-Bold").fontSize(16);
      doc.text(chTitle, MARGIN + 16, curY + 12, { width: TW - 24, lineBreak: true });
      curY += boxH + 18;

      // Chapter content
      const content = ch.content || "";
      const paragraphs = content.split("\n").filter(p => p.trim().length > 0);

      doc.fillColor(rgbStr([55,65,81])).font("Helvetica").fontSize(11);

      paragraphs.forEach(para => {
        const trimmed = para.trim();
        if (!trimmed) return;

        // Detect if it looks like a heading (short, ends with colon or all caps)
        const isHeading = trimmed.length < 80 && (
          trimmed.endsWith(":") ||
          trimmed.startsWith("**") ||
          /^\d+[\.\)]/.test(trimmed) ||
          trimmed.toUpperCase() === trimmed && trimmed.length > 5
        );

        if (isHeading) {
          const clean = trimmed.replace(/\*\*/g, "").replace(/:$/, "");
          const hH = doc.heightOfString(clean, { width: TW, lineBreak: true });
          needNewPage(hH + 16, C.title, chTitle.slice(0,35));
          curY += 6;
          doc.fillColor(rgbStr(AC)).font("Helvetica-Bold").fontSize(12);
          doc.text(clean, MARGIN, curY, { width: TW, lineBreak: true });
          curY += hH + 8;
          doc.fillColor(rgbStr([55,65,81])).font("Helvetica").fontSize(11);
        } else {
          const pH = doc.heightOfString(trimmed, { width: TW, lineBreak: true, lineGap: 2 });
          needNewPage(pH + 12, C.title, chTitle.slice(0,35));
          doc.fillColor(rgbStr([55,65,81])).font("Helvetica").fontSize(11);
          doc.text(trimmed, MARGIN, curY, { width: TW, align: "justify", lineGap: 2, lineBreak: true });
          curY += pH + 10;
        }
      });
    });

    // ══════════════════════════════════════
    // PAGE POINTS CLÉS
    // ══════════════════════════════════════
    doc.addPage();
    curPage++;
    curY = addPageHeader(C.title, "POINTS CLÉS");

    doc.fillColor(rgbStr([30,30,55])).font("Helvetica-Bold").fontSize(22);
    doc.text("Points Clés à Retenir", MARGIN, curY);
    curY += 32;
    doc.rect(MARGIN, curY, 22, 3).fill(rgbStr([16,185,129]));
    curY += 14;

    (C.key_takeaways || []).forEach((k, i) => {
      const kH = doc.heightOfString(k, { width: TW - 36, lineBreak: true, lineGap: 2 });
      const boxH = Math.max(kH + 18, 32);
      needNewPage(boxH + 10, C.title, "POINTS CLÉS");

      doc.rect(MARGIN, curY - 4, TW, boxH).fill(rgbStr([238,252,244]));
      doc.rect(MARGIN, curY - 4, 4, boxH).fill(rgbStr([16,185,129]));

      doc.fillColor(rgbStr([16,185,129])).font("Helvetica-Bold").fontSize(14);
      doc.text("✓", MARGIN + 10, curY + 4, { lineBreak: false });

      doc.fillColor(rgbStr([22,101,52])).font("Helvetica").fontSize(11);
      doc.text(k, MARGIN + 30, curY + 4, { width: TW - 42, lineBreak: true, lineGap: 2 });
      curY += boxH + 8;
    });

    // ══════════════════════════════════════
    // PAGE FINALE — CTA + REVENUS
    // ══════════════════════════════════════
    doc.addPage();
    curPage++;
    curY = addPageHeader(C.title, "CONCLUSION");

    // CTA Box
    const ctaText = C.call_to_action || "Passe à l'action maintenant !";
    doc.font("Helvetica-Bold").fontSize(14);
    const ctaH = doc.heightOfString(ctaText, { width: TW - 30, lineBreak: true, align: "center" });
    const ctaBoxH = ctaH + 48;

    doc.rect(MARGIN, curY, TW, ctaBoxH).fill(rgbStr(BG));
    doc.rect(MARGIN, curY, TW, ctaBoxH).lineWidth(2).stroke(rgbStr(AC));
    doc.rect(MARGIN, curY, TW, 4).fill(rgbStr(AC));

    doc.fillColor("white").font("Helvetica-Bold").fontSize(14);
    doc.text(ctaText, MARGIN + 15, curY + 18, { width: TW - 30, align: "center", lineBreak: true, lineGap: 2 });

    doc.fillColor(rgbStr([74,222,128])).font("Helvetica-Bold").fontSize(14);
    doc.text(`💰  ${C.price_suggested || ""}`, MARGIN, curY + ctaBoxH - 22, { align: "center", width: TW, lineBreak: false });

    curY += ctaBoxH + 24;

    // Revenue section title
    doc.fillColor(rgbStr([50,50,80])).font("Helvetica-Bold").fontSize(13);
    doc.text("📊  TON POTENTIEL DE REVENUS", MARGIN, curY);
    curY += 20;

    // Revenue boxes
    const bW = (TW - 16) / 3;
    [[10,"10 ventes"],[50,"50 ventes"],[100,"100 ventes"]].forEach(([qty, label], i) => {
      const bx = MARGIN + i * (bW + 8);
      doc.rect(bx, curY, bW, 46).fill(rgbStr([248,250,252]));
      doc.rect(bx, curY, bW, 3).fill(rgbStr(AC));
      doc.fillColor(rgbStr([100,120,140])).font("Helvetica").fontSize(9);
      doc.text(label, bx, curY + 10, { align: "center", width: bW, lineBreak: false });
      doc.fillColor(rgbStr([16,185,129])).font("Helvetica-Bold").fontSize(13);
      doc.text((pn * qty).toLocaleString("fr-FR") + " F", bx, curY + 24, { align: "center", width: bW, lineBreak: false });
    });
    curY += 62;

    // WhatsApp sales message
    if (C.sales_message) {
      doc.rect(MARGIN, curY, TW, 0.5).fill(rgbStr([220,220,240]));
      curY += 14;
      doc.fillColor(rgbStr([0,140,70])).font("Helvetica-Bold").fontSize(10);
      doc.text("📲  MESSAGE DE VENTE WHATSAPP", MARGIN, curY);
      curY += 16;
      const msgH = doc.heightOfString(C.sales_message, { width: TW - 10, lineBreak: true, lineGap: 2 });
      doc.rect(MARGIN, curY - 4, TW, msgH + 18).fill(rgbStr([235,253,245]));
      doc.rect(MARGIN, curY - 4, 3, msgH + 18).fill(rgbStr([37,211,102]));
      doc.fillColor(rgbStr([22,80,50])).font("Helvetica").fontSize(10);
      doc.text(C.sales_message, MARGIN + 10, curY + 4, { width: TW - 18, lineBreak: true, lineGap: 2 });
      curY += msgH + 24;
    }

    // Brand footer
    doc.rect(0, PAGE_H - 30, PAGE_W, 30).fill(rgbStr([8,8,20]));
    doc.fillColor(rgbStr([80,80,120])).font("Helvetica").fontSize(8);
    doc.text("Créé avec PDF Cash IA  —  pdfcash-ia.vercel.app  —  Tous droits réservés", 0, PAGE_H - 18, { align: "center", width: PAGE_W, lineBreak: false });

    // Finalize
    doc.end();
    await new Promise(resolve => doc.on("end", resolve));

    const pdfBuffer = Buffer.concat(chunks);
    const filename = ((C.title || "document")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/ +/g, "_")
      .slice(0, 45)) + ".pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.status(200).send(pdfBuffer);

  } catch (err) {
    console.error("PDF generation error:", err);
    return res.status(500).json({ error: "Erreur PDF: " + err.message });
  }
}
