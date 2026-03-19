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
Tu dois produire un contenu DENSE, LONG et RICHE. Chaque chapitre doit être un vrai contenu de valeur.

RÈGLES ABSOLUES DE LONGUEUR :
- Chaque chapitre DOIT contenir MINIMUM 600 mots réels. Vise 700 à 900 mots par chapitre.
- Ne résume pas. Développe chaque point en profondeur avec des explications complètes.
- Chaque étape HOW-TO doit avoir au minimum 3 à 5 phrases d'explication détaillée.
- Chaque exemple doit être une histoire courte complète avec contexte, action et résultat chiffré.

STRUCTURE OBLIGATOIRE DE CHAQUE CHAPITRE :
1. Introduction directe et accrocheuse (3 paragraphes, minimum 120 mots)
2. Etape 1 avec explication complète + exemple africain chiffré en FCFA (minimum 120 mots)
3. Etape 2 avec explication complète + exemple africain chiffré en FCFA (minimum 120 mots)
4. Etape 3 avec explication complète + exemple africain chiffré en FCFA (minimum 120 mots)
5. Etape 4 ou conseil avancé (minimum 80 mots)
6. Erreur courante à éviter avec explication du pourquoi et conséquences réelles (minimum 80 mots)
7. Conseil bonus exclusif introuvable gratuitement (minimum 60 mots)

INTERDIT ABSOLUMENT :
- Phrases génériques : "Dans ce chapitre nous allons voir...", "Il est important de noter que...", "N'hésitez pas à..."
- Contenu vague sans chiffres ni exemples précis
- Chapitres courts de moins de 600 mots
- Listes à puces sans explications développées

OBLIGATOIRE dans chaque chapitre :
- Noms d'outils africains réels : Wave, Orange Money, MTN MoMo, WhatsApp Business, Jumia, Jiji, Facebook Marketplace, CinetPay...
- Montants précis en FCFA (pas en euros ni dollars)
- Noms de villes africaines réels dans les exemples : Abidjan, Dakar, Cotonou, Douala, Lome, Bamako, Ouagadougou...
- Prénoms africains dans les exemples : Aminata, Kofi, Moussa, Fatou, Jean-Pierre, Akou...
- Stratégies concrètes avec résultats mesurables

Réponds UNIQUEMENT en JSON valide. Zéro texte avant ou après. Zéro markdown. Zéro backtick.

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
      "content": "Contenu COMPLET et DENSE. Introduction 3 paragraphes. Etape 1 developpee avec exemple FCFA complet. Etape 2 developpee avec exemple FCFA complet. Etape 3 developpee avec exemple FCFA complet. Etape 4 ou conseil avance. Erreur a eviter expliquee en detail. Conseil bonus exclusif. MINIMUM 700 mots reels."
    },
    {
      "title": "Titre chapitre 2",
      "content": "Meme structure complete. MINIMUM 700 mots reels."
    },
    {
      "title": "Titre chapitre 3",
      "content": "Meme structure complete. MINIMUM 700 mots reels."
    },
    {
      "title": "Titre chapitre 4",
      "content": "Meme structure complete. MINIMUM 700 mots reels."
    },
    {
      "title": "Titre chapitre 5",
      "content": "Meme structure complete. MINIMUM 700 mots reels."
    },
    {
      "title": "Titre chapitre 6",
      "content": "Meme structure complete. MINIMUM 700 mots reels."
    }
  ],
  "key_takeaways": [
    "Action concrete que le lecteur peut faire aujourd'hui avec outil ou montant precis",
    "Conseil exclusif avec chiffre ou resultat attendu en FCFA",
    "Erreur fatale a eviter avec consequence reelle expliquee",
    "Strategie avancee avec resultat attendu en FCFA et delai precis",
    "Prochaine etape claire et motivante avec action immediate"
  ],
  "call_to_action": "Message final qui cree une urgence reelle et pousse a agir maintenant",
  "sales_message": "Message WhatsApp 3 phrases max : accroche choc + valeur + prix + urgence",
  "viral_hook": "Accroche TikTok 1 phrase qui donne envie de cliquer immediatement",
  "facebook_ads": {
    "titre_pub": "Titre de pub Facebook 6 mots max ultra accrocheur",
    "texte_principal": "Texte principal de la pub Facebook : probleme + solution + preuve + prix + CTA. 150 mots max.",
    "description": "Description courte sous le titre : 1 phrase avec resultat precis",
    "cta_bouton": "ACHETER_MAINTENANT | EN_SAVOIR_PLUS | TELECHARGER",
    "ciblage_suggere": "Description precise du ciblage Facebook recommande pour ce produit"
  }
}`;

    const userPrompt = `Cree ${typeInstruction} sur le sujet : "${topic}"

${targetInstruction}
Niveau du contenu : ${levelInstruction}

