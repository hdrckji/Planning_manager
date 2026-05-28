// ── i18n : Traductions FR / NL ─────────────────────────────────────────────
const TRANSLATIONS = {
  fr: {
    // ── Général ────────────────────────────────────────────────────────────
    "app.brand":          "Famiflora",
    "app.name":           "FamiTask",
    "lang.toggle":        "NL",
    "lang.current":       "FR",

    // ── Portail (index.html) ───────────────────────────────────────────────
    "portal.sub":         "Portail interne de ticketing et de gestion des interventions.\nChoisissez votre espace pour commencer.",
    "portal.footer":      "FamiTask — Usage interne Famiflora",

    "role.employee.tag":  "Magasin",
    "role.employee.title":"Espace employé",
    "role.employee.desc": "Créer une demande d'intervention, décrire le besoin et proposer une date de passage.",
    "role.employee.cta":  "Accéder à mon espace",

    "role.manager.tag":   "Responsable",
    "role.manager.title": "Espace manager",
    "role.manager.desc":  "Valider les demandes, affecter les tâches aux équipes et ajuster les plannings d'intervention.",
    "role.manager.cta":   "Accéder à mon espace",

    "role.collab.tag":    "Technique · Décoration",
    "role.collab.title":  "Espace collaborateur",
    "role.collab.desc":   "Consulter son planning, suivre les tâches assignées et clôturer les interventions terminées.",
    "role.collab.cta":    "Accéder à mon espace",

    // ── Auth modal ─────────────────────────────────────────────────────────
    "auth.protected":     "Accès protégé",
    "auth.login":         "Identifiant",
    "auth.login.ph":      "Votre nom (ex: Alice Dupont)",
    "auth.password":      "Mot de passe",
    "auth.cancel":        "Annuler",
    "auth.submit":        "Se connecter",
    "auth.wrong":         "Identifiant ou mot de passe incorrect.",
    "auth.no.account":    "Identifiant ou mot de passe incorrect.",
    "chat.history":       "Échanges complémentaires",
    "chat.manager":       "Responsable",
    "chat.employee":      "Employé",
    "chat.empty":         "Aucun message complémentaire.",

    // ── Headers pages ──────────────────────────────────────────────────────
    "page.employee.hero": "Demandes d'intervention et d'aménagement pour les services Technique et Décoration.",
    "page.manager.hero":  "Espace de pilotage pour valider, attribuer et planifier les demandes par département.",
    "page.collab.hero":   "Espace planning pour consulter les tâches attribuées et suivre l'avancement quotidien.",

    // ── Stats rapide ───────────────────────────────────────────────────────
    "stats.title":        "Vue rapide",
    "stats.total":        "Demandes totales",
    "stats.pending":      "À compléter",
    "stats.sector.title": "Tâches par secteur",
    "stats.sector.planned": "Planifié",
    "stats.sector.ongoing": "En cours",
    "stats.sector.done":    "Terminé",

    // ── Onglets manager ────────────────────────────────────────────────────
    "tab.dashboard":      "Tableau de bord",
    "tab.sites":          "Lieu de prestation",
    "tab.requests":       "Demandes",
    "tab.users":          "Utilisateurs",
    "tab.categories":     "Catégories",
    "tab.planning":       "Planning",
  "tab.prestataires":   "Prestataires",

    // ── Tableau de bord ────────────────────────────────────────────────────
    "dash.title":         "Tableau de bord",
    "dash.subtitle":      "Vue synthétique de l'activité de votre département.",
    "dash.lanes.title":   "Vue par statut",
    "dash.lanes.subtitle":"Aperçu rapide de toutes les demandes en cours.",
    "dash.oldest.title":   "Dossier le plus ancien par statut",
    "dash.oldest.subtitle":"Cliquez sur une demande pour ouvrir son détail.",
    "dash.oldest.none":    "Aucune demande dans ce statut.",
    "dash.oldest.created": "Créée le",
    "dash.oldest.age":     "{n} j",

    // ── Statuts ────────────────────────────────────────────────────────────
    "status.nouveau":     "Nouveau",
    "status.en_attente":  "En attente",
    "status.planifie":    "Planifié",
    "status.en_cours":    "En cours",
    "status.termine":     "Terminé",

    // ── Priorités ──────────────────────────────────────────────────────────
    "priority.basse":     "Basse",
    "priority.moyenne":   "Moyenne",
    "priority.haute":     "Haute",

    "delay.asap":         "Le plus vite possible",
    "delay.h48":          "Dans les 48h",
    "delay.week":         "Dans la semaine",
    "delay.month":        "Dans le mois",

    // ── Équipes ────────────────────────────────────────────────────────────
    "team.magasin":       "Magasin",
    "team.technique":     "Technique",
    "team.decoration":    "Décoration",

    // ── Rôles ──────────────────────────────────────────────────────────────
    "role.employee":      "Employé magasin",
    "role.manager":       "Responsable",
    "role.collaborator":  "Collaborateur",

    // ── Spécialités ───────────────────────────────────────────────────────
    "skill.general":      "Polyvalent",
    "skill.electricite":  "Électricité",
    "skill.plomberie":    "Plomberie",
    "skill.equipement":   "Équipement",
    "skill.mise_en_scene": "Mise en scène",
    "skill.signalisation": "Signalisation",

    // ── Demandes (employé) ─────────────────────────────────────────────────
    "emp.newrequest":     "Nouvelle demande",
    "emp.newrequest.sub": "Suivez les étapes pour qualifier votre demande d'intervention.",
    "emp.waiting.title":  "⚠ Demandes en attente d'informations",
    "emp.waiting.sub":    "Le responsable a besoin de précisions supplémentaires sur ces demandes.",
    "emp.myrequests":     "Mes demandes",
    "emp.myrequests.sub": "Suivi des demandes créées depuis ce profil.",
    "emp.delay.label":    "Délai d'intervention souhaité",
    "emp.title":          "Titre de la demande",
    "emp.title.ph":       "Résumez votre demande en quelques mots...",
    "emp.title.required": "Le titre de la demande est obligatoire.",
    "emp.table.title":    "Titre",
    "emp.table.by":       "Demandé par",
    "emp.table.created":  "Créée le",
    "emp.table.delay":    "Délai souhaité",
    "emp.table.status":   "Statut",
    "emp.reply.label":    "Votre réponse / précision",
    "emp.reply.ph":       "Ajoutez les informations demandées par le responsable...",
    "emp.reply.send":     "Envoyer ma précision",
    "emp.reply.sent":     "Précision envoyée au responsable.",
    "emp.cat":            "Catégorie",
    "emp.subcat":         "Sous-catégorie",
    "emp.precision":      "Précision",
    "emp.choose":         "-- Choisir --",
    "emp.comment":        "Commentaire (optionnel)",
    "emp.comment.ph":     "Décris l'emplacement, le contexte, l'urgence...",
    "emp.photo":          "Photo (obligatoire)",
    "emp.photo.required": "Une photo est obligatoire pour envoyer la demande.",
    "emp.submit":         "Envoyer la demande",
    "emp.sent":           "Demande envoyée.",

    // ── Demandes (manager) ─────────────────────────────────────────────────
    "mgr.requests.title": "Demandes d'intervention",
    "mgr.requests.sub":   "Planifiez, affectez ou retournez chaque demande à l'employé.",
    "mgr.filter.label":   "Filtrer :",
    "mgr.filter.all":     "Tous les statuts",
    "mgr.assign":         "Affecter à",
    "mgr.unassigned":     "Non attribué",
    "mgr.priority":       "Priorité",
    "mgr.date.validated": "Date validée",
    "mgr.status":         "Statut",
    "mgr.return.msg":     "Message pour l'employé",
    "mgr.return.ph":      "Précisez les informations manquantes...",
    "mgr.save":           "Enregistrer",
    "mgr.saved":          "Demande mise à jour.",
    "mgr.return.btn":     "↩ Retourner à l'employé",
    "mgr.estimated":      "Durée estimée (h)",
    "mgr.suggest.title":  "Suggestion d'attribution",
    "mgr.suggest.for":    "Compétence ciblée",
    "mgr.suggest.proposal":"Proposition",
    "mgr.suggest.none":   "Aucun collaborateur adapté actuellement",
  "mgr.assign.type":    "Type d'attribution",
  "mgr.assign.internal":"Collaborateur interne",
  "mgr.assign.external":"Prestataire externe",
  "mgr.mail.btn":       "📧 Envoyer par mail au prestataire",
  "mgr.assign.week":    "Planifier dans l'agenda (semaine)",
  "mgr.assign.week.none":"Choisissez d'abord un collaborateur pour voir son agenda.",
  "mgr.ask.info":       "Demander info complémentaire",
  "mgr.ask.info.note.required":"Ajoutez un message pour demander un complément d'information.",
  "mgr.ask.info.sent":  "Demande d'information envoyée à l'employé.",

    // ── Détails ticket ─────────────────────────────────────────────────────
    "ticket.by":          "Demande par",
    "ticket.desired":     "Date souhaitée",
    "ticket.validated":   "Date validée",
    "ticket.assigned":    "Attribué à",
    "ticket.manager":     "Responsable",
    "ticket.updated":     "Mis à jour",
    "ticket.estimated":   "Durée estimée",
    "ticket.specialty":   "Compétence requise",
    "ticket.intervention.delay": "Délai d'intervention souhaité",
    "ticket.return.note": "Message du responsable",
    "ticket.employee.reply":"Réponse de l'employé",
    "ticket.photo":       "Photo",
    "ticket.unknown":     "Inconnu",
    "ticket.no.manager":  "Responsable non défini",
    "ticket.empty":       "Aucune demande à afficher.",
    "ticket.date.tbd":    "À définir",
    "ticket.date.confirm":"Date à confirmer",

    // ── Utilisateurs ───────────────────────────────────────────────────────
    "users.title":        "Gestion des utilisateurs",
    "users.sub":          "Créez et supprimez tous les profils de l'application.",
    "users.new":          "Nouvel utilisateur",
    "users.name":         "Nom",
    "users.name.ph":      "Prénom Nom",
    "users.role":         "Rôle",
    "users.dept":         "Département",
    "users.skills":       "Compétences",
    "users.skills.edit":  "Éditer compétences",
    "users.skills.save":  "Enregistrer compétences",
    "users.skills.cancel":"Annuler",
    "users.skills.saved": "Compétences mises à jour.",
    "users.skills.catalog":"Catalogue des compétences",
    "users.skills.show": "Gérer les compétences",
    "users.skills.hide": "Masquer les compétences",
    "users.skills.label": "Nom de la compétence",
    "users.skills.label.ph":"Ex: Climatisation",
    "users.skills.teams": "Équipes autorisées",
    "users.skills.create":"Ajouter la compétence",
    "users.skills.created":"Compétence ajoutée.",
    "users.skills.deleted":"Compétence supprimée.",
    "users.skills.exists":"Cette compétence existe déjà.",
    "users.skills.in.use":"Impossible de supprimer: compétence déjà utilisée.",
    "users.skills.team.required":"Sélectionnez au moins une équipe.",
    "users.password.set":  "Définir mot de passe",
    "users.password.change":"Changer mot de passe",
    "users.password.cancel":"Annuler",
    "users.password.label":"Nouveau mot de passe",
    "users.password.ph":   "Minimum 4 caractères",
    "users.password.save": "Enregistrer",
    "users.password.saved":"Mot de passe enregistré.",
    "users.password.none": "Sans mot de passe",
    "users.create":       "Créer l'utilisateur",
    "users.created":      "Utilisateur créé.",
    "users.deleted":      "Profil supprimé.",
    "users.none":         "Aucun utilisateur dans ce groupe.",
    "users.delete":       "Supprimer",
    "users.managers":     "Responsables",
    "users.collabs":      "Collaborateurs",
    "users.employees":    "Employés magasin",
    "dept.magasin":       "Magasin",
    "dept.technique":     "Technique",
    "dept.decoration":    "Décoration",
    "role.employee.opt":  "Employé magasin",
    "role.collab.opt":    "Collaborateur",
    "role.manager.opt":   "Responsable",

    // ── Catégories (arbre) ─────────────────────────────────────────────────
    "tree.title":         "Paramétrer les catégories",
    "tree.sub":           "Définissez l'arbre décisionnel affiché aux employés lors de la création d'une demande.",
    "tree.label.ph":      "Libellé",
    "tree.value.ph":      "Valeur (sans espace)",
    "tree.add.child":     "+ Sous-niveau",
    "tree.delete":        "Supprimer",
    "tree.add.root":      "+ Ajouter une catégorie racine",
    "tree.save":          "Enregistrer",
    "tree.restore":       "Restaurer par défaut",
    "tree.saved":         "Catégories enregistrées.",
    "tree.restored":      "Arbre restauré par défaut.",
    "tree.label":         "Libellé",
    "tree.value":         "Code catégorie",
    "tree.team":          "Équipe cible",
    "tree.specialty":     "Compétence suggérée",
    "tree.estimated":     "Durée estimée (h)",
    "tree.external":      "Prestataire lié",
    "tree.external.none": "Aucun prestataire",
    "tree.details":       "Détails de la catégorie",
    "tree.new.node":      "Nouvelle catégorie",
    "tree.new.root":      "Nouvelle catégorie racine",
    "tree.new.child":     "Nouveau sous-niveau",
    "tree.leaf":          "Feuille",
    "tree.keep.one":      "Conservez au moins une catégorie racine.",

    // ── Planning ───────────────────────────────────────────────────────────
    "plan.title":              "Planning collaborateurs",
    "plan.collab.all":         "Tous",
    "plan.collab.label":       "Collaborateur :",
    "plan.prev":               "← Préc.",
    "plan.today":              "Aujourd'hui",
    "plan.next":               "Suiv. →",
    "plan.export":             "Exporter Excel",
    "plan.task.new":           "Nouvelle tâche",
    "plan.task.edit":          "Modifier la tâche",
    "plan.task.title.label":   "Titre",
    "plan.task.date.label":    "Date",
    "plan.task.hours.label":   "Heures estimées",
    "plan.task.photo.label":   "Photo (optionnel)",
    "plan.task.collab.label":  "Collaborateur",
    "plan.task.status.label":  "Statut",
    "plan.task.notes.label":   "Notes",
    "plan.task.none":          "— Non assigné —",
    "plan.task.notes.ph":      "Description optionnelle…",
    "plan.task.save":          "Enregistrer",
    "plan.task.create":        "Créer la tâche",
    "plan.task.delete":        "Supprimer",
    "plan.task.delete.confirm":"Supprimer cette tâche ?",
    "plan.export.empty":       "Aucune donnée à exporter pour cette période.",
    "plan.export.done":        "Export téléchargé :",
    "plan.export.unavail":     "Bibliothèque Excel non disponible.",
    "plan.week.total":         "Total semaine :",

    // ── Collaborateur ──────────────────────────────────────────────────────
    "collab.planning":    "Mon planning",
    "collab.planning.sub":"Vue chronologique des tâches affectées à ce collaborateur.",
    "collab.task.none":   "Aucune tâche affectée pour le moment.",
    "collab.task.count":  "tâche(s)",
    "collab.start":       "Passer en cours",
    "collab.started":     "Tâche passée en cours.",
    "collab.finish":      "Passer en terminé",
    "collab.finished":    "Tâche terminée.",
    "collab.done":        "Marquer terminé",
    "collab.marked":      "Tâche marquée comme terminée.",

    // ── Divers ─────────────────────────────────────────────────────────────
    "misc.no.profile":    "Aucun profil pour ce rôle.",
      // ── Prestataires ───────────────────────────────────────────────────────
      "prest.title":        "Prestataires externes",
      "prest.sub":          "Gérez vos partenaires et sous-traitants externes.",
      "prest.new":          "Nouveau prestataire",
      "prest.name":         "Nom",
      "prest.company":      "Société",
      "prest.email":        "Email",
      "prest.phone":        "Téléphone",
      "prest.skills":       "Spécialités",
      "prest.create":       "Ajouter le prestataire",
      "prest.created":      "Prestataire ajouté.",
      "prest.delete":       "Supprimer",
      "prest.deleted":      "Prestataire supprimé.",
      "prest.none":         "Aucun prestataire externe enregistré.",
      "prest.list":         "Prestataires enregistrés",

      // ── Lieux de prestation ───────────────────────────────────────
      "sites.title":        "Lieux de prestation",
      "sites.sub":          "Définissez les sites où les collaborateurs doivent intervenir.",
      "sites.new":          "Nouveau lieu",
      "sites.name":         "Nom du lieu",
      "sites.address":      "Adresse",
      "sites.notes":        "Notes / accès",
      "sites.create":       "Ajouter le lieu",
      "sites.created":      "Lieu de prestation ajouté.",
      "sites.delete":       "Supprimer",
      "sites.deleted":      "Lieu de prestation supprimé.",
      "sites.none":         "Aucun lieu de prestation enregistré.",
      "sites.list":         "Lieux enregistrés",
      "emp.site":           "Lieu de prestation",
      "emp.site.required":  "Le lieu de prestation est obligatoire.",
      "emp.site.empty":     "Aucun lieu n'est encore défini. Demandez au responsable de créer un lieu de prestation.",
      "ticket.site":        "Lieu de prestation",

      // ── Urgence / Responsable de garde ───────────────────────────────────
      "emp.urgent.title":   "Appel urgence technique",
      "emp.urgent.btn":     "Appeler le responsable de garde",
      "emp.urgent.oncall":  "Responsable de garde :",
      "emp.urgent.none":    "Aucun responsable de garde n'est défini.",
      "oncall.title":       "Responsable de garde",
      "oncall.sub":         "Collègue à contacter via Teams en cas d'urgence technique.",
      "oncall.name":        "Nom",
      "oncall.email":       "Email / UPN Teams",
      "oncall.phone":       "Téléphone (optionnel)",
      "oncall.save":        "Enregistrer",
      "oncall.saved":       "Responsable de garde mis à jour.",
      "oncall.clear":       "Retirer",
      "oncall.cleared":     "Responsable de garde retiré.",
      "oncall.email.required": "L'email Teams est obligatoire.",

    "misc.no.profile.selector": "Aucun profil créé",
    "misc.add.profile":   "Ajoutez d'abord un profil dans le panneau de gauche.",
    "misc.empty":         "Aucune demande.",
    "misc.logout":        "Se déconnecter",
    "misc.session.active":"Session active pour cet espace.",
    "misc.profile.added": "Profil ajouté.",
    "misc.toast.added":   "Profil ajouté.",
  },

  nl: {
    // ── Général ────────────────────────────────────────────────────────────
    "app.brand":          "Famiflora",
    "app.name":           "FamiTask",
    "lang.toggle":        "FR",
    "lang.current":       "NL",

    // ── Portaal ────────────────────────────────────────────────────────────
    "portal.sub":         "Intern ticketingsysteem voor interventiebeheer.\nKies uw ruimte om te beginnen.",
    "portal.footer":      "FamiTask — Intern gebruik Famiflora",

    "role.employee.tag":  "Winkel",
    "role.employee.title":"Medewerkerruimte",
    "role.employee.desc": "Een interventieverzoek indienen, de behoefte beschrijven en een gewenste datum voorstellen.",
    "role.employee.cta":  "Naar mijn ruimte",

    "role.manager.tag":   "Verantwoordelijke",
    "role.manager.title": "Managerruimte",
    "role.manager.desc":  "Aanvragen valideren, taken toewijzen aan teams en interventieplanningen aanpassen.",
    "role.manager.cta":   "Naar mijn ruimte",

    "role.collab.tag":    "Techniek · Decoratie",
    "role.collab.title":  "Medewerkerruimte",
    "role.collab.desc":   "Uw planning raadplegen, toegewezen taken opvolgen en voltooide interventies afsluiten.",
    "role.collab.cta":    "Naar mijn ruimte",

    // ── Auth modal ─────────────────────────────────────────────────────────
    "auth.protected":     "Beveiligde toegang",
    "auth.login":         "Gebruikersnaam",
    "auth.login.ph":      "Uw naam (bijv. Alice Dupont)",
    "auth.password":      "Wachtwoord",
    "auth.cancel":        "Annuleren",
    "auth.submit":        "Aanmelden",
    "auth.wrong":         "Gebruikersnaam of wachtwoord onjuist.",
    "auth.no.account":    "Gebruikersnaam of wachtwoord onjuist.",
    "chat.history":       "Aanvullende uitwisseling",
    "chat.manager":       "Verantwoordelijke",
    "chat.employee":      "Medewerker",
    "chat.empty":         "Geen aanvullende berichten.",

    // ── Headers pages ──────────────────────────────────────────────────────
    "page.employee.hero": "Interventie- en inrichtingsaanvragen voor de diensten Techniek en Decoratie.",
    "page.manager.hero":  "Beheersruimte voor het valideren, toewijzen en plannen van aanvragen per afdeling.",
    "page.collab.hero":   "Planningsruimte voor het raadplegen van toegewezen taken en het opvolgen van de dagelijkse voortgang.",

    // ── Stats rapide ───────────────────────────────────────────────────────
    "stats.title":        "Snel overzicht",
    "stats.total":        "Totale aanvragen",
    "stats.pending":      "Te vervolledigen",
    "stats.sector.title": "Taken per sector",
    "stats.sector.planned": "Gepland",
    "stats.sector.ongoing": "Bezig",
    "stats.sector.done":    "Afgerond",

    // ── Onglets manager ────────────────────────────────────────────────────
    "tab.dashboard":      "Dashboard",
    "tab.sites":          "Werflocatie",
    "tab.requests":       "Aanvragen",
    "tab.users":          "Gebruikers",
    "tab.categories":     "Categorieën",
      "tab.prestataires":   "Aannemers",
    "tab.planning":       "Planning",

    // ── Tableau de bord ────────────────────────────────────────────────────
    "dash.title":         "Dashboard",
    "dash.subtitle":      "Beknopt overzicht van de activiteit van uw afdeling.",
    "dash.lanes.title":   "Overzicht per status",
    "dash.lanes.subtitle":"Snel overzicht van alle lopende aanvragen.",
    "dash.oldest.title":   "Oudste dossier per status",
    "dash.oldest.subtitle":"Klik op een aanvraag om het detail te openen.",
    "dash.oldest.none":    "Geen aanvraag in deze status.",
    "dash.oldest.created": "Aangemaakt op",
    "dash.oldest.age":     "{n} d",

    // ── Statuts ────────────────────────────────────────────────────────────
    "status.nouveau":     "Nieuw",
    "status.en_attente":  "In afwachting",
    "status.planifie":    "Gepland",
    "status.en_cours":    "In uitvoering",
    "status.termine":     "Voltooid",

    // ── Priorités ──────────────────────────────────────────────────────────
    "priority.basse":     "Laag",
    "priority.moyenne":   "Gemiddeld",
    "priority.haute":     "Hoog",

    "delay.asap":         "Zo snel mogelijk",
    "delay.h48":          "Binnen 48 uur",
    "delay.week":         "Binnen de week",
    "delay.month":        "Binnen de maand",

    // ── Équipes ────────────────────────────────────────────────────────────
    "team.magasin":       "Winkel",
    "team.technique":     "Techniek",
    "team.decoration":    "Decoratie",

    // ── Rôles ──────────────────────────────────────────────────────────────
    "role.employee":      "Winkelmedewerker",
    "role.manager":       "Verantwoordelijke",
    "role.collaborator":  "Medewerker",

    // ── Specialisaties ───────────────────────────────────────────────────
    "skill.general":      "Allround",
    "skill.electricite":  "Elektriciteit",
    "skill.plomberie":    "Loodgieterij",
    "skill.equipement":   "Materieel",
    "skill.mise_en_scene": "Presentatie",
    "skill.signalisation": "Signalisatie",

    // ── Demandes (employé) ─────────────────────────────────────────────────
    "emp.newrequest":     "Nieuwe aanvraag",
    "emp.newrequest.sub": "Volg de stappen om uw interventieverzoek te kwalificeren.",
    "emp.waiting.title":  "⚠ Aanvragen in afwachting van informatie",
    "emp.waiting.sub":    "De verantwoordelijke heeft aanvullende informatie nodig voor deze aanvragen.",
    "emp.myrequests":     "Mijn aanvragen",
    "emp.myrequests.sub": "Opvolging van aanvragen aangemaakt vanuit dit profiel.",
    "emp.delay.label":    "Gewenste interventietermijn",
    "emp.title":          "Titel van de aanvraag",
    "emp.title.ph":       "Vat uw aanvraag samen in een paar woorden...",
    "emp.title.required": "De titel van de aanvraag is verplicht.",
    "emp.table.title":    "Titel",
    "emp.table.by":       "Aangevraagd door",
    "emp.table.created":  "Aangemaakt op",
    "emp.table.delay":    "Gewenste termijn",
    "emp.table.status":   "Status",
    "emp.reply.label":    "Uw antwoord / verduidelijking",
    "emp.reply.ph":       "Voeg de gevraagde extra informatie toe...",
    "emp.reply.send":     "Mijn verduidelijking versturen",
    "emp.reply.sent":     "Verduidelijking naar verantwoordelijke verstuurd.",
    "emp.cat":            "Categorie",
    "emp.subcat":         "Subcategorie",
    "emp.precision":      "Precisering",
    "emp.choose":         "-- Kies --",
    "emp.comment":        "Opmerking (optioneel)",
    "emp.comment.ph":     "Beschrijf de locatie, context, urgentie...",
    "emp.photo":          "Foto (verplicht)",
    "emp.photo.required": "Een foto is verplicht om de aanvraag te versturen.",
    "emp.submit":         "Aanvraag versturen",
    "emp.sent":           "Aanvraag verzonden.",

    // ── Demandes (manager) ─────────────────────────────────────────────────
    "mgr.requests.title": "Interventieverzoeken",
    "mgr.requests.sub":   "Plan, wijs toe of stuur elke aanvraag terug naar de medewerker.",
    "mgr.filter.label":   "Filteren:",
    "mgr.filter.all":     "Alle statussen",
    "mgr.assign":         "Toewijzen aan",
    "mgr.unassigned":     "Niet toegewezen",
    "mgr.priority":       "Prioriteit",
    "mgr.date.validated": "Gevalideerde datum",
    "mgr.status":         "Status",
    "mgr.return.msg":     "Bericht voor de medewerker",
    "mgr.return.ph":      "Geef aan welke informatie ontbreekt...",
    "mgr.save":           "Opslaan",
    "mgr.saved":          "Aanvraag bijgewerkt.",
    "mgr.return.btn":     "↩ Terugsturen naar medewerker",
    "mgr.estimated":      "Geschatte duur (u)",
    "mgr.suggest.title":  "Toewijzingssuggestie",
    "mgr.suggest.for":    "Gerichte vaardigheid",
    "mgr.suggest.proposal":"Voorstel",
    "mgr.suggest.none":   "Momenteel geen geschikte medewerker",
  "mgr.assign.type":    "Type toewijzing",
  "mgr.assign.internal":"Interne medewerker",
  "mgr.assign.external":"Externe aannemer",
  "mgr.mail.btn":       "📧 Mail sturen naar aannemer",
  "mgr.assign.week":    "Plannen in agenda (week)",
  "mgr.assign.week.none":"Kies eerst een medewerker om de agenda te zien.",
  "mgr.ask.info":       "Aanvullende info vragen",
  "mgr.ask.info.note.required":"Voeg een bericht toe om extra informatie te vragen.",
  "mgr.ask.info.sent":  "Informatieverzoek naar medewerker verstuurd.",

    // ── Détails ticket ─────────────────────────────────────────────────────
    "ticket.by":          "Aangevraagd door",
    "ticket.desired":     "Gewenste datum",
    "ticket.validated":   "Gevalideerde datum",
    "ticket.assigned":    "Toegewezen aan",
    "ticket.manager":     "Verantwoordelijke",
    "ticket.updated":     "Bijgewerkt",
    "ticket.estimated":   "Geschatte duur",
    "ticket.specialty":   "Vereiste vaardigheid",
    "ticket.intervention.delay": "Gewenste interventietermijn",
    "ticket.return.note": "Bericht van de verantwoordelijke",
    "ticket.employee.reply":"Antwoord van de medewerker",
    "ticket.photo":       "Foto",
    "ticket.unknown":     "Onbekend",
    "ticket.no.manager":  "Geen verantwoordelijke",
    "ticket.empty":       "Geen aanvragen om weer te geven.",
    "ticket.date.tbd":    "Te bepalen",
    "ticket.date.confirm":"Datum te bevestigen",

    // ── Utilisateurs ───────────────────────────────────────────────────────
    "users.title":        "Gebruikersbeheer",
    "users.sub":          "Maak alle profielen in de applicatie aan of verwijder ze.",
    "users.new":          "Nieuwe gebruiker",
    "users.name":         "Naam",
    "users.name.ph":      "Voornaam Achternaam",
    "users.role":         "Rol",
    "users.dept":         "Afdeling",
    "users.skills":       "Vaardigheden",
    "users.skills.edit":  "Vaardigheden bewerken",
    "users.skills.save":  "Vaardigheden opslaan",
    "users.skills.cancel":"Annuleren",
    "users.skills.saved": "Vaardigheden bijgewerkt.",
    "users.skills.catalog":"Vaardighedencatalogus",
    "users.skills.show": "Vaardigheden beheren",
    "users.skills.hide": "Vaardigheden verbergen",
    "users.skills.label": "Naam van de vaardigheid",
    "users.skills.label.ph":"Bijv.: Airconditioning",
    "users.skills.teams": "Toegelaten teams",
    "users.skills.create":"Vaardigheid toevoegen",
    "users.skills.created":"Vaardigheid toegevoegd.",
    "users.skills.deleted":"Vaardigheid verwijderd.",
    "users.skills.exists":"Deze vaardigheid bestaat al.",
    "users.skills.in.use":"Kan niet verwijderen: vaardigheid wordt gebruikt.",
    "users.skills.team.required":"Selecteer minstens één team.",
    "users.password.set":  "Wachtwoord instellen",
    "users.password.change":"Wachtwoord wijzigen",
    "users.password.cancel":"Annuleren",
    "users.password.label":"Nieuw wachtwoord",
    "users.password.ph":   "Minimaal 4 tekens",
    "users.password.save": "Opslaan",
    "users.password.saved":"Wachtwoord opgeslagen.",
    "users.password.none": "Geen wachtwoord",
    "users.create":       "Gebruiker aanmaken",
    "users.created":      "Gebruiker aangemaakt.",
    "users.deleted":      "Profiel verwijderd.",
    "users.none":         "Geen gebruikers in deze groep.",
    "users.delete":       "Verwijderen",
    "users.managers":     "Verantwoordelijken",
    "users.collabs":      "Medewerkers",
    "users.employees":    "Winkelmedewerkers",
    "dept.magasin":       "Winkel",
    "dept.technique":     "Techniek",
    "dept.decoration":    "Decoratie",
    "role.employee.opt":  "Winkelmedewerker",
    "role.collab.opt":    "Medewerker",
    "role.manager.opt":   "Verantwoordelijke",

    // ── Catégories ─────────────────────────────────────────────────────────
    "tree.title":         "Categorieën configureren",
    "tree.sub":           "Definieer de beslissingsboom die medewerkers zien bij het aanmaken van een aanvraag.",
    "tree.label.ph":      "Label",
    "tree.value.ph":      "Waarde (zonder spatie)",
    "tree.add.child":     "+ Subniveau",
    "tree.delete":        "Verwijderen",
    "tree.add.root":      "+ Hoofdcategorie toevoegen",
    "tree.save":          "Opslaan",
    "tree.restore":       "Standaard herstellen",
    "tree.saved":         "Categorieën opgeslagen.",
    "tree.restored":      "Boom hersteld naar standaard.",
    "tree.label":         "Label",
    "tree.value":         "Categoriecode",
    "tree.team":          "Doelteam",
    "tree.specialty":     "Voorgestelde vaardigheid",
    "tree.estimated":     "Geschatte duur (u)",
    "tree.external":      "Gekoppelde aannemer",
    "tree.external.none": "Geen aannemer",
    "tree.details":       "Categoriedetails",
    "tree.new.node":      "Nieuwe categorie",
    "tree.new.root":      "Nieuwe hoofdcategorie",
    "tree.new.child":     "Nieuw subniveau",
    "tree.leaf":          "Blad",
    "tree.keep.one":      "Behoud minstens één hoofdcategorie.",

    // ── Planning ───────────────────────────────────────────────────────────
    "plan.title":              "Medewerkerplanning",
    "plan.collab.all":         "Allen",
    "plan.collab.label":       "Medewerker:",
    "plan.prev":               "← Vorige",
    "plan.today":              "Vandaag",
    "plan.next":               "Volgende →",
    "plan.export":             "Excel exporteren",
    "plan.task.new":           "Nieuwe taak",
    "plan.task.edit":          "Taak bewerken",
    "plan.task.title.label":   "Titel",
    "plan.task.date.label":    "Datum",
    "plan.task.hours.label":   "Geschatte uren",
    "plan.task.photo.label":   "Foto (optioneel)",
    "plan.task.collab.label":  "Medewerker",
    "plan.task.status.label":  "Status",
    "plan.task.notes.label":   "Notities",
    "plan.task.none":          "— Niet toegewezen —",
    "plan.task.notes.ph":      "Optionele beschrijving…",
    "plan.task.save":          "Opslaan",
    "plan.task.create":        "Taak aanmaken",
    "plan.task.delete":        "Verwijderen",
    "plan.task.delete.confirm":"Deze taak verwijderen?",
    "plan.export.empty":       "Geen gegevens om te exporteren voor deze periode.",
    "plan.export.done":        "Export gedownload:",
    "plan.export.unavail":     "Excel-bibliotheek niet beschikbaar.",
    "plan.week.total":         "Week totaal:",

    // ── Collaborateur ──────────────────────────────────────────────────────
    "collab.planning":    "Mijn planning",
    "collab.planning.sub":"Chronologisch overzicht van taken toegewezen aan deze medewerker.",
    "collab.task.none":   "Geen taken toegewezen voor het moment.",
    "collab.task.count":  "taak/taken",
    "collab.start":       "Naar in uitvoering",
    "collab.started":     "Taak naar in uitvoering gezet.",
    "collab.finish":      "Naar voltooid",
    "collab.finished":    "Taak voltooid.",
    "collab.done":        "Markeren als voltooid",
    "collab.marked":      "Taak gemarkeerd als voltooid.",

    // ── Divers ─────────────────────────────────────────────────────────────
    "misc.no.profile":    "Geen profiel voor deze rol.",
      // ── Aannemers ──────────────────────────────────────────────────────────
      "prest.title":        "Externe aannemers",
      "prest.sub":          "Beheer uw externe partners en onderaannemers.",
      "prest.new":          "Nieuwe aannemer",
      "prest.name":         "Naam",
      "prest.company":      "Bedrijf",
      "prest.email":        "E-mail",
      "prest.phone":        "Telefoon",
      "prest.skills":       "Vaardigheden",
      "prest.create":       "Aannemer toevoegen",
      "prest.created":      "Aannemer toegevoegd.",
      "prest.delete":       "Verwijderen",
      "prest.deleted":      "Aannemer verwijderd.",
      "prest.none":         "Geen externe aannemers geregistreerd.",
      "prest.list":         "Geregistreerde aannemers",

      // ── Werflocaties ───────────────────────────────────────────────────────
      "sites.title":        "Werflocaties",
      "sites.sub":          "Definieer de locaties waar medewerkers moeten tussenkomen.",
      "sites.new":          "Nieuwe locatie",
      "sites.name":         "Naam van de locatie",
      "sites.address":      "Adres",
      "sites.notes":        "Notities / toegang",
      "sites.create":       "Locatie toevoegen",
      "sites.created":      "Werflocatie toegevoegd.",
      "sites.delete":       "Verwijderen",
      "sites.deleted":      "Werflocatie verwijderd.",
      "sites.none":         "Geen werflocatie geregistreerd.",
      "sites.list":         "Geregistreerde locaties",
      "emp.site":           "Werflocatie",
      "emp.site.required":  "De werflocatie is verplicht.",
      "emp.site.empty":     "Er is nog geen locatie aangemaakt. Vraag de verantwoordelijke om een werflocatie aan te maken.",
      "ticket.site":        "Werflocatie",

      // ── Noodoproep / Wachtverantwoordelijke ─────────────────────────
      "emp.urgent.title":   "Technische noodoproep",
      "emp.urgent.btn":     "Wachtverantwoordelijke bellen",
      "emp.urgent.oncall":  "Wachtverantwoordelijke:",
      "emp.urgent.none":    "Er is geen wachtverantwoordelijke ingesteld.",
      "oncall.title":       "Wachtverantwoordelijke",
      "oncall.sub":         "Collega die bij een technische noodoproep via Teams gebeld moet worden.",
      "oncall.name":        "Naam",
      "oncall.email":       "E-mail / Teams UPN",
      "oncall.phone":       "Telefoon (optioneel)",
      "oncall.save":        "Opslaan",
      "oncall.saved":       "Wachtverantwoordelijke bijgewerkt.",
      "oncall.clear":       "Verwijderen",
      "oncall.cleared":     "Wachtverantwoordelijke verwijderd.",
      "oncall.email.required": "Het Teams e-mailadres is verplicht.",

    "misc.no.profile.selector": "Geen profiel aangemaakt",
    "misc.add.profile":   "Voeg eerst een profiel toe in het linkerpaneel.",
    "misc.empty":         "Geen aanvragen.",
    "misc.logout":        "Uitloggen",
    "misc.session.active":"Sessie actief voor deze ruimte.",
    "misc.profile.added": "Profiel toegevoegd.",
    "misc.toast.added":   "Profiel toegevoegd.",
  },
};

