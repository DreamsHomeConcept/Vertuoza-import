# Module « Reprise de devis → format Vertuoza » — DHC

Module HTML autonome de Dreams Home Concept. Il reprend des devis de sous-traitants et de fournisseurs (PDF, Excel, DPGF), les consolide par chantier, applique les marges DHC et exporte au format d'import Vertuoza.
Tout tient dans **`index.html`**, publié par GitHub Pages depuis ce dépôt.

## Règles de travail (impératives)

- **Ne rien modifier sans le « go » de Moussa.** Toujours présenter d'abord une proposition courte (mode plan) : ce qui change, un exemple chiffré si un calcul change, les points à trancher.
- Répondre **en français**, de façon directe et concise. Moussa n'est pas développeur : pas de jargon inutile.
- Moussa valide visuellement. Après chaque version, donner un compte rendu court : ce qui change, ce qui a été testé, les limites.
- Ne publier (commit + push) **qu'après accord**.

## Sécurité (dépôt public)

- **Jamais** de clé API Anthropic (`sk-ant-…`) ni de clé Supabase secrète (`sb_secret_…`) dans un fichier du dépôt. Chaque poste saisit sa clé dans les Paramètres du module.
- **Jamais** de devis clients, PDF ou Excel de chantier dans le dépôt.
- **Ne jamais relancer `supabase-cles.sql`** : il redéfinit les deux clés.
- Jamais de clé d'édition ni de base de prix dans l'atelier de test.
- Avant chaque commit, vérifier : `grep -nE "sk-ant-[A-Za-z0-9]{10}|sb_secret_[A-Za-z0-9]{6}" index.html` ne doit rien renvoyer.

## Procédure de livraison d'une version

1. Incrémenter `var VERSION` (ex. `'2.90'`), mettre `var DATE_VERSION` à la date et l'heure de livraison, heure de Paris, format `JJ/MM/AAAA HHhMM` (ex. `'05/10/2026 15h07'`), et réécrire `var NOTES` en une phrase. Ces trois constantes sont le seul endroit à changer.
2. Contrôle syntaxique : extraire le contenu des balises `<script>` dans un fichier `.js`, puis `node --check`.
3. Tests Playwright (Chromium) de la nouveauté, puis de non-régression :
   - l'IA est simulée en interceptant `https://api.anthropic.com/**` (réponse SSE construite à la main) et en injectant `window.VERTUOZA_CONFIG={apiKey:'test'}` ;
   - les chantiers de test sont injectés directement dans IndexedDB `dhc-vertuoza` (magasin `chantiers`) ;
   - les bibliothèques CDN (xlsx, pdf.js) peuvent être servies depuis `node_modules` par `page.route` ;
   - attendus : pastille « ✓ Cohérent », aucune erreur JavaScript, total HT inchangé lors des déplacements, export Vertuoza égal à la somme des lignes, classement des corps d'état correct ;
   - les fichiers de test réels (devis Estrablin, KM.xlsx, DPGF…) sont fournis par Moussa en local et **ne vont pas dans le dépôt**.
4. Vérification de sécurité (ci-dessus).
5. Après accord : commit `vX.YY — résumé`, push. Les postes ouverts voient le bandeau « Nouvelle version X du … disponible ».

## Règles métier validées (ne pas changer sans accord)

- **Prix de vente** = PU achat × coefficient de marge + main-d'œuvre vendue / quantité (arrondi au centime).
- **Main-d'œuvre DHC** (montage d'ossature et main-d'œuvre ajoutée à la main sur une ligne) : jours × coût journalier (906 € HT, Paramètres), **majoré de la marge du montage (30 %)**. Note interne sous la ligne, jamais exportée.
- **Export Vertuoza** : colonnes Format (T / S / PO), Référence 01 / 01.01 / 01.01.01, Description, Quantite, TM (QF par défaut), Unite, Prix Uni, Prix Total, Commentaire. Options et notes internes exclues ; un texte sous une ligne part en Commentaire.
- **Nom du fichier exporté** : chantier de l'onglet affiché (sinon client, sinon onglet) + date.
- **Classement des chapitres** : Informations chantier, Maçonnerie, Structure maison (ossature métallique, Sweelco), Toiture (charpente bois comprise), Plâtrerie-peinture, Plomberie, Électricité, Façade ITE ; lots inconnus à la fin ; ordre modifiable dans les Paramètres.
- **Majuscules** : désignations en « Majuscule puis minuscules » ; chapitres en MAJUSCULES ; sigles, références avec chiffres, marques et accents du bâtiment conservés ; DPGF laissés tels quels.
- **Informations chantier** : Surface et Hauteur sous plafond → premier chapitre automatique « INFORMATIONS CHANTIER ».
- **Ouvrages** : lignes étoilées d'un même chapitre = un ouvrage de la bibliothèque (catégorie `ouvrage`), réinséré d'un bloc par le menu « + ».
- **TVA** : un devis reçu à 5,5 % est toujours signalé ; client à 5,5 % seulement en rénovation, 20 % en neuf.
- **Consolidation** : client et chantier jamais repris des devis de sous-traitants.
- **Contrôle de cohérence** : export bloqué en cas d'écart (« Exporter quand même » possible).

## Repères techniques

- Tout le JavaScript est dans une IIFE ; les chantiers sont dans `dossier[]`, le chantier affiché est `D()`.
- Une ligne de `d.lignes` : `type` (chapitre, sous, ligne, texte, note), `designation`, `qte`, `pu`, `unite`, `intervenant`, `option`, `variante`, `marge`, `marche`, `mo {jours, taux, marge, manuelle}`, `auto`, `etoile`, `deplace`.
- `d.mode` = `st` (consolidation des intervenants) ou `client`.
- Stockage : IndexedDB `dhc-vertuoza` (`chantiers`, `modeles`) + localStorage (paramètres). Base de prix : Supabase « DHC-base-prix » (clé publishable seulement).
- IA : API Anthropic, modèle `claude-sonnet-4-6`, en flux, avec repli sans flux (`appelClaude`).
- Toujours passer par `memorise(d, quoi)` avant une modification de données, pour que ↶ Annuler fonctionne, puis appeler `rendu()`.
