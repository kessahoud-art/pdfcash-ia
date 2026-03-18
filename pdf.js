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

  function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#7c3aed");
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [124,58,237];
  }
  function rgb(arr) { return `rgb(${arr[0]},${arr[1]},${arr[2]})`; }
  function lgt(arr, a) { return [Math.min(arr[0]+a,255), Math.min(arr[1]+a,255), Math.min(arr[2]+a,255)]; }

  const AC = hexRgb(col.ac);
  const BG = hexRgb(col.c1);
  const W = 595.28, H = 841.89, M = 52, TW = W - M * 2;
  const BOTTOM = H - 55;

  try {
    const doc = new PDFDocument({ size:"A4", margin:0, autoFirstPage:false, info:{ Title: C.title, Author: C.author||"PDF Cash IA", Creator:"PDF Cash IA" }});
    const chunks = [];
    doc.on("data", c => chunks.push(c));

    let y = 0;

    // ── PAGE HEADER ──
    function addHeader(title, section) {
      doc.rect(0,0,W,28).fill(rgb([10,10,22]));
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text((title||"").slice(0,52).toUpperCase(), M, 10, { lineBreak:false });
      doc.fillColor("#606080").font("Helvetica").fontSize(7);
      doc.text(section, W-M-130, 10, { width:130, align:"right", lineBreak:false });
      doc.rect(0,27,W,1.5).fill(rgb(AC));
      return 44;
    }

    // ── PAGE FOOTER ──
    function addFooter(pageNum) {
      doc.rect(0, H-24, W, 24).fill(rgb([8,8,18]));
      doc.fillColor("#404060").font("Helvetica").fontSize(7);
      doc.text("PDF Cash IA  —  pdfcash-ia.vercel.app", 0, H-14, { align:"center", width:W, lineBreak:false });
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text(String(pageNum), W-M, H-14, { lineBreak:false });
    }

    let pageNum = 0;

    function newPage(title, section) {
      doc.addPage();
      pageNum++;
      addFooter(pageNum);
      y = addHeader(title, section);
    }

    // ── SMART PAGE BREAK ──
    // If text block + heading won't fit, go to new page
    function ensureSpace(needed, title, section) {
      if (y + needed > BOTTOM) {
        newPage(title, section);
      }
    }

    // Write text with auto page break - NO forced breaks between chapters
    function writeText(text, opts, title, section) {
      const w = opts.width || TW;
      const h = doc.heightOfString(text, { width:w, lineGap: opts.lineGap||2 });
      ensureSpace(h + (opts.before||0), title, section);
      if (opts.before) y += opts.before;
      doc.text(text, opts.x || M, y, {
        width: w,
        align: opts.align || "left",
        lineGap: opts.lineGap || 2,
        lineBreak: true
      });
      y += h + (opts.after || 8);
    }

    // ══ PAGE 1: COVER ══
    doc.addPage();
    pageNum++;

    doc.rect(0,0,W,H).fill(rgb(BG));
    // Decorative
    doc.circle(W-50, 110, 130).fillOpacity(0.07).fill(rgb(AC)).fillOpacity(1);
    doc.circle(50, H-110, 90).fillOpacity(0.05).fill(rgb(lgt(AC,40))).fillOpacity(1);
    // Top bar
    doc.rect(0,0,W,7).fill(rgb(AC));
    doc.rect(W*0.38,0,W*0.32,7).fill(rgb(lgt(AC,50)));

    addFooter(pageNum);

    let cy = 38;

    // Type badge
    doc.roundedRect(M, cy, 150, 22, 11).fill(rgb([...AC.map(v=>Math.min(v+15,255))]));
    doc.fillColor(rgb(lgt(AC,90))).font("Helvetica-Bold").fontSize(9);
    doc.text(`✦  ${(docLabel||"DOCUMENT").toUpperCase()}  ✦`, M+8, cy+7, { lineBreak:false });
    cy += 36;

    // Title
    doc.fillColor("white").font("Helvetica-Bold").fontSize(26);
    const th = doc.heightOfString(C.title||"", { width:TW-30 });
    doc.text(C.title||"", M, cy, { width:TW-30 });
    cy += th + 14;

    // Subtitle
    if (C.subtitle) {
      doc.fillColor(rgb([165,165,195])).font("Helvetica").fontSize(13);
      const sh = doc.heightOfString(C.subtitle, { width:TW-20 });
      doc.text(C.subtitle, M, cy, { width:TW-20 });
      cy += sh + 16;
    }

    // Tagline
    if (C.tagline) {
      doc.rect(M, cy, 3, 34).fill(rgb(AC));
      doc.fillColor(rgb(lgt(AC,100))).font("Helvetica-Oblique").fontSize(12);
      const tagl = doc.heightOfString(`"${C.tagline}"`, { width:TW-18 });
      doc.text(`"${C.tagline}"`, M+12, cy+4, { width:TW-18 });
      cy += tagl + 22;
    }

    // Price
    doc.rect(M, cy, 210, 32).fill(rgb([8,52,28]));
    doc.rect(M, cy, 3, 32).fill(rgb([16,185,129]));
    doc.fillColor(rgb([74,222,128])).font("Helvetica-Bold").fontSize(13);
    doc.text(`💰  Prix conseillé : ${C.price_suggested||""}`, M+12, cy+10, { lineBreak:false });
    cy += 44;

    doc.fillColor(rgb([90,90,130])).font("Helvetica").fontSize(10);
    doc.text(`${(C.chapters||[]).length} chapitres  ·  Exemples en FCFA  ·  Contexte africain`, M, cy);

    // Cover footer
    doc.rect(0,H-38,W,38).fill(rgb([0,0,0]));
    doc.fillColor(rgb([90,90,130])).font("Helvetica").fontSize(9);
    doc.text(`Par ${C.author||"Expert Digital"}`, M, H-24, { lineBreak:false });
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("PDF Cash IA", W-M-70, H-24, { lineBreak:false });

    // ══ PAGE 2: TABLE DES MATIÈRES ══
    newPage(C.title, "TABLE DES MATIÈRES");

    doc.fillColor(rgb([25,25,50])).font("Helvetica-Bold").fontSize(22);
    doc.text("Table des Matières", M, y);
    y += 30;
    doc.rect(M, y, 24, 3).fill(rgb(AC));
    y += 14;

    (C.table_of_contents||[]).forEach((item, i) => {
      ensureSpace(20, C.title, "TABLE DES MATIÈRES");
      doc.rect(M, y-3, TW, 18).fill(i%2===0 ? rgb([247,247,252]) : rgb([241,241,248]));
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
      doc.text(String(i+1).padStart(2,"0"), M+5, y+2, { lineBreak:false, width:22 });
      doc.fillColor(rgb([48,50,70])).font("Helvetica").fontSize(11);
      doc.text(item, M+30, y+2, { width:TW-40, lineBreak:false });
      y += 20;
    });

    if (C.description) {
      y += 12;
      ensureSpace(50, C.title, "TABLE DES MATIÈRES");
      doc.rect(M, y, TW, 1).fill(rgb([210,210,230]));
      y += 12;
      doc.fillColor(rgb([100,100,140])).font("Helvetica-Oblique").fontSize(11);
      const dh = doc.heightOfString(C.description, { width:TW });
      doc.text(C.description, M, y, { width:TW });
      y += dh + 10;
    }

    // ══ CHAPTERS — NO FORCED PAGE BREAKS ══
    // Start chapters on a new page only for the first one
    newPage(C.title, "CHAPITRES");

    (C.chapters||[]).forEach((ch, ci) => {
      const chTitle = ch.title || `Chapitre ${ci+1}`;

      // Smart break: if chapter heading + first 3 lines won't fit, go to new page
      doc.font("Helvetica-Bold").fontSize(16);
      const titleH = doc.heightOfString(chTitle, { width:TW-20 });
      const minNeeded = titleH + 30 + 60; // title box + some content
      ensureSpace(minNeeded, C.title, chTitle.slice(0,35));

      // Chapter number
      doc.fillColor(rgb([130,130,160])).font("Helvetica-Bold").fontSize(8);
      doc.text(`CHAPITRE ${String(ci+1).padStart(2,"0")}`, M, y, { letterSpacing:3, lineBreak:false });
      y += 13;

      // Chapter title box
      const boxH = titleH + 20;
      doc.rect(M, y, TW, boxH).fill(rgb(BG));
      doc.rect(M, y, 5, boxH).fill(rgb(AC));
      doc.fillColor("white").font("Helvetica-Bold").fontSize(16);
      doc.text(chTitle, M+16, y+10, { width:TW-24 });
      y += boxH + 16;

      // Chapter content — paragraph by paragraph
      const paras = (ch.content||"").split("\n").filter(p => p.trim().length > 0);

      paras.forEach(para => {
        const trimmed = para.trim();
        if (!trimmed) return;

        // Detect sub-heading
        const isHeading = (
          (trimmed.endsWith(":") && trimmed.length < 80) ||
          trimmed.startsWith("**") ||
          (/^\d+[\.\)]\s/.test(trimmed) && trimmed.length < 100)
        );

        if (isHeading) {
          const clean = trimmed.replace(/\*\*/g,"").replace(/:$/,"").replace(/^\d+[\.\)]\s/,"");
          doc.font("Helvetica-Bold").fontSize(12);
          const hh = doc.heightOfString(clean, { width:TW });
          // Don't orphan a heading at bottom of page
          ensureSpace(hh + 40, C.title, chTitle.slice(0,35));
          y += 6;
          doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(12);
          doc.text(clean, M, y, { width:TW });
          y += hh + 8;
          doc.fillColor(rgb([55,65,81])).font("Helvetica").fontSize(11);
        } else {
          doc.font("Helvetica").fontSize(11);
          const ph = doc.heightOfString(trimmed, { width:TW, lineGap:2 });
          ensureSpace(ph + 4, C.title, chTitle.slice(0,35));
          doc.fillColor(rgb([55,65,81])).font("Helvetica").fontSize(11);
          doc.text(trimmed, M, y, { width:TW, align:"justify", lineGap:2 });
          y += ph + 10;
        }
      });

      // Small visual separator between chapters (not a page break)
      if (ci < (C.chapters||[]).length - 1) {
        ensureSpace(20, C.title, "CHAPITRES");
        y += 6;
        doc.rect(M + TW/3, y, TW/3, 1).fill(rgb([40,40,60]));
        y += 14;
      }
    });

    // ══ KEY TAKEAWAYS ══
    // Smart break: start on new page only if less than 30% of page remains
    if (y > BOTTOM * 0.7) {
      newPage(C.title, "POINTS CLÉS");
    } else {
      y += 20;
      doc.rect(M, y, TW, 1.5).fill(rgb(AC));
      y += 16;
    }

    doc.fillColor(rgb([25,25,50])).font("Helvetica-Bold").fontSize(20);
    doc.text("Points Clés à Retenir", M, y);
    y += 28;
    doc.rect(M, y, 24, 3).fill(rgb([16,185,129]));
    y += 14;

    (C.key_takeaways||[]).forEach(k => {
      doc.font("Helvetica").fontSize(11);
      const kh = doc.heightOfString(k, { width:TW-36, lineGap:2 });
      const bh = Math.max(kh+16, 30);
      ensureSpace(bh+8, C.title, "POINTS CLÉS");
      doc.rect(M, y-4, TW, bh).fill(rgb([238,252,244]));
      doc.rect(M, y-4, 4, bh).fill(rgb([16,185,129]));
      doc.fillColor(rgb([16,185,129])).font("Helvetica-Bold").fontSize(14);
      doc.text("✓", M+9, y+4, { lineBreak:false });
      doc.fillColor(rgb([22,101,52])).font("Helvetica").fontSize(11);
      doc.text(k, M+28, y+4, { width:TW-40, lineGap:2 });
      y += bh + 8;
    });

    // ══ FINAL PAGE ══
    if (y > BOTTOM * 0.6) {
      newPage(C.title, "CONCLUSION");
    } else {
      y += 20;
    }

    // CTA
    doc.font("Helvetica-Bold").fontSize(14);
    const ctaText = C.call_to_action || "Passe à l'action maintenant !";
    const ctaH = doc.heightOfString(ctaText, { width:TW-28, align:"center" });
    const ctaBox = ctaH + 50;
    ensureSpace(ctaBox + 80, C.title, "CONCLUSION");

    doc.rect(M, y, TW, ctaBox).fill(rgb(BG));
    doc.rect(M, y, TW, ctaBox).lineWidth(1.5).stroke(rgb(AC));
    doc.rect(M, y, TW, 5).fill(rgb(AC));
    doc.fillColor("white").font("Helvetica-Bold").fontSize(14);
    doc.text(ctaText, M+14, y+18, { width:TW-28, align:"center" });
    doc.fillColor(rgb([74,222,128])).font("Helvetica-Bold").fontSize(13);
    doc.text(`💰  ${C.price_suggested||""}`, M, y+ctaBox-18, { align:"center", width:TW, lineBreak:false });
    y += ctaBox + 22;

    // Revenue
    ensureSpace(70, C.title, "CONCLUSION");
    doc.fillColor(rgb([48,50,70])).font("Helvetica-Bold").fontSize(12);
    doc.text("📊  POTENTIEL DE REVENUS", M, y);
    y += 16;
    const bW = (TW-16)/3;
    [[10,"10 ventes"],[50,"50 ventes"],[100,"100 ventes"]].forEach(([qty,lbl],i) => {
      const bx = M + i*(bW+8);
      doc.rect(bx, y, bW, 40).fill(rgb([248,250,252]));
      doc.rect(bx, y, bW, 3).fill(rgb(AC));
      doc.fillColor(rgb([100,120,140])).font("Helvetica").fontSize(9);
      doc.text(lbl, bx, y+9, { align:"center", width:bW, lineBreak:false });
      doc.fillColor(rgb([16,185,129])).font("Helvetica-Bold").fontSize(12);
      doc.text((pn*qty).toLocaleString("fr-FR")+" F", bx, y+22, { align:"center", width:bW, lineBreak:false });
    });
    y += 52;

    // WhatsApp message
    if (C.sales_message) {
      ensureSpace(80, C.title, "CONCLUSION");
      doc.fillColor(rgb([0,130,65])).font("Helvetica-Bold").fontSize(10);
      doc.text("📲  MESSAGE DE VENTE WHATSAPP", M, y);
      y += 14;
      const mh = doc.heightOfString(C.sales_message, { width:TW-14, lineGap:2 });
      doc.rect(M, y-4, TW, mh+18).fill(rgb([234,252,242]));
      doc.rect(M, y-4, 3, mh+18).fill(rgb([37,211,102]));
      doc.fillColor(rgb([20,80,45])).font("Helvetica").fontSize(10);
      doc.text(C.sales_message, M+10, y+4, { width:TW-18, lineGap:2 });
    }

    doc.end();
    await new Promise(resolve => doc.on("end", resolve));

    const buf = Buffer.concat(chunks);
    const fname = ((C.title||"document").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9 ]/g,"").replace(/ +/g,"_").slice(0,45))+".pdf";

    res.setHeader("Content-Type","application/pdf");
    res.setHeader("Content-Disposition",`attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch (err) {
    console.error("PDF error:", err);
    return res.status(500).json({ error: "Erreur PDF: " + err.message });
  }
}