// ── API publique ───────────────────────────────────────────────────────────────
const LANG_KEY = "famiflora-lang";

function getLang() {
  return localStorage.getItem(LANG_KEY) || "fr";
}

function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  applyStaticTranslations();
  // Déclenche un événement pour que app.js puisse re-rendre
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

function t(key) {
  const lang = getLang();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS["fr"][key] || key;
}

// Applique les traductions sur les éléments avec data-i18n
function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  // Sync bouton de langue
  document.querySelectorAll(".lang-toggle").forEach((btn) => {
    btn.textContent = t("lang.toggle");
    btn.dataset.targetLang = getLang() === "fr" ? "nl" : "fr";
  });
}

// Injecte le bouton de changement de langue dans tous les headers
function injectLangToggle() {
  const lang = getLang();
  const btn = document.createElement("button");
  btn.className = "lang-toggle";
  btn.textContent = t("lang.toggle");
  btn.dataset.targetLang = lang === "fr" ? "nl" : "fr";
  btn.setAttribute("type", "button");
  btn.setAttribute("aria-label", "Changer de langue / Taal wijzigen");

  btn.addEventListener("click", () => {
    setLang(btn.dataset.targetLang);
  });

  // Placement : dans .portal (portail) ou dans .hero-copy (autres pages)
  const heroCopy = document.querySelector(".hero-copy");
  const portal   = document.querySelector(".portal__header");

  if (portal) {
    portal.appendChild(btn);
  } else if (heroCopy) {
    heroCopy.appendChild(btn);
  } else {
    document.body.appendChild(btn);
  }
}

// Init au chargement
document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.lang = getLang();
  injectLangToggle();
  applyStaticTranslations();
});
