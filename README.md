# Famiflora Flow Desk

Prototype de site de ticketing et planning management pour Famiflora.

## Ce que couvre la version actuelle

- création de demandes par les employés du magasin
- choix du service: Technique ou Décoration
- ajout d'une photo de panne ou d'inspiration
- date souhaitée pour la réalisation
- routage vers le responsable du bon service
- gestion par responsable: affectation, date validée, priorité, statut
- vue planning par collaborateur
- séparation en 3 pages dédiées par usage métier

## Choix de conception

Cette version est volontairement simple:

- un portail d'accueil + 3 pages metier
- stockage local dans le navigateur via localStorage
- aucun backend ni installation nécessaire
- aucun profil ni ticket précharge (demarrage vide)

Ce choix permet de valider le besoin métier et l'ergonomie très vite. Pour une mise en production réelle, il faudra ensuite brancher:

- une authentification utilisateur
- une base de données partagée
- un stockage fichiers centralisé
- des notifications mail ou Teams si souhaité

## Lancement

Ouvrir simplement les pages HTML dans un navigateur moderne:

- `index.html`: portail d'accueil
- `employee.html`: espace employés magasin
- `manager.html`: espace responsables
- `collaborator.html`: espace collaborateurs

## Références étudiées

Le périmètre MVP s'inspire des briques communes observées sur des outils comme Jira Service Management et les solutions de work management:

- formulaire de demande simple
- assignation claire
- priorisation
- échéance validée
- vue de charge et de planning