// ══════════════════════════════════════════════════════
// api/pdf.js — PDF Cash IA
// Route toutes les demandes PDF vers l'API Render.com
// (ReportLab Python — qualité professionnelle)
// ══════════════════════════════════════════════════════

// URL de ton API Render — à mettre dans Vercel ENV VARS
const RENDER_URL = process.env.RENDER_PDF_URL || "https://pdfcash-render.onrender.com";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { content, docType, docLabel, color, authorName } = req.body || {};
  if (!content || !content.title) {
    return res.status(400).json({ error: "Contenu manquant" });
  }

  try {
    // Appel vers l'API Python Render.com
    const renderRes = await fetch(`${RENDER_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        docType:    docType || "ebook",
        docLabel:   docLabel || "Ebook",
        color:      color || { c1: "#7c3aed", c2: "#0d1030", ac: "#7c3aed" },
        authorName: authorName || ""
      }),
      // Timeout 30 secondes (Render free peut être lent au démarrage)
      signal: AbortSignal.timeout(30000)
    });

    if (!renderRes.ok) {
      // Essayer de lire l'erreur
      const errData = await renderRes.json().catch(() => ({ detail: "Erreur Render" }));
      const errMsg = errData.detail || errData.error || `Erreur Render ${renderRes.status}`;
      console.error("Render API error:", errMsg);
      return res.status(500).json({ error: errMsg });
    }

    // Récupérer le PDF binaire
    const pdfBuffer = await renderRes.arrayBuffer();
    const buf = Buffer.from(pdfBuffer);

    // Nom du fichier
    const safeTitle = (content.title || "document")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/ +/g, "_")
      .slice(0, 40);
    const fname = `${safeTitle}_${docType || "ebook"}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);

  } catch (err) {
    console.error("PDF handler error:", err);

    // Si Render est down ou timeout → message clair
    if (err.name === "AbortError" || err.message?.includes("timeout")) {
      return res.status(503).json({
        error: "Le serveur PDF est en cours de démarrage. Réessaie dans 30 secondes."
      });
    }

    return res.status(500).json({ error: "Erreur PDF: " + err.message });
  }
}
