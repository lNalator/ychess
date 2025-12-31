# YChess

YChess est un jeu d'echecs realise avec Next.js et React. L'application propose un plateau complet jouable dans le navigateur, des chronometres configurables et une gestion avancee des regles afin de simuler une partie serieuse directement depuis le poste de travail.

## Fonctionnalites principales
- Plateau interactif 8x8 avec surbrillance des coups legaux et respect des regles officielles (captures, roque petit/grand, prise en passant, promotion automatique en dame).
- Detection des situations de fin de partie: echec et mat, pat, nulle par accord, resignation et chute du temps, avec mise a jour des scores.
- Gestion du tour et des joueurs via Jotai avec persistance locale: le plateau, les pieces capturees et le score restent disponibles apres rechargement de la page.
- Chronometres parametres (1, 5, 10 ou 15 minutes) qui s'arretent automatiquement, declenchent une defaite au temps et affichent les pieces capturees ainsi que l'ecart de materiel.
- Menu lateral pour lancer une nouvelle partie, continuer la partie en cours ou reinitialiser completement l'etat, en choisissant la cadence de jeu.
- Boutons de controles in-game: abandon immediat (`Resign`) ou proposition de nulle (`Draw`) avec double validation entre les joueurs.
- Overlay de fin de partie indiquant la raison, le vainqueur et permettant de relancer une revanche avec un nouveau temps.

## Technologies utilisees
- Next.js 15 (App Router) et React 19
- TypeScript
- Jotai pour la gestion d'etat avec stockage local
- CSS modules locaux pour le style
- Next Image pour l'affichage des pieces

## Prerequis
- Node.js 18 ou superieur
- npm (fourni avec Node.js)

## Installation et lancement
```bash
npm install
npm run dev
```
Ensuite ouvrir http://localhost:3000 dans le navigateur.

## Mode en ligne (GraphQL + subscriptions)

Le front peut se connecter au backend NestJS `ychess-back` pour jouer en temps reel (mouvements + evenements par partie via subscription).

### Lancer le backend

Dans `ychess-back/`:

```bash
npm install
npm run start:dev
```

Par defaut le backend ecoute sur `http://localhost:3001`.

### Configurer l'URL GraphQL (optionnel)

Par defaut, le front vise `http://localhost:3001/graphql`.

Vous pouvez surcharger avec des variables d'environnement:

- `NEXT_PUBLIC_CHESS_HTTP_URL` (ex: `http://localhost:3001/graphql`)
- `NEXT_PUBLIC_CHESS_WS_URL` (ex: `ws://localhost:3001/graphql`)

### Utilisation

- L'ecran d'accueil (Home) propose: **Play Locally** ou **Play Online**
- Online avec code: **Online with a Code** -> `Create Invite Game` (popup avec code 7 caracteres) ou `Join Game`
- Online matchmaking: **Online Matchmaking** -> `Find a Game` (meme time control) -> entree automatique en partie via subscription
- Les mouvements et les timers sont autoritaires cote serveur et diffuses via subscriptions
- Quit (online): propose "Stay on board" (snapshot read-only, session online fermee) ou "Go back Home"
- Si un joueur quitte/deconnecte: un countdown apparait cote adversaire (grace configurable)

Notes:
- Pas d'auth: un `clientId` est genere et stocke localement cote front.
- Les boutons `Resign`/`Draw` (offline) sont masques en mode online.
- Orientation: le joueur NOIR voit le plateau inverse (noir en bas).

Pour une version de production:
```bash
npm run build
npm run start
```

## Scripts npm
- `npm run dev` lance le serveur de developpement.
- `npm run build` effectue la compilation de production.
- `npm run start` demarre le serveur sur la version compilee.
- `npm run lint` execute la configuration ESLint du projet.

## Structure du projet
- `src/app` contient la configuration Next.js, les styles globaux et la page principale.
- `src/components` regroupe le plateau, les chronometres, les menus et overlays reutilisables.
- `src/core` centralise les entites du jeu, les helpers metier (regles des pieces, gestion des joueurs) et les atomes Jotai.

## Pistes d'amelioration
- Ajouter un historique des coups et l'annulation (undo/redo).
- Etendre la gestion des nulles (repetition, 50 coups) et des regles de material insuffisant.
- Proposer des themes ou un mode sombre pour le plateau.
