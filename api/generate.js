export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { topic, docType, docLabel } = req.body || {};
  if (!topic) return res.status(400).json({ error: "Sujet manquant" });

  const GROK_API_KEY = process.env.GROK_API_KEY;
  if (!GROK_API_KEY) return res.status(500).json({ error: "Clé API Grok manquante. Ajoute GROK_API_KEY dans Vercel > Settings > Environment Variables" });

  const systemPrompt = `Tu es un expert créateur de contenu digital vendable en Afrique francophone.
Réponds UNIQUEMENT avec du JSON valide. Aucun texte avant ou après. Aucun markdown. Aucun backtick.
JSON requis:
{
  "title": "Titre accrocheur et vendeur",
  "subtitle": "Sous-titre qui donne envie d'acheter",
  "author": "Expert [domaine]",
  "tagline": "Phrase choc maximum 10 mots",
  "description": "Description commerciale en 2 phrases",
  "price_suggested": "X 000 FCFA",
  "table_of_contents": [
    "Chapitre 1: ...",
    "Chapitre 2: ...",
    "Chapitre 3: ...",
    "Chapitre 4: ...",
    "Chapitre 5: ...",
    "Chapitre 6: ..."
  ],
  "chapters": [
    {"title": "Titre chapitre 1", "content": "Contenu ultra-pratique minimum 400 mots avec exemples en FCFA et conseils actionnables pour le contexte africain"},
    {"title": "Titre chapitre 2", "content": "...400+ mots..."},
    {"title": "Titre chapitre 3", "content": "...400+ mots..."},
    {"title": "Titre chapitre 4", "content": "...400+ mots..."},
    {"title": "Titre chapitre 5", "content": "...400+ mots..."},
    {"title": "Titre chapitre 6", "content": "...400+ mots..."}
  ],
  "key_takeaways": ["Point clé 1", "Point clé 2", "Point clé 3", "Point clé 4", "Point clé 5"],
  "call_to_action": "Message final motivant pour passer à l'action",
  "sales_message": "Message WhatsApp prêt à copier-coller avec prix et urgence en 3 phrases maximum",
  "viral_hook": "Accroche TikTok 1 phrase choc qui donne envie de cliquer"
}`;

  const userMessage = `Crée un ${docLabel || docType} complet et vendable sur ce sujet: "${topic}".
Contexte africain francophone. Exemples concrets avec montants en FCFA.
Conseils ultra-pratiques qu'on ne trouve pas gratuitement ailleurs.`;

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-3",
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Grok API error:", data);
      return res.status(500).json({ 
        error: data.error?.message || `Erreur API Grok (${response.status})` 
      });
    }

    const raw = data.choices?.[0]?.message?.content || "";
    if (!raw) return res.status(500).json({ error: "Réponse vide de Grok" });

    // Extract JSON from response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "Format JSON invalide dans la réponse" });

    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch (e) {
      return res.status(500).json({ error: "Impossible de parser le JSON: " + e.message });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Erreur serveur: " + err.message });
  }
}
