import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { content: C, visuals: V, docType, docLabel, color } = req.body || {};
  if (!C || !C.title) return res.status(400).json({ error: "Contenu manquant" });

  const col = color || { c1:"#1a0535", c2:"#0d1030", ac:"#7c3aed" };
  const pn = parseInt((C.price_suggested||"3000").replace(/\D/g,""))||3000;
  const visualsMap = {};
  if (V && V.visuals) {
    V.visuals.forEach(v => { visualsMap[v.chapter_index] = v; });
  }

  function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||"#7c3aed");
    return r ? [parseInt(r[1],16),parseInt(r[2],16),parseInt(r[3],16)] : [124,58,237];
  }
  function rgb(arr) { return `rgb(${arr[0]},${arr[1]},${arr[2]})`; }
  function lgt(arr, a) { return [Math.min(arr[0]+a,255),Math.min(arr[1]+a,255),Math.min(arr[2]+a,255)]; }

  const AC = hexRgb(col.ac);
  const BG = hexRgb(col.c1);
  const W=595.28, H=841.89, M=52, TW=W-M*2;
  const BOTTOM=H-55;

  try {
    const doc = new PDFDocument({ size:"A4", margin:0, autoFirstPage:false, info:{ Title:C.title, Author:C.author||"PDF Cash IA", Creator:"PDF Cash IA ✨ Premium" }});
    const chunks = [];
    doc.on("data", c => chunks.push(c));

    let y=0, pageNum=0;

    function addHeader(title, section) {
      // Premium header with gradient feel
      doc.rect(0,0,W,30).fill(rgb([8,8,20]));
      doc.rect(0,28,W,2).fill(rgb(AC));
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text((title||"").slice(0,52).toUpperCase(), M, 11, { lineBreak:false });
      doc.fillColor("#505070").font("Helvetica").fontSize(7);
      doc.text(section, W-M-130, 11, { width:130, align:"right", lineBreak:false });
      // Premium badge
      doc.fillColor(rgb(lgt(AC,80))).font("Helvetica-Bold").fontSize(6);
      doc.text("✨ PREMIUM", W-M-50, 20, { lineBreak:false });
      return 46;
    }

    function addFooter(n) {
      doc.rect(0,H-26,W,26).fill(rgb([6,6,16]));
      doc.fillColor("#363650").font("Helvetica").fontSize(7);
      doc.text("PDF Cash IA  ✨ Premium  —  pdfcash-ia.vercel.app", 0, H-15, { align:"center", width:W, lineBreak:false });
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text(String(n), W-M, H-15, { lineBreak:false });
    }

    function newPage(title, section) {
      doc.addPage(); pageNum++;
      addFooter(pageNum);
      y = addHeader(title, section);
    }

    function ensureSpace(needed, title, section) {
      if (y+needed > BOTTOM) newPage(title, section);
    }

    // ── DRAW VISUAL ──
    function drawVisual(visual, title, section) {
      if (!visual || !visual.type || !visual.data) return;
      const d = visual.data;

      switch(visual.type) {

        case "steps": {
          const steps = d.etapes || [];
          if (!steps.length) return;
          const boxH = 26 + steps.length * 30 + 16;
          ensureSpace(boxH + 16, title, section);
          y += 8;
          // Header
          doc.rect(M, y, TW, 26).fill(rgb(BG));
          doc.fillColor(rgb(lgt(AC,80))).font("Helvetica-Bold").fontSize(10);
          doc.text(`📋  ${d.titre||"Étapes clés"}`, M+10, y+9, { lineBreak:false });
          y += 26;
          steps.forEach((step, i) => {
            ensureSpace(32, title, section);
            const isLast = i === steps.length-1;
            doc.rect(M, y, TW, 28).fill(i%2===0 ? rgb([245,245,255]) : rgb([238,238,250]));
            // Number circle
            doc.circle(M+18, y+14, 11).fill(rgb(AC));
            doc.fillColor("white").font("Helvetica-Bold").fontSize(10);
            doc.text(String(i+1), M+18, y+9, { align:"center", width:0, lineBreak:false });
            // Arrow
            if (!isLast) {
              doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(12);
              doc.text("→", M+34, y+8, { lineBreak:false });
            }
            doc.fillColor(rgb([40,40,70])).font("Helvetica").fontSize(11);
            doc.text(step, M+50, y+9, { width:TW-58, lineBreak:false });
            y += 28;
          });
          y += 14;
          break;
        }

        case "chart": {
          const values = d.valeurs || [];
          if (!values.length) return;
          const chartH = 20 + values.length * 36 + 16;
          ensureSpace(chartH + 16, title, section);
          y += 8;
          doc.rect(M, y, TW, 24).fill(rgb(BG));
          doc.fillColor(rgb(lgt(AC,80))).font("Helvetica-Bold").fontSize(10);
          doc.text(`📊  ${d.titre||"Données"}`, M+10, y+8, { lineBreak:false });
          y += 24;
          const maxVal = Math.max(...values.map(v => v.valeur||0)) || 1;
          values.forEach((item, i) => {
            ensureSpace(38, title, section);
            doc.rect(M, y, TW, 32).fill(i%2===0 ? rgb([245,250,247]) : rgb([238,248,242]));
            doc.fillColor(rgb([48,50,70])).font("Helvetica").fontSize(10);
            doc.text(item.label||"", M+8, y+8, { lineBreak:false, width:100 });
            // Bar
            const barW = Math.max(((item.valeur||0)/maxVal) * (TW-180), 4);
            doc.rect(M+114, y+9, barW, 14).fill(rgb(AC));
            // Value
            doc.fillColor(rgb([16,185,129])).font("Helvetica-Bold").fontSize(10);
            const valStr = (item.valeur||0).toLocaleString("fr-FR") + " " + (item.unite||"FCFA");
            doc.text(valStr, M+TW-90, y+9, { lineBreak:false, width:86, align:"right" });
            y += 32;
          });
          y += 14;
          break;
        }

        case "quote": {
          const text = d.texte || "";
          if (!text) return;
          doc.font("Helvetica-Oblique").fontSize(12);
          const qh = doc.heightOfString(text, { width:TW-40 });
          const boxH = qh + 36;
          ensureSpace(boxH+16, title, section);
          y += 8;
          doc.rect(M, y, TW, boxH).fill(rgb([245,245,255]));
          doc.rect(M, y, 4, boxH).fill(rgb(AC));
          doc.rect(M+TW-4, y, 4, boxH).fill(rgb(AC));
          doc.fillColor(rgb(lgt(AC,60))).font("Helvetica-Bold").fontSize(22);
          doc.text(""", M+12, y+4, { lineBreak:false });
          doc.fillColor(rgb([50,50,80])).font("Helvetica-Oblique").fontSize(12);
          doc.text(text, M+24, y+16, { width:TW-40 });
          if (d.auteur) {
            doc.fillColor(rgb([100,100,140])).font("Helvetica-Bold").fontSize(9);
            doc.text(`— ${d.auteur}`, M+24, y+boxH-14, { lineBreak:false });
          }
          y += boxH + 14;
          break;
        }

        case "table": {
          const cols = d.colonnes || [];
          const rows = d.lignes || [];
          if (!cols.length || !rows.length) return;
          const rowH = 24;
          const tableH = rowH * (rows.length+1) + 30;
          ensureSpace(tableH+16, title, section);
          y += 8;
          doc.rect(M, y, TW, 24).fill(rgb(BG));
          doc.fillColor(rgb(lgt(AC,80))).font("Helvetica-Bold").fontSize(10);
          doc.text(`📋  ${d.titre||"Tableau"}`, M+10, y+8, { lineBreak:false });
          y += 24;
          const colW = TW/cols.length;
          // Header row
          doc.rect(M, y, TW, rowH).fill(rgb(AC));
          cols.forEach((col, i) => {
            doc.fillColor("white").font("Helvetica-Bold").fontSize(9);
            doc.text(col, M+i*colW+4, y+8, { width:colW-8, lineBreak:false });
          });
          y += rowH;
          rows.forEach((row, ri) => {
            ensureSpace(rowH+4, title, section);
            doc.rect(M, y, TW, rowH).fill(ri%2===0 ? rgb([245,247,252]) : rgb([237,240,250]));
            row.forEach((cell, ci) => {
              doc.fillColor(rgb([45,50,70])).font("Helvetica").fontSize(9);
              doc.text(String(cell), M+ci*colW+4, y+8, { width:colW-8, lineBreak:false });
            });
            y += rowH;
          });
          y += 14;
          break;
        }

        case "highlight": {
          const points = d.points || [];
          if (!points.length) return;
          const boxH = 26 + points.length * 24 + 12;
          ensureSpace(boxH+16, title, section);
          y += 8;
          doc.rect(M, y, TW, boxH).fill(rgb([240,248,255]));
          doc.rect(M, y, TW, 26).fill(rgb(BG));
          doc.rect(M, y, TW, 3).fill(rgb(AC));
          doc.fillColor(rgb(lgt(AC,80))).font("Helvetica-Bold").fontSize(10);
          doc.text(`💡  ${d.titre||"Points importants"}`, M+10, y+10, { lineBreak:false });
          y += 26;
          points.forEach(point => {
            ensureSpace(26, title, section);
            doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
            doc.text("›", M+8, y+2, { lineBreak:false });
            doc.fillColor(rgb([40,50,80])).font("Helvetica").fontSize(11);
            doc.text(point, M+22, y+2, { width:TW-30, lineBreak:false });
            y += 24;
          });
          y += 10;
          break;
        }
      }
    }

    // ══ COVER PAGE — same as Simple but with PREMIUM badge ══
    doc.addPage(); pageNum++;

    doc.rect(0,0,W,H).fill(rgb(BG));
    doc.circle(W-50,110,130).fillOpacity(0.07).fill(rgb(AC)).fillOpacity(1);
    doc.circle(50,H-110,90).fillOpacity(0.05).fill(rgb(lgt(AC,40))).fillOpacity(1);
    doc.rect(0,0,W,7).fill(rgb(AC));
    doc.rect(W*0.38,0,W*0.32,7).fill(rgb(lgt(AC,50)));
    addFooter(pageNum);

    cy = 38;
    // Premium badge
    doc.roundedRect(M, cy, 180, 22, 11).fill(rgb([...AC.map(v=>Math.min(v+15,255))]));
    doc.fillColor(rgb(lgt(AC,90))).font("Helvetica-Bold").fontSize(9);
    doc.text(`✨  ${(docLabel||"DOCUMENT").toUpperCase()} PREMIUM  ✨`, M+8, cy+7, { lineBreak:false });
    cy += 36;

    doc.fillColor("white").font("Helvetica-Bold").fontSize(26);
    const th = doc.heightOfString(C.title||"", { width:TW-30 });
    doc.text(C.title||"", M, cy, { width:TW-30 }); cy += th+14;

    if (C.subtitle) {
      doc.fillColor(rgb([165,165,195])).font("Helvetica").fontSize(13);
      const sh = doc.heightOfString(C.subtitle, { width:TW-20 });
      doc.text(C.subtitle, M, cy, { width:TW-20 }); cy += sh+16;
    }

    if (C.tagline) {
      doc.rect(M, cy, 3, 34).fill(rgb(AC));
      doc.fillColor(rgb(lgt(AC,100))).font("Helvetica-Oblique").fontSize(12);
      const tgl = doc.heightOfString(`"${C.tagline}"`, { width:TW-18 });
      doc.text(`"${C.tagline}"`, M+12, cy+4, { width:TW-18 }); cy += tgl+22;
    }

    doc.rect(M, cy, 210, 32).fill(rgb([8,52,28]));
    doc.rect(M, cy, 3, 32).fill(rgb([16,185,129]));
    doc.fillColor(rgb([74,222,128])).font("Helvetica-Bold").fontSize(13);
    doc.text(`💰  Prix conseillé : ${C.price_suggested||""}`, M+12, cy+10, { lineBreak:false }); cy += 44;

    doc.fillColor(rgb([90,90,130])).font("Helvetica").fontSize(10);
    doc.text(`${(C.chapters||[]).length} chapitres  ·  Visuels inclus  ·  Exemples en FCFA  ·  Contexte africain`, M, cy);

    doc.rect(0,H-38,W,38).fill(rgb([0,0,0]));
    doc.fillColor(rgb([90,90,130])).font("Helvetica").fontSize(9);
    doc.text(`Par ${C.author||"Expert Digital"}`, M, H-24, { lineBreak:false });
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("PDF Cash IA  ✨ Premium", W-M-120, H-24, { lineBreak:false });

    // ══ TABLE DES MATIÈRES ══
    newPage(C.title, "TABLE DES MATIÈRES");
    doc.fillColor(rgb([25,25,50])).font("Helvetica-Bold").fontSize(22);
    doc.text("Table des Matières", M, y); y += 30;
    doc.rect(M,y,24,3).fill(rgb(AC)); y += 14;

    (C.table_of_contents||[]).forEach((item, i) => {
      ensureSpace(20, C.title, "TABLE DES MATIÈRES");
      doc.rect(M,y-3,TW,18).fill(i%2===0 ? rgb([247,247,252]) : rgb([241,241,248]));
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
      doc.text(String(i+1).padStart(2,"0"), M+5, y+2, { lineBreak:false, width:22 });
      doc.fillColor(rgb([48,50,70])).font("Helvetica").fontSize(11);
      doc.text(item, M+30, y+2, { width:TW-40, lineBreak:false });
      y += 20;
    });

    // ══ CHAPTERS WITH VISUALS ══
    newPage(C.title, "CHAPITRES");

    (C.chapters||[]).forEach((ch, ci) => {
      const chTitle = ch.title||`Chapitre ${ci+1}`;
      doc.font("Helvetica-Bold").fontSize(16);
      const titleH = doc.heightOfString(chTitle, { width:TW-20 });
      ensureSpace(titleH + 80, C.title, chTitle.slice(0,35));

      doc.fillColor(rgb([130,130,160])).font("Helvetica-Bold").fontSize(8);
      doc.text(`CHAPITRE ${String(ci+1).padStart(2,"0")}`, M, y, { letterSpacing:3, lineBreak:false });
      y += 13;

      const boxH = titleH+20;
      doc.rect(M,y,TW,boxH).fill(rgb(BG));
      doc.rect(M,y,5,boxH).fill(rgb(AC));
      doc.fillColor("white").font("Helvetica-Bold").fontSize(16);
      doc.text(chTitle, M+16, y+10, { width:TW-24 });
      y += boxH+16;

      // Content
      const paras = (ch.content||"").split("\n").filter(p=>p.trim().length>0);
      paras.forEach(para => {
        const trimmed = para.trim();
        if (!trimmed) return;
        const isHeading = (trimmed.endsWith(":") && trimmed.length<80) || trimmed.startsWith("**") || (/^\d+[\.\)]\s/.test(trimmed) && trimmed.length<100);
        if (isHeading) {
          const clean = trimmed.replace(/\*\*/g,"").replace(/:$/,"").replace(/^\d+[\.\)]\s/,"");
          doc.font("Helvetica-Bold").fontSize(12);
          const hh = doc.heightOfString(clean, { width:TW });
          ensureSpace(hh+40, C.title, chTitle.slice(0,35));
          y += 6;
          doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(12);
          doc.text(clean, M, y, { width:TW }); y += hh+8;
          doc.fillColor(rgb([55,65,81])).font("Helvetica").fontSize(11);
        } else {
          doc.font("Helvetica").fontSize(11);
          const ph = doc.heightOfString(trimmed, { width:TW, lineGap:2 });
          ensureSpace(ph+4, C.title, chTitle.slice(0,35));
          doc.fillColor(rgb([55,65,81])).font("Helvetica").fontSize(11);
          doc.text(trimmed, M, y, { width:TW, align:"justify", lineGap:2 }); y += ph+10;
        }
      });

      // Draw visual after chapter content
      const visual = visualsMap[ci];
      if (visual) {
        drawVisual(visual, C.title, chTitle.slice(0,35));
      }

      // Separator between chapters
      if (ci < (C.chapters||[]).length-1) {
        ensureSpace(20, C.title, "CHAPITRES");
        y += 6;
        doc.rect(M+TW/3, y, TW/3, 1).fill(rgb([40,40,60]));
        y += 14;
      }
    });

    // ══ KEY TAKEAWAYS ══
    if (y > BOTTOM*0.7) newPage(C.title, "POINTS CLÉS");
    else { y+=20; doc.rect(M,y,TW,1.5).fill(rgb(AC)); y+=16; }

    doc.fillColor(rgb([25,25,50])).font("Helvetica-Bold").fontSize(20);
    doc.text("Points Clés à Retenir", M, y); y+=28;
    doc.rect(M,y,24,3).fill(rgb([16,185,129])); y+=14;

    (C.key_takeaways||[]).forEach(k => {
      doc.font("Helvetica").fontSize(11);
      const kh = doc.heightOfString(k, { width:TW-36, lineGap:2 });
      const bh = Math.max(kh+16,30);
      ensureSpace(bh+8, C.title, "POINTS CLÉS");
      doc.rect(M,y-4,TW,bh).fill(rgb([238,252,244]));
      doc.rect(M,y-4,4,bh).fill(rgb([16,185,129]));
      doc.fillColor(rgb([16,185,129])).font("Helvetica-Bold").fontSize(14);
      doc.text("✓", M+9, y+4, { lineBreak:false });
      doc.fillColor(rgb([22,101,52])).font("Helvetica").fontSize(11);
      doc.text(k, M+28, y+4, { width:TW-40, lineGap:2 }); y+=bh+8;
    });

    // ══ CONCLUSION ══
    if (y > BOTTOM*0.6) newPage(C.title, "CONCLUSION");
    else y+=20;

    doc.font("Helvetica-Bold").fontSize(14);
    const ctaText = C.call_to_action||"Passe à l'action maintenant !";
    const ctaH = doc.heightOfString(ctaText, { width:TW-28, align:"center" });
    const ctaBox = ctaH+50;
    ensureSpace(ctaBox+80, C.title, "CONCLUSION");
    doc.rect(M,y,TW,ctaBox).fill(rgb(BG));
    doc.rect(M,y,TW,ctaBox).lineWidth(1.5).stroke(rgb(AC));
    doc.rect(M,y,TW,5).fill(rgb(AC));
    doc.fillColor("white").font("Helvetica-Bold").fontSize(14);
    doc.text(ctaText, M+14, y+18, { width:TW-28, align:"center" });
    doc.fillColor(rgb([74,222,128])).font("Helvetica-Bold").fontSize(13);
    doc.text(`💰  ${C.price_suggested||""}`, M, y+ctaBox-18, { align:"center", width:TW, lineBreak:false });
    y += ctaBox+22;

    ensureSpace(70, C.title, "CONCLUSION");
    doc.fillColor(rgb([48,50,70])).font("Helvetica-Bold").fontSize(12);
    doc.text("📊  POTENTIEL DE REVENUS", M, y); y+=16;
    const bW=(TW-16)/3;
    [[10,"10 ventes"],[50,"50 ventes"],[100,"100 ventes"]].forEach(([qty,lbl],i) => {
      const bx=M+i*(bW+8);
      doc.rect(bx,y,bW,40).fill(rgb([248,250,252]));
      doc.rect(bx,y,bW,3).fill(rgb(AC));
      doc.fillColor(rgb([100,120,140])).font("Helvetica").fontSize(9);
      doc.text(lbl,bx,y+9,{align:"center",width:bW,lineBreak:false});
      doc.fillColor(rgb([16,185,129])).font("Helvetica-Bold").fontSize(12);
      doc.text((pn*qty).toLocaleString("fr-FR")+" F",bx,y+22,{align:"center",width:bW,lineBreak:false});
    });
    y+=52;

    if (C.sales_message) {
      ensureSpace(80, C.title, "CONCLUSION");
      doc.fillColor(rgb([0,130,65])).font("Helvetica-Bold").fontSize(10);
      doc.text("📲  MESSAGE DE VENTE WHATSAPP", M, y); y+=14;
      const mh = doc.heightOfString(C.sales_message, { width:TW-14, lineGap:2 });
      doc.rect(M,y-4,TW,mh+18).fill(rgb([234,252,242]));
      doc.rect(M,y-4,3,mh+18).fill(rgb([37,211,102]));
      doc.fillColor(rgb([20,80,45])).font("Helvetica").fontSize(10);
      doc.text(C.sales_message, M+10, y+4, { width:TW-18, lineGap:2 });
    }

    doc.end();
    await new Promise(resolve => doc.on("end", resolve));

    const buf = Buffer.concat(chunks);
    const fname = ((C.title||"document").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9 ]/g,"").replace(/ +/g,"_").slice(0,45))+"_premium.pdf";

    res.setHeader("Content-Type","application/pdf");
    res.setHeader("Content-Disposition",`attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch(err) {
    console.error("PDF Premium error:", err);
    return res.status(500).json({ error:"Erreur PDF Premium: "+err.message });
  }
}
