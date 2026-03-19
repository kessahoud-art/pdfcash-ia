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
  const col = color || { ac: "#2C3E50" };
  function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#2C3E50");
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [44,62,80];
  }
  function rgb(arr) { return `rgb(${arr[0]},${arr[1]},${arr[2]})`; }
  function lgt(arr, a) { return arr.map(v => Math.min(v + a, 255)); }

  const AC   = hexRgb(col.ac || col.c1 || "#2C3E50");
  const DARK  = [20, 20, 35];
  const GRAY  = [100, 105, 130];
  const LGRAY = [170, 175, 195];
  const BORDER= [220, 225, 235];
  const WHITE = [255, 255, 255];

  // ── DIMENSIONS ──
  const W  = 595.28;
  const H  = 841.89;
  const ML = 55;   // marge gauche
  const MR = 55;   // marge droite
  const TW = W - ML - MR;
  const BOTTOM = H - 45;

  // ── DONNÉES CANDIDAT ──
  // On extrait les infos depuis le contenu généré
  const chapters = C.chapters || [];
  const author = clean(authorName || C.author || 'Candidat');
  const title  = clean(C.title || 'Curriculum Vitae');
  const subtitle = clean(C.subtitle || '');

  try {
    const doc = new PDFDocument({
      size: "A4", margin: 0, autoFirstPage: false,
      info: { Title: title, Author: author, Creator: "PDF Cash IA" }
    });

    const chunks = [];
    doc.on("data", c => chunks.push(c));

    let y = 0, pageNum = 0;

    // ── FOOTER ──
    function addFooter(n) {
      doc.moveTo(ML, H - 18).lineTo(W - MR, H - 18)
        .lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
      doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(7);
      doc.text("PDF Cash IA  -  pdfcash-ia.vercel.app", 0, H - 13,
        { align: "center", width: W, lineBreak: false });
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(7);
      doc.text(String(n), W - MR, H - 13, { lineBreak: false });
    }

    function newPage() {
      doc.addPage();
      pageNum++;
      addFooter(pageNum);
      y = 30;
    }

    function ensureSpace(needed) {
      if (y + needed > BOTTOM) newPage();
    }

    // ════════════════════════════════════════
    // PAGE 1 — CV
    // ════════════════════════════════════════
    doc.addPage();
    pageNum++;
    addFooter(pageNum);

    // ── EN-TÊTE COLORÉ (bande fine, pas pleine page) ──
    doc.rect(0, 0, W, 5).fill(rgb(AC));

    // Bande en-tête légère
    doc.rect(0, 5, W, 110).fill(rgb(lgt(AC, 200)));

    // Nom du candidat
    doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(26);
    doc.text(author, ML, 20, { lineBreak: false });

    // Titre du poste (depuis le titre généré)
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(13);
    doc.text(title.replace(/CV\s*(Pro)?\s*(pour)?\s*/i, '').trim() || subtitle, ML, 52, {
      width: TW - 80, lineBreak: false
    });

    // Contacts (extraits du subtitle ou generiques)
    doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(10);
    doc.text("Afrique francophone  |  WhatsApp disponible  |  professionnel@email.com",
      ML, 72, { width: TW, lineBreak: false });

    // Ligne séparatrice accent
    doc.moveTo(ML, 100).lineTo(W - MR, 100)
      .lineWidth(2).strokeColor(rgb(AC)).stroke();

    y = 120;

    // ── HELPER : titre de section ──
    function sectionTitle(text) {
      ensureSpace(40);
      y += 6;
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(10);
      doc.text(text.toUpperCase(), ML, y, { lineBreak: false, characterSpacing: 1.5 });
      y += 14;
      doc.moveTo(ML, y).lineTo(W - MR, y)
        .lineWidth(1.5).strokeColor(rgb(AC)).stroke();
      y += 10;
    }

    // ── HELPER : paragraphe ──
    function writePara(text, indent) {
      const x = ML + (indent || 0);
      const w = TW - (indent || 0);
      doc.font("Helvetica").fontSize(10);
      const ph = doc.heightOfString(clean(text), { width: w, lineGap: 2 });
      ensureSpace(ph + 4);
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(clean(text), x, y, { width: w, align: "justify", lineGap: 2 });
      y += ph + 8;
    }

    // ── HELPER : item expérience ──
    function expItem(poste, entreprise, periode, description) {
      ensureSpace(60);

      // Poste
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(11);
      doc.text(clean(poste), ML, y, { lineBreak: false });

      // Période à droite
      doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(9);
      doc.text(clean(periode), W - MR - 100, y, { width: 100, align: "right", lineBreak: false });
      y += 15;

      // Entreprise
      doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(10);
      doc.text(clean(entreprise), ML, y, { lineBreak: false });
      y += 14;

      // Description
      if (description) {
        const lines = clean(description).split(/[.\n]+/).filter(l => l.trim().length > 5).slice(0, 4);
        lines.forEach(line => {
          const txt = line.trim();
          if (!txt) return;
          doc.font("Helvetica").fontSize(9);
          const lh = doc.heightOfString(txt, { width: TW - 14, lineGap: 1 });
          ensureSpace(lh + 4);
          // Puce
          doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(10);
          doc.text("-", ML, y, { lineBreak: false });
          doc.fillColor(rgb(GRAY)).font("Helvetica").fontSize(9);
          doc.text(txt, ML + 12, y, { width: TW - 14, lineGap: 1 });
          y += lh + 5;
        });
      }
      y += 8;
    }

    // ── HELPER : compétence avec barre ──
    function skillBar(name, level) {
      // level : 0 à 100
      ensureSpace(22);
      const barW = TW / 2 - 20;
      doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(10);
      doc.text(clean(name), ML, y, { lineBreak: false });
      // Fond barre
      doc.rect(ML + 120, y + 2, barW, 8)
        .fillColor(rgb(BORDER)).fill();
      // Barre remplie
      doc.rect(ML + 120, y + 2, barW * (level / 100), 8)
        .fillColor(rgb(AC)).fill();
      y += 20;
    }

    // ── HELPER : formation item ──
    function formationItem(diplome, ecole, annee) {
      ensureSpace(36);
      doc.fillColor(rgb(DARK)).font("Helvetica-Bold").fontSize(10);
      doc.text(clean(diplome), ML, y, { lineBreak: false });
      doc.fillColor(rgb(LGRAY)).font("Helvetica").fontSize(9);
      doc.text(clean(annee), W - MR - 60, y, { width: 60, align: "right", lineBreak: false });
      y += 14;
      doc.fillColor(rgb(AC)).font("Helvetica").fontSize(9);
      doc.text(clean(ecole), ML, y, { lineBreak: false });
      y += 18;
    }

    // ════════════════════════════════════════
    // RÉSUMÉ PROFESSIONNEL
    // ════════════════════════════════════════
    sectionTitle("Résumé Professionnel");
    const resumeText = clean(C.description || (chapters[0] && chapters[0].content
      ? chapters[0].content.slice(0, 400) : subtitle));
    writePara(resumeText);

    // ════════════════════════════════════════
    // EXPÉRIENCES PROFESSIONNELLES
    // ════════════════════════════════════════
    sectionTitle("Expériences Professionnelles");

    // On extrait les expériences depuis les chapitres
    const expChapters = chapters.slice(0, 4);
    expChapters.forEach((ch, i) => {
      const chTitle = clean(ch.title || '');
      const content = clean(ch.content || '');

      // Detecter poste / entreprise depuis le titre du chapitre
      const parts = chTitle.split(/[-–|:]/);
      const poste = parts[0] ? parts[0].trim() : chTitle;
      const entreprise = parts[1] ? parts[1].trim() : 'Entreprise Afrique';
      const periode = parts[2] ? parts[2].trim() : (2024 - i) + ' - ' + (i === 0 ? 'Présent' : (2023 - i));

      expItem(poste, entreprise, periode, content);
    });

    // ════════════════════════════════════════
    // FORMATION
    // ════════════════════════════════════════
    sectionTitle("Formation");

    // Extraire formation depuis table_of_contents ou générer
    const toc = C.table_of_contents || [];
    if (toc.length >= 5) {
      formationItem(
        clean(toc[4] || "Licence en Gestion"),
        "Université d'Abidjan / Dakar / Cotonou",
        "2018"
      );
    } else {
      formationItem(
        title.replace(/CV\s*(Pro)?\s*(pour)?\s*/i, '').trim() || "Licence professionnelle",
        "Université Afrique francophone",
        "2018"
      );
    }
    formationItem("Baccalauréat série D / C", "Lycée Excellence", "2015");

    // ════════════════════════════════════════
    // COMPÉTENCES
    // ════════════════════════════════════════
    sectionTitle("Compétences");

    // Extraire compétences depuis key_takeaways
    const skills = (C.key_takeaways || []).slice(0, 6);
    if (skills.length > 0) {
      // 2 colonnes
      const half = Math.ceil(skills.length / 2);
      const leftSkills = skills.slice(0, half);
      const rightSkills = skills.slice(half);
      const savedY = y;

      // Colonne gauche
      leftSkills.forEach((sk, i) => {
        const name = clean(sk).slice(0, 30);
        const level = 95 - i * 10;
        ensureSpace(22);
        doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(9);
        doc.text(name, ML, y, { width: TW/2 - 10, lineBreak: false });
        const barW = 80;
        doc.rect(ML + 110, y + 2, barW, 7).fillColor(rgb(BORDER)).fill();
        doc.rect(ML + 110, y + 2, barW * (level/100), 7).fillColor(rgb(AC)).fill();
        y += 20;
      });

      // Colonne droite (repart de savedY)
      const rightX = W / 2 + 10;
      let ry = savedY;
      rightSkills.forEach((sk, i) => {
        const name = clean(sk).slice(0, 30);
        const level = 90 - i * 10;
        doc.fillColor(rgb(DARK)).font("Helvetica").fontSize(9);
        doc.text(name, rightX, ry, { width: TW/2 - 10, lineBreak: false });
        const barW = 80;
        doc.rect(rightX + 110, ry + 2, barW, 7).fillColor(rgb(BORDER)).fill();
        doc.rect(rightX + 110, ry + 2, barW * (level/100), 7).fillColor(rgb(AC)).fill();
        ry += 20;
      });

      y = Math.max(y, ry);
    } else {
      skillBar("Communication", 90);
      skillBar("Organisation", 85);
      skillBar("Travail en equipe", 95);
      skillBar("Informatique", 80);
    }

    // ════════════════════════════════════════
    // LANGUES
    // ════════════════════════════════════════
    ensureSpace(60);
    sectionTitle("Langues");

    [["Français", 100], ["Anglais", 70], ["Langue locale", 100]].forEach(function(l) {
      skillBar(l[0], l[1]);
    });

    // ════════════════════════════════════════
    // PIED DE PAGE CV
    // ════════════════════════════════════════
    ensureSpace(30);
    y += 10;
    doc.moveTo(ML, y).lineTo(W - MR, y)
      .lineWidth(0.5).strokeColor(rgb(BORDER)).stroke();
    y += 10;
    doc.fillColor(rgb(AC)).font("Helvetica-Bold").fontSize(9);
    doc.text("Disponible immédiatement — Références disponibles sur demande",
      0, y, { width: W, align: "center", lineBreak: false });

    // ── FINALISATION ──
    doc.end();
    await new Promise(resolve => doc.on("end", resolve));

    const buf = Buffer.concat(chunks);
    const fname = (author.replace(/[^a-zA-Z0-9 ]/g, '').replace(/ +/g, '_').slice(0, 30)) + '_CV.pdf';

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch (err) {
    console.error("PDF-CV error:", err);
    return res.status(500).json({ error: "Erreur PDF CV: " + err.message });
  }
}
