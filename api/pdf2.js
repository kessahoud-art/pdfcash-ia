import PDFDocument from 'pdfkit';

// Nettoie les emojis et caractères non-latin
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

  const { content: C, authorName } = req.body || {};
  if (!C || !C.title) return res.status(400).json({ error: "Contenu manquant" });

  // ── COULEURS FIXES NOUVEAU FLOW ──
  const ORANGE  = '#E67E22';
  const DARK    = '#1A1A1A';
  const GRAY    = '#777777';
  const LGRAY   = '#AAAAAA';
  const BORDER  = '#DDDDDD';
  const ACCENT  = '#2C3E50';

  // ── DIMENSIONS ──
  const W      = 595.28;
  const H      = 841.89;
  const M      = 55;
  const TW     = W - M * 2;
  const BOTTOM = H - 50;

  const author = clean(authorName || C.author || 'Expert Digital Afrique');
  const pn = parseInt((C.price_suggested || "5000").replace(/\D/g, "")) || 5000;

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
    // HEADER — pages intérieures
    // ════════════════════════════════════════
    function addHeader(section) {
      // Ligne fine orange en haut
      doc.moveTo(0, 0).lineTo(W, 0).lineWidth(3).strokeColor(ORANGE).stroke();
      // Titre doc à gauche
      doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(7);
      doc.text(clean(C.title).slice(0, 55), M, 8, { lineBreak: false });
      // Section à droite
      doc.fillColor(LGRAY).font("Helvetica").fontSize(7);
      doc.text(clean(section), W - M - 130, 8, { width: 130, align: "right", lineBreak: false });
      // Séparateur
      doc.moveTo(M, 20).lineTo(W - M, 20).lineWidth(0.5).strokeColor(BORDER).stroke();
      return 32;
    }

    // ════════════════════════════════════════
    // FOOTER — toutes les pages intérieures
    // ════════════════════════════════════════
    function addFooter(n) {
      doc.moveTo(M, H - 18).lineTo(W - M, H - 18).lineWidth(0.5).strokeColor(BORDER).stroke();
      doc.fillColor(LGRAY).font("Helvetica").fontSize(7);
      doc.text("PDF Cash IA  -  pdfcash-ia.vercel.app", 0, H - 13, { align: "center", width: W, lineBreak: false });
      doc.fillColor(ORANGE).font("Helvetica-Bold").fontSize(7);
      doc.text(String(n), W - M, H - 13, { lineBreak: false });
    }

    function newPage(section) {
      doc.addPage();
      pageNum++;
      addFooter(pageNum);
      y = addHeader(section);
    }

    function ensureSpace(needed, section) {
      if (y + needed > BOTTOM) newPage(section);
    }

    // ════════════════════════════════════════
    // PAGE 1 — COUVERTURE MINIMALISTE PRO
    // Aucun rect de fond — fond blanc par défaut
    // ════════════════════════════════════════
    doc.addPage();
    pageNum++;

    const cx = W / 2;

    // Bande fine orange tout en haut (5px seulement)
    doc.rect(0, 0, W, 5).fill(ORANGE);

    // Label type document
    doc.fillColor(ORANGE).font("Helvetica-Bold").fontSize(9);
    doc.text("EBOOK", 0, 25, {
      width: W, align: "center",
      characterSpacing: 3, lineBreak: false
    });

    // Titre principal
    const titleText = clean(C.title);
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(30);
    const titleH = doc.heightOfString(titleText, { width: TW, align: "center" });
    doc.text(titleText, M, 55, { width: TW, align: "center" });

    let cy = 55 + titleH + 20;

    // Ligne décorative orange centrée
    doc.moveTo(cx - 50, cy).lineTo(cx + 50, cy)
      .lineWidth(2.5).strokeColor(ORANGE).stroke();
    cy += 18;

    // Sous-titre
    if (C.subtitle) {
      const sub = clean(C.subtitle);
      doc.fillColor(GRAY).font("Helvetica").fontSize(13);
      const subH = doc.heightOfString(sub, { width: TW, align: "center" });
      doc.text(sub, M, cy, { width: TW, align: "center" });
      cy += subH + 14;
    }

    // Tagline italique
    if (C.tagline) {
      const tag = '"' + clean(C.tagline) + '"';
      doc.fillColor(LGRAY).font("Helvetica-Oblique").fontSize(11);
      const tagH = doc.heightOfString(tag, { width: TW, align: "center" });
      doc.text(tag, M, cy, { width: TW, align: "center" });
      cy += tagH + 18;
    }

    // Séparateur léger
    doc.moveTo(cx - 20, cy).lineTo(cx + 20, cy)
      .lineWidth(0.8).strokeColor(BORDER).stroke();
    cy += 20;

    // Infos
    doc.fillColor(LGRAY).font("Helvetica").fontSize(10);
    doc.text(
      "7 parties  -  Exemples en FCFA  -  Contexte africain",
      0, cy, { width: W, align: "center", lineBreak: false }
    );
    cy += 22;

    // Prix
    doc.fillColor(GRAY).font("Helvetica").fontSize(10);
    doc.text("Prix :", 0, cy, { width: W, align: "center", lineBreak: false });
    cy += 18;

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(22);
    doc.text(
      clean(C.price_suggested || (pn.toLocaleString("fr-FR") + " FCFA")),
      0, cy, { width: W, align: "center", lineBreak: false }
    );

    // Auteur en bas de couverture — texte simple, pas de rect
    doc.fillColor(LGRAY).font("Helvetica").fontSize(9);
    doc.text("Par " + author, 0, H - 60, { width: W, align: "center", lineBreak: false });

    // Ligne fine + marque
    doc.moveTo(M, H - 46).lineTo(W - M, H - 46)
      .lineWidth(0.5).strokeColor(BORDER).stroke();

    doc.fillColor(ORANGE).font("Helvetica-Bold").fontSize(11);
    doc.text("PDF Cash IA", 0, H - 38, { width: W, align: "center", lineBreak: false });

    doc.fillColor(LGRAY).font("Helvetica").fontSize(8);
    doc.text("pdfcash-ia.vercel.app", 0, H - 24, { width: W, align: "center", lineBreak: false });

    // ════════════════════════════════════════
    // PAGE 2 — TABLE DES MATIÈRES
    // ════════════════════════════════════════
    newPage("TABLE DES MATIERES");

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(20);
    doc.text("Table des Matieres", M, y);
    y += 26;

    doc.moveTo(M, y).lineTo(M + 30, y).lineWidth(3).strokeColor(ORANGE).stroke();
    y += 16;

    // Parties fixes du nouveau flow
    const parties = [
      "Introduction",
      "Chapitre 1 : Comprendre le probleme",
      "Chapitre 2 : Les erreurs courantes",
      "Chapitre 3 : La solution etape par etape",
      "Chapitre 4 : Plan d'action concret",
      "Conclusion motivante"
    ];

    // On utilise les titres générés si disponibles, sinon les parties fixes
    const tocItems = (C.table_of_contents && C.table_of_contents.length >= 6)
      ? C.table_of_contents.slice(0, 6)
      : parties;

    tocItems.forEach((item, i) => {
      ensureSpace(22, "TABLE DES MATIERES");

      doc.fillColor(ORANGE).font("Helvetica-Bold").fontSize(11);
      doc.text(String(i + 1).padStart(2, "0"), M, y, { lineBreak: false, width: 24 });

      doc.fillColor(DARK).font("Helvetica").fontSize(11);
      doc.text(clean(item), M + 36, y, { width: TW - 46, lineBreak: false });

      doc.moveTo(M + 36, y + 15).lineTo(W - M, y + 15)
        .lineWidth(0.4).strokeColor(BORDER).stroke();

      y += 20;
    });

    // Description
    if (C.description) {
      y += 16;
      ensureSpace(60, "TABLE DES MATIERES");
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(BORDER).stroke();
      y += 14;
      doc.fillColor(GRAY).font("Helvetica-Oblique").fontSize(11);
      const dh = doc.heightOfString(clean(C.description), { width: TW, lineGap: 3 });
      doc.text(clean(C.description), M, y, { width: TW, lineGap: 3 });
      y += dh + 10;
    }

    // ════════════════════════════════════════
    // HELPER — écrire un bloc de texte riche
    // ════════════════════════════════════════
    function writeContent(text, section) {
      const paras = clean(text).split(/\n+/).filter(p => p.trim().length > 2);

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
          ensureSpace(hh + 50, section);
          y += 8;
          doc.fillColor(ORANGE).font("Helvetica-Bold").fontSize(12);
          doc.text(headText, M, y, { width: TW });
          y += hh + 6;

        } else {
          doc.font("Helvetica").fontSize(11);
          const ph = doc.heightOfString(trimmed, { width: TW, lineGap: 3 });
          ensureSpace(ph + 6, section);
          doc.fillColor(DARK).font("Helvetica").fontSize(11);
          doc.text(trimmed, M, y, { width: TW, align: "justify", lineGap: 3 });
          y += ph + 12;
        }
      });
    }

    // ════════════════════════════════════════
    // HELPER — titre de section
    // ════════════════════════════════════════
    function sectionTitle(num, title, section) {
      doc.font("Helvetica-Bold").fontSize(17);
      const th = doc.heightOfString(title, { width: TW });
      ensureSpace(th + 50, section);

      doc.fillColor(LGRAY).font("Helvetica-Bold").fontSize(8);
      doc.text("PARTIE " + String(num).padStart(2, "0"), M, y, { lineBreak: false });
      y += 14;

      doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(17);
      doc.text(title, M, y, { width: TW });
      y += th + 6;

      doc.moveTo(M, y).lineTo(M + 55, y).lineWidth(2).strokeColor(ORANGE).stroke();
      y += 14;
    }

    // ════════════════════════════════════════
    // PARTIES 1 à 6 — CONTENU EBOOK
    // ════════════════════════════════════════

    // Les chapitres générés (on en prend 6 max)
    const chaps = (C.chapters || []).slice(0, 6);

    // Partie 1 — Introduction
    newPage("INTRODUCTION");
    sectionTitle(1, chaps[0] ? clean(chaps[0].title) : "Introduction", "INTRODUCTION");
    if (chaps[0]) writeContent(chaps[0].content || "", "INTRODUCTION");

    // Partie 2 — Comprendre le problème
    newPage("COMPRENDRE LE PROBLEME");
    sectionTitle(2, chaps[1] ? clean(chaps[1].title) : "Comprendre le probleme", "COMPRENDRE LE PROBLEME");
    if (chaps[1]) writeContent(chaps[1].content || "", "COMPRENDRE LE PROBLEME");

    // Partie 3 — Erreurs courantes
    newPage("ERREURS COURANTES");
    sectionTitle(3, chaps[2] ? clean(chaps[2].title) : "Les erreurs courantes", "ERREURS COURANTES");
    if (chaps[2]) writeContent(chaps[2].content || "", "ERREURS COURANTES");

    // Partie 4 — Solution étape par étape
    newPage("LA SOLUTION");
    sectionTitle(4, chaps[3] ? clean(chaps[3].title) : "La solution etape par etape", "LA SOLUTION");
    if (chaps[3]) writeContent(chaps[3].content || "", "LA SOLUTION");

    // Partie 5 — Plan d'action
    newPage("PLAN D'ACTION");
    sectionTitle(5, chaps[4] ? clean(chaps[4].title) : "Plan d'action concret", "PLAN D'ACTION");
    if (chaps[4]) writeContent(chaps[4].content || "", "PLAN D'ACTION");

    // Partie 6 — Conclusion
    newPage("CONCLUSION");
    sectionTitle(6, chaps[5] ? clean(chaps[5].title) : "Conclusion motivante", "CONCLUSION");
    if (chaps[5]) writeContent(chaps[5].content || "", "CONCLUSION");

    // ════════════════════════════════════════
    // PAGE FINALE — POINTS CLÉS + MARQUE
    // ════════════════════════════════════════
    if (y > BOTTOM * 0.55) {
      newPage("POINTS CLES");
    } else {
      y += 24;
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(BORDER).stroke();
      y += 18;
    }

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(18);
    doc.text("Points Cles a Retenir", M, y);
    y += 24;
    doc.moveTo(M, y).lineTo(M + 30, y).lineWidth(3).strokeColor(ORANGE).stroke();
    y += 14;

    (C.key_takeaways || []).forEach(k => {
      const kText = clean(k);
      if (!kText) return;
      doc.font("Helvetica").fontSize(11);
      const kh = doc.heightOfString(kText, { width: TW - 20, lineGap: 2 });
      ensureSpace(kh + 16, "POINTS CLES");

      // Ligne verticale accent gauche
      doc.moveTo(M, y).lineTo(M, y + kh + 4)
        .lineWidth(3).strokeColor(ORANGE).stroke();

      doc.fillColor(DARK).font("Helvetica").fontSize(11);
      doc.text(kText, M + 14, y, { width: TW - 20, lineGap: 2 });
      y += kh + 16;
    });

    // CTA final
    ensureSpace(80, "POINTS CLES");
    y += 20;

    const ctaText = clean(C.call_to_action || "Passe a l'action maintenant !");
    doc.font("Helvetica-Bold").fontSize(13);
    const ctaH = doc.heightOfString(ctaText, { width: TW - 30, align: "center" });
    const ctaBox = ctaH + 40;

    doc.rect(M, y, TW, ctaBox).lineWidth(2).strokeColor(ORANGE).stroke();
    doc.moveTo(M, y).lineTo(M + TW, y).lineWidth(4).strokeColor(ORANGE).stroke();

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(13);
    doc.text(ctaText, M + 15, y + 14, { width: TW - 30, align: "center" });

    doc.fillColor(ORANGE).font("Helvetica-Bold").fontSize(14);
    doc.text(
      clean(C.price_suggested || ""),
      M, y + ctaBox - 20,
      { align: "center", width: TW, lineBreak: false }
    );
    y += ctaBox + 16;

    // Marque finale
    ensureSpace(40, "POINTS CLES");
    y += 16;
    doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(BORDER).stroke();
    y += 12;

    doc.fillColor(ORANGE).font("Helvetica-Bold").fontSize(10);
    doc.text("PDF Cash IA  -  pdfcash-ia.vercel.app", 0, y, {
      width: W, align: "center", lineBreak: false
    });

    // ── FINALISATION ──
    doc.end();
    await new Promise(resolve => doc.on("end", resolve));

    const buf = Buffer.concat(chunks);
    const fname = ((C.title || "document")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/ +/g, "_")
      .slice(0, 45)) + "_v2.pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch (err) {
    console.error("PDF2 error:", err);
    return res.status(500).json({ error: "Erreur PDF2: " + err.message });
  }
}
