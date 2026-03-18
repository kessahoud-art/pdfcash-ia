export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: "Clé API manquante. Ajoute GROQ_API_KEY dans Vercel > Settings > Environment Variables" });

  const { action, domain, topic, docType, docLabel, target, level } = req.body || {};

  // ══════════════════════════════════════════
  // ACTION 1 — GÉNÉRER LES IDÉES (Étape 1)
  // ══════════════════════════════════════════
  if (action === "ideas") {
    if (!domain) return res.status(400).json({ error: "Domaine manquant" });

    const systemPrompt = `Tu es un expert en marketing digital et création de produits numériques viraux pour l'Afrique francophone.
Ta mission : générer des idées d'ebooks et guides qui peuvent se vendre facilement via Facebook Ads et WhatsApp.
Réponds UNIQUEMENT en JSON valide. Zéro texte avant ou après. Zéro markdown. Zéro backtick.

JSON requis exactement :
{
  "top_viral": [
    {
      "titre": "Titre ultra accrocheur et vendeur",
      "resultat_promis": "Ce que le lecteur obtient concrètement et rapidement",
      "cible": "Qui exactement va acheter ce produit",
      "angle_viral": "Ce qui rend cette idée irrésistible et partageable",
      "type_recommande": "ebook | guide | business_plan | formation | tiktok | cv",
      "raison_type": "Pourquoi ce type est le meilleur format pour cette idée"
    }
  ],
  "cash_rapide": [
    {
      "titre": "...",
      "resultat_promis": "...",
      "cible": "...",
      "angle_viral": "...",
      "type_recommande": "...",
      "raison_type": "..."
    }
  ],
  "ocean_bleu": [
    {
      "titre": "...",
      "resultat_promis": "...",
      "cible": "...",
      "angle_viral": "...",
      "type_recommande": "...",
      "raison_type": "..."
    }
  ]
}

Règles :
- top_viral : 7 idées avec fort potentiel viral prouvé sur Facebook Ads
- cash_rapide : 5 idées simples à vendre rapidement sur WhatsApp
- ocean_bleu : 3 idées peu exploitées avec fort potentiel inexploité
- Chaque titre doit contenir une promesse de résultat mesurable
- Contexte 100% africain francophone avec montants en FCFA
- Problèmes urgents : argent, emploi, business, relations, santé, réseaux sociaux`;

    const userPrompt = `Génère des idées de produits numériques vendables dans le domaine : "${domain}"

Critères obligatoires :
- Problèmes urgents et réels vécus en Afrique francophone (Bénin, Côte d'Ivoire, Sénégal, Cameroun, Togo)
- Promesse claire avec résultat mesurable en FCFA ou en jours
- Adaptées au marché WhatsApp et Facebook Ads africain
- Titres avec chiffres ou résultats précis (ex: "500 000 FCFA en 30 jours", "10 clients en 7 jours")`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 3000,
          temperature: 0.8,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });
      const data = await response.json();
      if (!response.ok) return res.status(500).json({ error: data.error?.message || "Erreur Groq" });
      const raw = data.choices?.[0]?.message?.content || "";
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return res.status(500).json({ error: "JSON invalide" });
        parsed = JSON.parse(match[0]);
      }
      return res.status(200).json(parsed);
    } catch (err) {
      return res.status(500).json({ error: "Erreur: " + err.message });
    }
  }

  // ══════════════════════════════════════════
  // ACTION 2 — GÉNÉRER LE CONTENU (Étape 2)
  // ══════════════════════════════════════════
  if (action === "content") {
    if (!topic) return res.status(400).json({ error: "Sujet manquant" });

    const typeInstructions = {
      ebook: "un ebook complet avec conseils pratiques, exemples concrets et stratégies détaillées",
      guide: "un guide pratique étape par étape avec actions numérotées, outils spécifiques et résultats attendus",
      business_plan: "un business plan complet avec étude de marché, plan financier chiffré en FCFA, stratégie marketing et projection 12 mois",
      formation: "une mini-formation structurée avec leçons détaillées, exercices pratiques et plan d'action personnel",
      tiktok: "un pack de 6 scripts TikTok complets et viraux avec accroche, développement, appel à l'action et hashtags",
      cv: "un guide CV complet avec modèles de phrases, exemples de réalisations chiffrées et conseils entretien"
    };

    const levelInstructions = {
      debutant: "langage simple et accessible, explique chaque concept de base, pas de jargon technique, exemples très concrets du quotidien africain",
      intermediaire: "langage professionnel, suppose que le lecteur connaît les bases, va directement aux stratégies avancées",
      avance: "langage expert, stratégies avancées et peu connues, techniques exclusives, résultats maximaux"
    };

    const typeInstruction = typeInstructions[docType] || typeInstructions.ebook;
    const levelInstruction = levelInstructions[level] || levelInstructions.debutant;
    const targetInstruction = target ? `Public cible précis : ${target}` : "Public cible : adultes africains francophones cherchant à améliorer leur situation financière";

    const systemPrompt = `Tu es un expert rédacteur de contenus numériques vendables en Afrique francophone.

RÈGLES ABSOLUES :
1. Chaque chapitre doit contenir EXACTEMENT cette structure :
   - 1 introduction directe sans phrase générique (2-3 paragraphes concrets)
   - 3 à 5 étapes ou conseils détaillés avec HOW-TO précis
   - 2 exemples concrets minimum avec montants réels en FCFA
   - 1 erreur courante à éviter avec explication du pourquoi
   - 1 conseil bonus exclusif introuvable gratuitement
   
2. INTERDIT ABSOLUMENT dans le contenu :
   - "Dans ce chapitre nous allons voir..."
   - "Il est important de noter que..."
   - "Comme nous l'avons vu précédemment..."
   - "N'hésitez pas à..."
   - Toute phrase qui promet sans livrer immédiatement
   - Contenu vague sans chiffres ni exemples précis

3. OBLIGATOIRE dans chaque chapitre :
   - Noms d'outils africains réels : Wave, Orange Money, MTN MoMo, WhatsApp Business, Jumia, Jiji, Facebook Marketplace...
   - Montants en FCFA (pas en euros ni dollars)
   - Noms de villes africaines dans les exemples
   - Stratégies testées et prouvées sur le marché africain

4. Réponds UNIQUEMENT en JSON valide. Zéro texte avant ou après.

JSON requis :
{
  "title": "Titre ultra vendeur avec promesse de résultat précis",
  "subtitle": "Sous-titre qui précise le résultat et le public",
  "author": "Expert [domaine spécifique]",
  "tagline": "Phrase choc 8 mots max avec résultat concret",
  "description": "2 phrases qui décrivent exactement ce que le lecteur obtient avec résultats chiffrés",
  "price_suggested": "X 000 FCFA",
  "table_of_contents": [
    "Chapitre 1 : [Titre précis avec résultat]",
    "Chapitre 2 : [Titre précis avec résultat]",
    "Chapitre 3 : [Titre précis avec résultat]",
    "Chapitre 4 : [Titre précis avec résultat]",
    "Chapitre 5 : [Titre précis avec résultat]",
    "Chapitre 6 : [Titre précis avec résultat]"
  ],
  "chapters": [
    {
      "title": "Titre chapitre 1",
      "content": "Contenu complet structuré avec introduction directe, étapes détaillées, exemples FCFA, erreur à éviter, conseil bonus. Minimum 500 mots réels et denses."
    },
    {
      "title": "Titre chapitre 2",
      "content": "Même structure. Minimum 500 mots réels."
    },
    {
      "title": "Titre chapitre 3",
      "content": "Même structure. Minimum 500 mots réels."
    },
    {
      "title": "Titre chapitre 4",
      "content": "Même structure. Minimum 500 mots réels."
    },
    {
      "title": "Titre chapitre 5",
      "content": "Même structure. Minimum 500 mots réels."
    },
    {
      "title": "Titre chapitre 6",
      "content": "Même structure. Minimum 500 mots réels."
    }
  ],
  "key_takeaways": [
    "Action concrète que le lecteur peut faire aujourd'hui avec outil ou montant précis",
    "Conseil exclusif avec chiffre ou résultat attendu en FCFA",
    "Erreur fatale à éviter avec conséquence réelle expliquée",
    "Stratégie avancée avec résultat attendu en FCFA et délai précis",
    "Prochaine étape claire et motivante avec action immédiate"
  ],
  "call_to_action": "Message final qui crée une urgence réelle et pousse à agir maintenant",
  "sales_message": "Message WhatsApp 3 phrases max : accroche choc + valeur + prix + urgence",
  "viral_hook": "Accroche TikTok 1 phrase qui donne envie de cliquer immédiatement",
  "facebook_ads": {
    "titre_pub": "Titre de pub Facebook 6 mots max ultra accrocheur",
    "texte_principal": "Texte principal de la pub Facebook : problème + solution + preuve + prix + CTA. 150 mots max.",
    "description": "Description courte sous le titre : 1 phrase avec résultat précis",
    "cta_bouton": "ACHETER_MAINTENANT | EN_SAVOIR_PLUS | TELECHARGER",
    "ciblage_suggere": "Description précise du ciblage Facebook recommandé pour ce produit"
  }
}`;

    const userPrompt = `Crée ${typeInstruction} sur le sujet : "${topic}"

${targetInstruction}
Niveau du contenu : ${levelInstruction}

EXIGENCES STRICTES :
- Commence chaque chapitre DIRECTEMENT par du contenu utile
- Inclus au moins 2 exemples avec montants réels en FCFA par chapitre
- Donne des noms d'outils africains réels dans chaque chapitre
- Structure chaque chapitre : intro directe + étapes HOW-TO + exemples FCFA + erreur à éviter + conseil bonus
- Le script Facebook Ads doit être adapté exactement à ce sujet et cette cible
- Contexte africain francophone (Bénin, Côte d'Ivoire, Sénégal, Cameroun, Togo, Mali)`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 8000,
          temperature: 0.65,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });
      const data = await response.json();
      if (!response.ok) return res.status(500).json({ error: data.error?.message || "Erreur Groq" });
      const raw = data.choices?.[0]?.message?.content || "";
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return res.status(500).json({ error: "JSON invalide" });
        parsed = JSON.parse(match[0]);
      }

      // Validation contenu
      const chapters = parsed.chapters || [];
      const emptyChapters = chapters.filter(ch => (ch.content || "").length < 300);
      if (emptyChapters.length > 2) {
        return res.status(500).json({ error: "Contenu insuffisant. Réessaie avec un sujet plus précis." });
      }

      return res.status(200).json(parsed);
    } catch (err) {
      return res.status(500).json({ error: "Erreur: " + err.message });
    }
  }

  // ══════════════════════════════════════════
  // ACTION 3 — DONNÉES VISUELLES PDF PREMIUM
  // ══════════════════════════════════════════
  if (action === "visuals") {
    const { content } = req.body || {};
    if (!content) return res.status(400).json({ error: "Contenu manquant" });

    const systemPrompt = `Tu es un expert en design de documents professionnels.
Pour chaque chapitre d'un document, génère des données visuelles adaptées.
Réponds UNIQUEMENT en JSON valide. Zéro texte avant ou après.

JSON requis :
{
  "visuals": [
    {
      "chapter_index": 0,
      "type": "steps | chart | quote | table | highlight",
      "data": {
        // Pour type "steps" :
        "titre": "Titre du schéma",
        "etapes": ["Étape 1", "Étape 2", "Étape 3"]
        
        // Pour type "chart" :
        "titre": "Titre du graphique",
        "valeurs": [{"label": "...", "valeur": 50000, "unite": "FCFA"}]
        
        // Pour type "quote" :
        "texte": "Citation ou conseil clé du chapitre",
        "auteur": "Source ou contexte"
        
        // Pour type "table" :
        "titre": "Titre du tableau",
        "colonnes": ["Col1", "Col2", "Col3"],
        "lignes": [["val1", "val2", "val3"]]
        
        // Pour type "highlight" :
        "titre": "Titre encadré",
        "points": ["Point 1", "Point 2", "Point 3"]
      }
    }
  ]
}`;

    const chapters = (content.chapters || []).map((ch, i) => `Chapitre ${i+1}: ${ch.title}\nRésumé: ${(ch.content || "").slice(0, 200)}`).join("\n\n");

    const userPrompt = `Pour ce document intitulé "${content.title}", génère 1 visuel pertinent par chapitre.

Chapitres :
${chapters}

Règles :
- Choisis le type de visuel le plus adapté au contenu du chapitre
- Les graphiques doivent avoir des valeurs en FCFA réalistes
- Les étapes doivent être courtes (5 mots max par étape)
- Les tableaux max 3 colonnes et 4 lignes
- Contexte africain francophone`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 2000,
          temperature: 0.6,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });
      const data = await response.json();
      if (!response.ok) return res.status(500).json({ error: data.error?.message || "Erreur Groq" });
      const raw = data.choices?.[0]?.message?.content || "";
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return res.status(500).json({ error: "JSON invalide" });
        parsed = JSON.parse(match[0]);
      }
      return res.status(200).json(parsed);
    } catch (err) {
      return res.status(500).json({ error: "Erreur: " + err.message });
    }
  }

  return res.status(400).json({ error: "Action invalide. Utilise: ideas | content | visuals" });
}
