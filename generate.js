export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { topic, docType, docLabel } = req.body || {};
  if (!topic) return res.status(400).json({ error: "Sujet manquant" });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({
    error: "Clé API manquante. Ajoute GROQ_API_KEY dans Vercel > Settings > Environment Variables"
  });

  // Prompt adapté selon le type de document
  const typeInstructions = {
    ebook: "un ebook complet avec conseils pratiques, exemples concrets, stratégies détaillées et cas réels en FCFA",
    guide: "un guide pratique étape par étape avec actions concrètes numérotées, outils spécifiques et résultats attendus",
    business_plan: "un business plan complet avec étude de marché, plan financier chiffré en FCFA, stratégie marketing et projection sur 12 mois",
    formation: "une mini-formation structurée avec leçons détaillées, exercices pratiques, ressources et plan d'action personnel",
    tiktok: "un pack de 6 scripts TikTok complets et viraux avec accroche, développement, appel à l'action et hashtags pour chaque script",
    cv: "un guide CV complet avec modèles de phrases, exemples de réalisations chiffrées, conseils entretien et lettres de motivation"
  };

  const typeInstruction = typeInstructions[docType] || typeInstructions.ebook;

  const systemPrompt = `Tu es un expert rédacteur de contenus digitaux vendables en Afrique francophone.

RÈGLE ABSOLUE N°1 : Chaque chapitre doit contenir MINIMUM 350 mots de contenu RÉEL et DÉTAILLÉ.
RÈGLE ABSOLUE N°2 : JAMAIS de phrases vagues comme "nous verrons comment", "il est important de", "dans ce chapitre nous allons". TOUT doit être directement actionnable et concret.
RÈGLE ABSOLUE N°3 : Chaque conseil doit inclure un exemple réel avec des chiffres en FCFA et des noms de plateformes/outils africains réels.
RÈGLE ABSOLUE N°4 : Réponds UNIQUEMENT avec du JSON valide. Zéro texte avant ou après. Zéro markdown. Zéro backtick.

FORMAT JSON EXACT À RESPECTER :
{
  "title": "Titre accrocheur ultra-vendeur (8-12 mots maximum)",
  "subtitle": "Sous-titre qui promet un résultat précis et mesurable",
  "author": "Expert [domaine spécifique]",
  "tagline": "Phrase choc 8 mots maximum avec résultat concret",
  "description": "2 phrases qui décrivent exactement ce que le lecteur va obtenir avec des résultats chiffrés",
  "price_suggested": "X 000 FCFA",
  "table_of_contents": [
    "Chapitre 1 : [Titre précis et prometteur]",
    "Chapitre 2 : [Titre précis et prometteur]",
    "Chapitre 3 : [Titre précis et prometteur]",
    "Chapitre 4 : [Titre précis et prometteur]",
    "Chapitre 5 : [Titre précis et prometteur]",
    "Chapitre 6 : [Titre précis et prometteur]"
  ],
  "chapters": [
    {
      "title": "Titre du chapitre 1",
      "content": "CONTENU COMPLET ET DÉTAILLÉ ICI. Minimum 350 mots réels. Commence directement par le contenu sans introduction générique. Inclus : définitions claires, étapes numérotées avec détails, exemples concrets avec montants en FCFA, noms d'outils et plateformes réels disponibles en Afrique, erreurs courantes à éviter, conseils exclusifs. Chaque paragraphe apporte une valeur concrète et actionnable."
    },
    {
      "title": "Titre du chapitre 2",
      "content": "CONTENU COMPLET ET DÉTAILLÉ. Minimum 350 mots réels. Même format que chapitre 1."
    },
    {
      "title": "Titre du chapitre 3",
      "content": "CONTENU COMPLET ET DÉTAILLÉ. Minimum 350 mots réels."
    },
    {
      "title": "Titre du chapitre 4",
      "content": "CONTENU COMPLET ET DÉTAILLÉ. Minimum 350 mots réels."
    },
    {
      "title": "Titre du chapitre 5",
      "content": "CONTENU COMPLET ET DÉTAILLÉ. Minimum 350 mots réels."
    },
    {
      "title": "Titre du chapitre 6",
      "content": "CONTENU COMPLET ET DÉTAILLÉ. Minimum 350 mots réels."
    }
  ],
  "key_takeaways": [
    "Action concrète et spécifique que le lecteur peut faire aujourd'hui",
    "Conseil exclusif avec chiffre ou outil précis",
    "Erreur à éviter absolument avec explication",
    "Stratégie avancée avec résultat attendu en FCFA ou en temps",
    "Prochaine étape claire et motivante"
  ],
  "call_to_action": "Message final qui pousse à passer à l'action MAINTENANT avec urgence réelle",
  "sales_message": "Message WhatsApp de vente percutant : accroche + valeur + prix + urgence. 3 phrases max.",
  "viral_hook": "Accroche TikTok choc en 1 phrase qui donne envie de cliquer immédiatement"
}`;

  const userPrompt = `Crée ${typeInstruction} sur le sujet : "${topic}".

EXIGENCES STRICTES POUR CHAQUE CHAPITRE :
1. Commence DIRECTEMENT par du contenu utile, pas d'introduction générique
2. Inclus AU MOINS 3 exemples concrets avec des montants réels en FCFA
3. Donne des noms d'outils/applications/plateformes réels (WhatsApp, Wave, Orange Money, MTN MoMo, Jumia, etc.)
4. Inclus des étapes numérotées avec détails sur COMMENT faire, pas juste QUOI faire
5. Minimum 350 mots de contenu DENSE et UTILE par chapitre
6. Contexte 100% africain francophone (Bénin, Côte d'Ivoire, Sénégal, Cameroun, Togo)

INTERDIT ABSOLUMENT :
- "Dans ce chapitre nous allons voir..."
- "Il est important de noter que..."
- "Comme nous l'avons vu précédemment..."
- Toute phrase qui promet sans livrer immédiatement
- Contenu vague sans exemples chiffrés`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 8000,  // Augmenté pour contenu complet
        temperature: 0.65, // Légèrement réduit pour plus de cohérence
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", JSON.stringify(data));
      const msg = data.error?.message || `Erreur Groq (${response.status})`;
      return res.status(500).json({ error: msg });
    }

    const raw = data.choices?.[0]?.message?.content || "";
    if (!raw) return res.status(500).json({ error: "Réponse vide de Groq" });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return res.status(500).json({ error: "JSON invalide dans la réponse" });
      parsed = JSON.parse(match[0]);
    }

    // Validation : vérifier que les chapitres ont du contenu réel
    const chapters = parsed.chapters || [];
    const emptyChapters = chapters.filter(ch => (ch.content || "").length < 200);
    if (emptyChapters.length > 2) {
      return res.status(500).json({ 
        error: "Contenu insuffisant généré. Réessaie avec un sujet plus précis." 
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Erreur: " + err.message });
  }
}
