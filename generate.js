export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { topic, docType, docLabel } = req.body;
  if (!topic || !docType) return res.status(400).json({ error: "Paramètres manquants" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "Clé API manquante" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 4000,
        system: `Tu es un expert créateur de contenu digital vendable en Afrique francophone.
Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks ni texte avant/après.
JSON requis exactement:
{
  "title": "Titre accrocheur vendeur",
  "subtitle": "Sous-titre qui donne envie d'acheter",
  "author": "Expert [domaine]",
  "tagline": "Phrase choc max 10 mots",
  "description": "Description commerciale 2 phrases",
  "price_suggested": "X 000 FCFA",
  "table_of_contents": ["Chapitre 1: ...", "Chapitre 2: ...", "Chapitre 3: ...", "Chapitre 4: ...", "Chapitre 5: ...", "Chapitre 6: ..."],
  "chapters": [
    {"title": "Titre chapitre 1", "content": "Contenu ultra-pratique 400+ mots, exemples en FCFA, conseils actionnables pour l'Afrique"},
    {"title": "Titre chapitre 2", "content": "..."},
    {"title": "Titre chapitre 3", "content": "..."},
    {"title": "Titre chapitre 4", "content": "..."},
    {"title": "Titre chapitre 5", "content": "..."},
    {"title": "Titre chapitre 6", "content": "..."}
  ],
  "key_takeaways": ["Point clé 1", "Point clé 2", "Point clé 3", "Point clé 4", "Point clé 5"],
  "call_to_action": "Message final motivant pour passer à l'action",
  "sales_message": "Message WhatsApp prêt à envoyer avec prix et urgence (3 phrases max)",
  "viral_hook": "Accroche TikTok 1 phrase choc qui donne envie de cliquer"
}`,
        messages: [
          {
            role: "user",
            content: `Crée un ${docLabel} complet et vendable sur le sujet: "${topic}". 
Contexte africain francophone, exemples concrets avec montants en FCFA, 
conseils ultra-pratiques qu'on ne trouve pas gratuitement.`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "Erreur API" });
    }

    const raw = data.content?.map((b) => b.text || "").join("") || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "Format de réponse invalide" });

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur: " + err.message });
  }
}