RAPPEL CRITIQUE — LONGUEUR OBLIGATOIRE :
- CHAQUE chapitre doit faire MINIMUM 700 mots. Pas de raccourcis.
- Developpe chaque etape avec 3 a 5 phrases completes d'explication.
- Chaque exemple doit etre une histoire complete : qui, quoi, comment, resultat chiffre en FCFA.
- Utilise des noms de personnes africaines et des villes africaines reelles dans chaque exemple.
- Contexte africain francophone uniquement : Benin, Cote d'Ivoire, Senegal, Cameroun, Togo, Mali, Burkina Faso.
- Tous les montants en FCFA. Aucun euro, aucun dollar.
- Outils africains obligatoires dans chaque chapitre : Wave, Orange Money, MTN MoMo, WhatsApp Business, Jumia, Jiji...`;

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

      // Validation contenu — seuil relevé à 500 caractères
      const chapters = parsed.chapters || [];
      const emptyChapters = chapters.filter(ch => (ch.content || "").length < 500);
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
        "titre": "Titre du schema",
        "etapes": ["Etape 1", "Etape 2", "Etape 3"]
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

  // ══════════════════════════════════════════
  // ACTION 4 — PROMPT LIBRE (Flow 3)
  // ══════════════════════════════════════════
  if (action === "prompt_libre") {
    const { userPromptLibre, docType, docLabel } = req.body || {};
    if (!userPromptLibre) return res.status(400).json({ error: "Prompt manquant" });

    const typeInstructions = {
      ebook:         "un ebook complet avec chapitres, exemples concrets et stratégies détaillées",
      guide:         "un guide pratique étape par étape avec actions numérotées et résultats attendus",
      business_plan: "un business plan complet avec étude de marché, plan financier chiffré en FCFA et projections",
      formation:     "une mini-formation structurée avec leçons détaillées, exercices pratiques et plan d'action",
      tiktok:        "un pack de scripts TikTok complets et viraux avec accroche, développement et hashtags",
      cv:            "un CV professionnel complet avec résumé, expériences, compétences et formation"
    };
    const typeInstruction = typeInstructions[docType] || typeInstructions.ebook;

    const systemPrompt = `Tu es un expert rédacteur de contenus numériques vendables en Afrique francophone.
L'utilisateur te donne un prompt libre. Tu dois analyser ce prompt et extraire toutes les informations importantes.

ANALYSE DU PROMPT :
- Si l'utilisateur mentionne un nombre de pages → respecte-le exactement
- Si l'utilisateur mentionne un nombre d'étapes → respecte-le exactement
- Si l'utilisateur mentionne un nombre de chapitres → respecte-le exactement
- Si l'utilisateur mentionne un nombre de mois → intègre-le dans le contenu
- Si l'utilisateur mentionne une ville ou un pays → contextualise tout le contenu avec ce lieu
- Si l'utilisateur mentionne un profil précis → adapte tout le contenu à ce profil
- Si aucun nombre de pages n'est mentionné → génère une structure optimale selon le type

RÈGLES ABSOLUES DE CONTENU :
- Minimum 600 mots par chapitre ou section
- Exemples africains réels avec montants en FCFA
- Noms de villes africaines : Abidjan, Dakar, Cotonou, Douala, Lome, Bamako...
- Noms de personnes africaines : Aminata, Kofi, Moussa, Fatou, Jean-Pierre...
- Outils africains réels : Wave, Orange Money, MTN MoMo, WhatsApp Business, Jumia, Jiji...
- Zéro phrases génériques, zéro remplissage
- Contenu dense, concret et immédiatement applicable

Réponds UNIQUEMENT en JSON valide. Zéro texte avant ou après. Zéro markdown. Zéro backtick.

JSON requis :
{
  "title": "Titre ultra vendeur adapté au prompt de l'utilisateur",
  "subtitle": "Sous-titre précis qui reflète exactement le contenu demandé",
  "author": "Expert [domaine détecté dans le prompt]",
  "tagline": "Phrase choc 8 mots max avec résultat concret",
  "description": "2 phrases décrivant exactement ce que l'utilisateur obtient",
  "price_suggested": "X 000 FCFA",
  "nb_pages_detecte": "nombre de pages détecté dans le prompt ou 'auto'",
  "table_of_contents": [
    "Section 1 : [Titre précis]",
    "Section 2 : [Titre précis]",
    "Section 3 : [Titre précis]"
  ],
  "chapters": [
    {
      "title": "Titre section 1",
      "content": "Contenu COMPLET et DENSE. Minimum 600 mots. Adapté exactement au prompt de l'utilisateur."
    }
  ],
  "key_takeaways": [
    "Action concrète 1 avec outil ou montant précis",
    "Action concrète 2",
    "Action concrète 3",
    "Action concrète 4",
    "Action concrète 5"
  ],
  "call_to_action": "Message final motivant adapté au contenu",
  "sales_message": "Message WhatsApp 3 phrases : accroche + valeur + prix + urgence",
  "viral_hook": "Accroche TikTok 1 phrase irrésistible",
  "facebook_ads": {
    "titre_pub": "Titre pub Facebook 6 mots max",
    "texte_principal": "Texte pub Facebook 150 mots max",
    "description": "1 phrase avec résultat précis",
    "cta_bouton": "ACHETER_MAINTENANT | EN_SAVOIR_PLUS | TELECHARGER",
    "ciblage_suggere": "Ciblage Facebook précis pour ce contenu"
  }
}`;

    const userPrompt = `Voici le prompt libre de l'utilisateur :

"${userPromptLibre}"

Type de document demandé : ${typeInstruction}
Label : ${docLabel || docType}

INSTRUCTIONS CRITIQUES :
1. Analyse d'abord le prompt pour extraire : sujet, ville, profil, nombre de pages/étapes/mois mentionnés
2. Respecte EXACTEMENT tout ce que l'utilisateur a précisé dans son prompt
3. Génère le nombre de chapitres/sections adapté à ce qui est demandé
4. Si un nombre de pages est mentionné, ajuste le nombre de chapitres en conséquence
5. Chaque chapitre minimum 600 mots, contexte africain francophone, montants en FCFA
6. Le titre doit refléter EXACTEMENT ce que l'utilisateur a demandé`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 8000,
          temperature: 0.7,
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
        return res.status(500).json({ error: "Contenu insuffisant. Reformule ton prompt avec plus de détails." });
      }

      return res.status(200).json(parsed);
    } catch (err) {
      return res.status(500).json({ error: "Erreur: " + err.message });
    }
  }

  return res.status(400).json({ error: "Action invalide. Utilise: ideas | content | visuals | prompt_libre" });
}
