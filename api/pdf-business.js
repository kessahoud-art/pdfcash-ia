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
  const col = color || { ac: "#1a5276" };
  function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#1a5276");
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [26,82,118];
  }
  function rgb(arr) { return `rgb(${arr[0]},${arr[1]},${arr[2]})`; }
  function lgt(arr, a) { return arr.map(v => Math.min(v + a, 255)); }
  function dkn(arr, a) { return arr.map(v => Math.max(v - a, 0)); }

  const AC    = hexRgb(col.ac || col.c1 || "#1a5276");
  const DARK  = [15, 20, 35];
  const GRAY  = [90, 95, 120];
  const LGRAY = [160, 165, 185];
  const BORDER= [215, 220, 232];
  const GREEN = [22, 163, 74];
  const ORANGE= [217, 119, 6];

  const W = 595.28;
  const H = 841.89;
  const ML = 55;
  const MR = 55;
  const TW = W - ML - MR;
  const BOTTOM = H - 45;

  const author = clean(authorName || C.author || 'Consultant Business');
  const title  = clean(C.title || 'Business Plan');
  const pn = parseInt((C.price_suggested || "50000").replace(/\D/g, "")) || 50000;
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
      if (y + needed > BOTTOM) newPage(section || "BUSINESS PLAN");
    }

    // ── SECTION TITLE ──
    function sectionTitle(text, section) {
      ensureSpace(45, section);
      y += 8;
      doc.fillColor(rgb(LGRAY)).font("Helvetica-Bold").fontSize(8);
      doc.text(text.toUpperCase(), ML, y, { lineBreak: false, characterSpacing: 1.5 });
      y += 14;
      doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(2).strokeColor(rgb(AC)).stroke();
      y += 12;
    }

    // ── PARAGRAPH ──
    function writePara(text, section) {
      const t = clean(text);
      if (!t) return;
      doc.font("Helvetica").fontSize(10);
      const ph = doc.heightOfString(t, { width: TW, lineGap: 2 });
      ensureSpace(ph + 6, section);
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(t, ML, y, { width: TW, align: "justify", lineGap: 2 });
      y += ph + 10;
    }

    // ── BULLET ──
    function bullet(text, section) {
      const t = clean(text);
      if (!t) return;
      doc.font("Helvetica").fontSize(10);
      const ph = doc.heightOfString(t, { width: TW - 16, lineGap: 2 });
      ensureSpace(ph + 6, section);
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
      doc.text("-", ML, y, { lineBreak: false });
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(t, ML + 14, y, { width: TW - 16, lineGap: 2 });
      y += ph + 8;
    }

    // ── METRIC BOX ──
    function metricRow(items) {
      // items: [{label, value, color}]
      ensureSpace(55, "PLAN FINANCIER");
      const bW = (TW - (items.length - 1) * 8) / items.length;
      items.forEach((item, i) => {
        const bx = ML + i * (bW + 8);
        const col = item.color || AC;
        doc.rect(bx, y, bW, 48).lineWidth(1).strokeColor(rgb(BORDER)).stroke();
        doc.moveTo(bx, y).lineTo(bx + bW, y).lineWidth(3).strokeColor(rgb(col)).stroke();
        doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(8);
        doc.text(clean(item.label), bx, y + 8, { align: "center", width: bW, lineBreak: false });
        doc.fillColor(rgb(col)).font("Helvetica-Bold").fontSize(13);
        doc.text(clean(item.value), bx, y + 24, { align: "center", width: bW, lineBreak: false });
      });
      y += 62;
    }

    // ── TABLEAU ──
    function drawTable(headers, rows, section) {
      const colW = TW / headers.length;
      ensureSpace(30 + rows.length * 22, section);

      // En-tête tableau
      doc.rect(ML, y, TW, 24).fill(rgb(AC));
      headers.forEach((h, i) => {
        doc.fillColor(rgb([255,255,255])).font("Helvetica-Bold").fontSize(9);
        doc.text(clean(h), ML + i * colW + 6, y + 8, { width: colW - 8, lineBreak: false });
      });
      y += 24;

      // Lignes
      rows.forEach((row, ri) => {
        const rowH = 20;
        ensureSpace(rowH + 4, section);
        if (ri % 2 === 0) {
          doc.rect(ML, y, TW, rowH).fill(rgb(lgt(AC, 230)));
        }
        row.forEach((cell, ci) => {
          doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(9);
          doc.text(clean(String(cell)), ML + ci * colW + 6, y + 6, { width: colW - 8, lineBreak: false });
        });
        // Bordures colonnes
        headers.forEach((_, i) => {
          doc.moveTo(ML + i * colW, y).lineTo(ML + i * colW, y + rowH)
            .lineWidth(0.3).strokeColor(rgb(BORDER)).stroke();
        });
        y += rowH;
      });
      // Bordure extérieure
      doc.rect(ML, y - rows.length * 20 - 24, TW, rows.length * 20 + 24)
        .lineWidth(1).strokeColor(rgb(BORDER)).stroke();
      y += 14;
    }

    // ════════════════════════════════════════
    // PAGE 1 — COUVERTURE
    // ════════════════════════════════════════
    doc.addPage();
    pageNum++;

    // Bande fine en haut
    doc.rect(0, 0, W, 5).fill(rgb(AC));

    // Label
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("BUSINESS PLAN", 0, 25, { width: W, align: "center", characterSpacing: 3, lineBreak: false });

    // Titre
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(28);
    const th = doc.heightOfString(title, { width: TW, align: "center" });
    doc.text(title, ML, 55, { width: TW, align: "center" });
    let cy = 55 + th + 18;

    // Ligne accent
    doc.moveTo(W/2 - 50, cy).lineTo(W/2 + 50, cy).lineWidth(2.5).strokeColor(rgb(AC)).stroke();
    cy += 18;

    // Sous-titre
    if (C.subtitle) {
      doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(12);
      const sh = doc.heightOfString(clean(C.subtitle), { width: TW, align: "center" });
      doc.text(clean(C.subtitle), ML, cy, { width: TW, align: "center" });
      cy += sh + 16;
    }

    // Métriques clés couverture
    cy += 10;
    const bW3 = (TW - 16) / 3;
    [
      { label: "Investissement initial", val: pn.toLocaleString("fr-FR") + " FCFA", col: AC },
      { label: "Projection 12 mois", val: (pn * 6).toLocaleString("fr-FR") + " FCFA", col: GREEN },
      { label: "Seuil rentabilité", val: "3-6 mois", col: ORANGE }
    ].forEach((m, i) => {
      const bx = ML + i * (bW3 + 8);
      doc.rect(bx, cy, bW3, 52).lineWidth(1).strokeColor(rgb(BORDER)).stroke();
      doc.moveTo(bx, cy).lineTo(bx + bW3, cy).lineWidth(3).strokeColor(rgb(m.col)).stroke();
      doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(8);
      doc.text(m.label, bx, cy + 9, { align: "center", width: bW3, lineBreak: false });
      doc.fillColor(rgb(m.col)).font("Helvetica-Bold").fontSize(11);
      doc.text(m.val, bx, cy + 27, { align: "center", width: bW3, lineBreak: false });
    });
    cy += 68;

    // Auteur + marque
    doc.moveTo(ML, H - 55).lineTo(W - MR, H - 55).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
    doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(9);
    doc.text("Préparé par : " + author, ML, H - 44, { lineBreak: false });
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("PDF Cash IA", W - MR - 60, H - 44, { lineBreak: false });
    doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(8);
    doc.text("pdfcash-ia.vercel.app", W - MR - 80, H - 30, { lineBreak: false });

    // ════════════════════════════════════════
    // PAGE 2 — TABLE DES MATIÈRES + RÉSUMÉ
    // ════════════════════════════════════════
    newPage("TABLE DES MATIERES");

    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(20);
    doc.text("Table des Matieres", ML, y);
    y += 26;
    doc.moveTo(ML, y).lineTo(ML + 30, y).lineWidth(3).strokeColor(rgb(AC)).stroke();
    y += 16;

    const sections = [
      "Resume Executif",
      "Presentation du Projet",
      "Etude de Marche",
      "Plan Financier",
      "Strategie Marketing",
      "Projections et Objectifs"
    ];
    sections.forEach((s, i) => {
      ensureSpace(22, "TABLE DES MATIERES");
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(11);
      doc.text(String(i+1).padStart(2,"0"), ML, y, { lineBreak: false, width: 24 });
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(11);
      doc.text(s, ML + 36, y, { width: TW - 46, lineBreak: false });
      doc.moveTo(ML + 36, y + 15).lineTo(W - MR, y + 15).lineWidth(0.4).strokeColor(rgb(BORDER)).stroke();
      y += 20;
    });

    // Description
    if (C.description) {
      y += 14;
      doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
      y += 12;
      doc.fillColor(rgb(GRAY)).font("Helvetica-Oblique").fontSize(10);
      const dh = doc.heightOfString(clean(C.description), { width: TW, lineGap: 2 });
      doc.text(clean(C.description), ML, y, { width: TW, lineGap: 2 });
      y += dh + 10;
    }

    // ════════════════════════════════════════
    // SECTIONS BUSINESS PLAN
    // ════════════════════════════════════════

    // Section 1 — Résumé exécutif
    newPage("RESUME EXECUTIF");
    sectionTitle("1. Resume Executif", "RESUME EXECUTIF");
    const ch0 = chapters[0];
    if (ch0) {
      const paras = clean(ch0.content || '').split(/\n+/).filter(p => p.trim().length > 10);
      paras.slice(0, 5).forEach(p => writePara(p, "RESUME EXECUTIF"));
    }

    // Métriques clés
    y += 6;
    metricRow([
      { label: "Capital de démarrage", value: pn.toLocaleString("fr-FR") + " FCFA", color: AC },
      { label: "Chiffre d'affaires an 1", value: (pn * 4).toLocaleString("fr-FR") + " FCFA", color: GREEN },
      { label: "Benefice net an 1", value: (pn * 2).toLocaleString("fr-FR") + " FCFA", color: ORANGE }
    ]);

    // Section 2 — Présentation du projet
    newPage("PRESENTATION DU PROJET");
    sectionTitle("2. Presentation du Projet", "PRESENTATION DU PROJET");
    const ch1 = chapters[1];
    if (ch1) {
      const paras = clean(ch1.content || '').split(/\n+/).filter(p => p.trim().length > 10);
      paras.slice(0, 6).forEach(p => writePara(p, "PRESENTATION DU PROJET"));
    }

    // Points clés du projet
    y += 6;
    sectionTitle("Points Cles", "PRESENTATION DU PROJET");
    (C.key_takeaways || []).slice(0, 4).forEach(k => bullet(k, "PRESENTATION DU PROJET"));

    // Section 3 — Étude de marché
    newPage("ETUDE DE MARCHE");
    sectionTitle("3. Etude de Marche", "ETUDE DE MARCHE");
    const ch2 = chapters[2];
    if (ch2) {
      const paras = clean(ch2.content || '').split(/\n+/).filter(p => p.trim().length > 10);
      paras.slice(0, 6).forEach(p => writePara(p, "ETUDE DE MARCHE"));
    }

    // Tableau concurrents
    y += 6;
    sectionTitle("Analyse Concurrentielle", "ETUDE DE MARCHE");
    drawTable(
      ["Critere", "Notre Offre", "Concurrents"],
      [
        ["Prix", clean(C.price_suggested || pn.toLocaleString("fr-FR") + " FCFA"), "Plus eleve"],
        ["Livraison", "Immediate WhatsApp", "3-5 jours"],
        ["Qualite", "Premium adapte Afrique", "Generique"],
        ["Support", "WhatsApp direct", "Email seulement"]
      ],
      "ETUDE DE MARCHE"
    );

    // Section 4 — Plan financier
    newPage("PLAN FINANCIER");
    sectionTitle("4. Plan Financier", "PLAN FINANCIER");
    const ch3 = chapters[3];
    if (ch3) {
      const paras = clean(ch3.content || '').split(/\n+/).filter(p => p.trim().length > 10);
      paras.slice(0, 4).forEach(p => writePara(p, "PLAN FINANCIER"));
    }

    // Tableau budget
    y += 6;
    sectionTitle("Budget de Demarrage", "PLAN FINANCIER");
    drawTable(
      ["Poste de Depense", "Montant (FCFA)", "Priorite"],
      [
        ["Creation produit", Math.round(pn * 0.3).toLocaleString("fr-FR"), "Haute"],
        ["Facebook Ads (3 mois)", Math.round(pn * 0.4).toLocaleString("fr-FR"), "Haute"],
        ["Outils et logiciels", Math.round(pn * 0.1).toLocaleString("fr-FR"), "Moyenne"],
        ["Reserve operationnelle", Math.round(pn * 0.2).toLocaleString("fr-FR"), "Haute"],
        ["TOTAL", pn.toLocaleString("fr-FR"), ""]
      ],
      "PLAN FINANCIER"
    );

    // Projections mensuelles
    y += 6;
    sectionTitle("Projections de Revenus (12 mois)", "PLAN FINANCIER");
    const projRows = [];
    for (let m = 1; m <= 12; m++) {
      const ventes = Math.round(5 + m * 3.5);
      const ca = ventes * Math.round(pn / 10);
      projRows.push([
        "Mois " + m,
        ventes + " ventes",
        ca.toLocaleString("fr-FR") + " FCFA",
        m >= 4 ? "Beneficiaire" : "Investissement"
      ]);
    }
    drawTable(["Periode", "Ventes", "CA Previsionnel", "Statut"], projRows, "PLAN FINANCIER");

    // Section 5 — Stratégie marketing
    newPage("STRATEGIE MARKETING");
    sectionTitle("5. Strategie Marketing", "STRATEGIE MARKETING");
    const ch4 = chapters[4];
    if (ch4) {
      const paras = clean(ch4.content || '').split(/\n+/).filter(p => p.trim().length > 10);
      paras.slice(0, 6).forEach(p => writePara(p, "STRATEGIE MARKETING"));
    }

    // Facebook Ads
    if (C.facebook_ads && C.facebook_ads.texte_principal) {
      y += 6;
      sectionTitle("Script Facebook Ads", "STRATEGIE MARKETING");
      ensureSpace(60, "STRATEGIE MARKETING");
      doc.moveTo(ML, y).lineTo(ML, y + 4).lineWidth(3).strokeColor(rgb([59,130,246])).stroke();
      const adsText = clean(C.facebook_ads.texte_principal);
      doc.fillColor(rgb(GRAY)).font("Helvetica-Oblique").fontSize(10);
      const ah = doc.heightOfString(adsText, { width: TW - 14, lineGap: 2 });
      doc.text(adsText, ML + 12, y, { width: TW - 14, lineGap: 2 });
      y += ah + 14;
    }

    // Section 6 — Projections et objectifs
    newPage("PROJECTIONS ET OBJECTIFS");
    sectionTitle("6. Projections et Objectifs", "PROJECTIONS ET OBJECTIFS");
    const ch5 = chapters[5];
    if (ch5) {
      const paras = clean(ch5.content || '').split(/\n+/).filter(p => p.trim().length > 10);
      paras.slice(0, 4).forEach(p => writePara(p, "PROJECTIONS ET OBJECTIFS"));
    }

    // Objectifs SMART
    y += 6;
    sectionTitle("Objectifs SMART", "PROJECTIONS ET OBJECTIFS");
    [
      "Atteindre " + Math.round(pn / 500) + " ventes le premier mois via Facebook Ads",
      "Generer " + (pn * 2).toLocaleString("fr-FR") + " FCFA de CA au bout de 3 mois",
      "Constituer une base de " + Math.round(pn / 200) + " clients WhatsApp fideles en 6 mois",
      "Atteindre le seuil de rentabilite avant le 4eme mois",
      "Lancer 2 nouveaux produits complementaires en annee 2"
    ].forEach(o => bullet(o, "PROJECTIONS ET OBJECTIFS"));

    // CTA final
    ensureSpace(70, "PROJECTIONS ET OBJECTIFS");
    y += 14;
    const ctaText = clean(C.call_to_action || "Passez a l'action maintenant !");
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
    ensureSpace(30, "PROJECTIONS ET OBJECTIFS");
    y += 10;
    doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
    y += 10;
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("PDF Cash IA  -  pdfcash-ia.vercel.app", 0, y, { width: W, align: "center", lineBreak: false });

    // ── FINALISATION ──
    doc.end();
    await new Promise(resolve => doc.on("end", resolve));

    const buf = Buffer.concat(chunks);
    const fname = ((C.title || "business-plan")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "").replace(/ +/g, "_").slice(0, 40)) + "_BusinessPlan.pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch (err) {
    console.error("PDF-Business error:", err);
    return res.status(500).json({ error: "Erreur PDF Business Plan: " + err.message });
  }
}
