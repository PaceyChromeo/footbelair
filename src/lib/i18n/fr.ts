const fr = {
  // Common
  loading: "Chargement...",
  error: "Erreur",
  back: "Retour",
  cancel: "Annuler",
  confirm: "Confirmer",

  // Auth
  appName: "AAA-BelAir",
  loginSubtitle: "Réserve ta place pour les matchs 6v6",
  loginButton: "Se connecter",
  loginFooter: "Tous les jours à 12h30 · 12 places par match",
  googleLogin: "Connexion Google",
  loginWithGoogle: "Continuer avec Google",
  orDivider: "ou",
  emailLabel: "Email",
  emailPlaceholder: "ton@email.com",
  passwordLabel: "Mot de passe",
  passwordPlaceholder: "Ton mot de passe",
  displayNameLabel: "Nom complet",
  displayNamePlaceholder: "Prénom Nom",
  signupButton: "Créer un compte",
  resetPasswordButton: "Envoyer le lien",
  resetPasswordSent: "Un email de réinitialisation a été envoyé.",
  noAccountYet: "Pas encore de compte ? S'inscrire",
  alreadyHaveAccount: "Déjà un compte ? Se connecter",
  forgotPassword: "Mot de passe oublié ?",
  backToLogin: "Retour à la connexion",
  authErrorInvalidCredentials: "Email ou mot de passe incorrect.",
  authErrorEmailInUse: "Cet email est déjà utilisé.",
  authErrorNameInUse: "Ce nom est déjà utilisé par un autre compte.",
  authErrorWeakPassword: "Le mot de passe doit contenir au moins 6 caractères.",
  authErrorInvalidEmail: "Adresse email invalide.",
  authErrorTooManyRequests: "Trop de tentatives. Réessaie plus tard.",
  authErrorGeneric: "Une erreur est survenue. Réessaie.",
  authErrorCaptcha: "La vérification anti-robot a échoué. Réessaie.",
  emailVerificationSent: "Un email de vérification a été envoyé. Vérifie ta boîte de réception.",
  emailVerificationRequired: "Vérifie ton email",
  emailVerificationMessage: "Un email de vérification a été envoyé à {email}. Clique sur le lien dans l'email pour activer ton compte.",
  resendVerificationEmail: "Renvoyer l'email de vérification",
  verificationEmailResent: "Email de vérification renvoyé !",
  backToLoginFromVerification: "Retour à la connexion",
  logout: "Déconnexion",

  // Header / Nav
  navMatches: "Matchs",
  navAdmin: "Admin",
  penalized: "Pénalisé",
  navProfile: "Mon profil",

  // Week view
  noMatch: "Pas de match",
  cancelled: "Annulé",
  completed: "Terminé",
  full: "Complet",
  spotsAvailable: "Places dispo",
  weekTitle: "{start} - {end}",
  waitingCount: "{count} en attente",
  register: "S'inscrire",
  registered: "Inscrit ✓",
  waitingListPos: "File d'attente #{pos}",
  unregister: "Se désinscrire",
  viewDetails: "Voir détails",
  registeredToast: "Inscrit !",
  unregisteredToast: "Désinscrit",

  // Match detail
  matchNotFound: "Match introuvable",
  players: "Joueurs",
  waitingList: "File d'attente",
  noPlayers: "Aucun joueur inscrit",
  noWaiting: "Personne en attente",

  // Days
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",

  // Admin
  administration: "Administration",
  matchesTab: "Matchs",
  usersTab: "Utilisateurs",
  createWeek: "Créer la semaine",
  weekCreated: "Matchs de la semaine créés",
  noMatchesThisWeek: "Aucun match cette semaine. Cliquez sur \"Créer la semaine\".",
  complete: "Terminer",
  matchCancelled: "Match annulé",
  matchCompleted: "Match terminé, quotas déduits",
  matchReopened: "Match réouvert",
  reopen: "Réouvrir",
  noShow: "No-show",
  declareNoShowTitle: "Déclarer un no-show pour {name} ?",
   noShowDescription: "Le joueur sera banni des inscriptions pendant 2 semaines, puis placé en dernière position des files d'attente pendant 2 semaines supplémentaires (4 semaines au total).",
  confirmNoShow: "Confirmer no-show",
  lateCancellation: "Annulation tardive",
  penaltyApplied: "Pénalité appliquée",
  removePenalty: "Retirer pénalité",
  penaltyRemoved: "Pénalité retirée",
  penalizedUntil: "Pénalisé jusqu'au {date}",
  removeAdmin: "Retirer admin",
  makeAdmin: "Faire admin",
  roleChanged: "Rôle changé en {role}",
  users: "Utilisateurs",
  addPlayer: "Ajouter un joueur",
  removePlayer: "Retirer",
  playerAdded: "{name} ajouté au match",
  playerRemoved: "{name} retiré du match",
  moveToPlayers: "Passer en joueur",
  moveToWaitingList: "Passer en attente",
  movedToPlayers: "{name} déplacé dans les joueurs",
  movedToWaitingList: "{name} déplacé en file d'attente",
  cancelMatchTitle: "Raison de l'annulation",
  cancelReasonNotEnoughPlayers: "Pas assez de joueurs",
  cancelReasonUnplayableField: "Terrain impraticable",
  cancelReasonCustom: "Autre raison",
  cancelReasonCustomPlaceholder: "Décrivez la raison...",
  cancelledNotEnoughPlayers: "Annulé : pas assez de joueurs",
  cancelledUnplayableField: "Annulé : terrain impraticable",
  deleteWeek: "Supprimer la semaine",
  weekDeleted: "Matchs de la semaine supprimés",
  deleteWeekConfirm: "Supprimer tous les matchs de cette semaine ? Cette action est irréversible.",

  // Account approval
  pendingApproval: "En attente d'approbation",
  pendingApprovalMessage: "Ton compte est en attente de validation par un administrateur. Tu peux accéder à ton profil mais pas aux matchs.",
  pendingUsers: "Comptes en attente",
  approvedUsers: "Comptes approuvés",
  approveUser: "Approuver",
  userApproved: "{name} approuvé",
  deleteUser: "Supprimer le compte",
  deleteUserConfirm: "Supprimer le compte de {name} ? Cette action est irréversible.",
  userDeleted: "{name} supprimé",
  noPendingUsers: "Aucun compte en attente",

  // Email notifications
  emailsSent: "{count} email(s) de notification envoyé(s)",
  emailsSendError: "Erreur lors de l'envoi des emails de notification",

  // Language
  language: "Langue",
  langFr: "Français",
  langEn: "English",
  langEs: "Español",
  langHi: "हिन्दी",
  langPt: "Português",
  langAr: "العربية",
  langIt: "Italiano",

  // House Rules
  houseRulesTitle: "Règles de la maison ⚽",
  houseRule1: "On joue uniquement si on est AU MOINS 10 joueurs, 12 max.",
  houseRule2: "Inscris-toi uniquement si tu es sûr de jouer. Ne bloque pas toutes les places pour avoir plus de chances et changer d'avis ensuite. Laissons la chance à plus de personnes de jouer.",
  houseRule3: "Inscris-toi uniquement si tu joueras le MATCH COMPLET D'1 HEURE (12h30 à 13h30)",
  houseRule4: "Paye tes cotisations AAA",
  houseRule5: "Pour toute question, contacte les administrateurs : Ivan Tchomgue & David RODRIGUEZ ROCHA",

  // Nav
  navRules: "Règles",

  // Full House Rules page
  rulesPageTitle: "Règles de la maison ⚽",
  rulesIntro: "Ces règles sont en place pour maintenir un niveau de jeu décent et respectueux pour tous. Si tu as des questions, commentaires ou suggestions, tu peux toujours contacter Ivan ou David.",

  // Section 1 — Subscriptions
  rulesSec1Title: "1. Inscriptions",
  rulesSec1_roster: "La liste de l'application fait foi : seuls les joueurs inscrits dans l'app sont considérés comme participants.",
  rulesSec1_slots: "On joue uniquement si on est AU MOINS 10 joueurs, 12 max.",
  rulesSec1_priority: "La priorité est déterminée par le quota de matchs joués et l'heure d'inscription. Les joueurs ayant joué moins de matchs sont prioritaires, puis c'est le premier inscrit, premier servi.",
  rulesSec1_full: "Inscris-toi uniquement si tu joueras le MATCH COMPLET D'1 HEURE.",

  // Section 2 — Timing
  rulesSec2Title: "2. Horaires",
  rulesSec2_arrive: "Sois sur le terrain à 12h20 si possible. Le match commence à 12h30 pile et se termine à 13h30.",
  rulesSec2_early: "Commencer plus tôt (ex : 12h15) est possible, mais uniquement avec l'accord de tous les joueurs.",

  // Section 3 — Penalties
  rulesSec3Title: "3. Pénalités",
  rulesSec3_intro: "L'application gère les pénalités suivantes :",
  rulesSec3_noshow: "No-show : si tu ne te présentes pas, n'importe quel joueur peut le signaler aux admins. Si c'est confirmé, tu es interdit d'inscription pendant 2 semaines, puis placé dernier en file d'attente pendant 2 semaines supplémentaires (4 semaines au total).",
  rulesSec3_lateCancel: "Annulation tardive : si tu te désinscris moins de 4 heures avant le coup d'envoi, la pénalité est appliquée automatiquement — 2 semaines en file d'attente (mais tu peux quand même jouer si aucune place n'est prise).",

  // Section 4 — Game Rules
  rulesSec4Title: "4. Règles du jeu",
  rulesSec4_throwins: "Touches et corners : ballon au sol. Le défenseur doit laisser assez d'espace pour redémarrer le jeu.",
  rulesSec4_goalkeeper: "Chaque joueur garde les buts pendant 5 minutes. Le dernier arrivé sur le terrain commence, puis les suivants, jusqu'à ce que les 6 joueurs soient passés, puis on recommence. Un joueur sera responsable d'annoncer le changement de gardien toutes les 5 minutes.",
  rulesSec4_goals: "Buts autorisés depuis n'importe où sur le terrain.",
  rulesSec4_balance: "Les équipes peuvent être rééquilibrées si nécessaire.",

  // Section 5 — Fair Play
  rulesSec5Title: "5. Fair-play",
  rulesSec5_spirit: "Bonne humeur, passe le ballon, évite les fautes inutiles, pas de tacles glissés, évite les mains volontaires. Protéger le ballon avec le corps c'est OK, mais ne fais pas de faute qui pourrait blesser quelqu'un. Ce n'est pas un tournoi à 1 million d'euros — on joue pour le plaisir et la santé !",
  rulesSec5_fouls: "Les joueurs faisant des fautes graves recevront un maximum de 2 avertissements. En cas de récidive, la pénalité d'annulation tardive sera appliquée (2 semaines en liste d'attente).",
  rulesSec5_foulTypes: "Les fautes graves incluent : jeu dangereux, tacles glissés, insultes, comportement antisportif, main volontaire.",

  // Section 6 — New Players
  rulesSec6Title: "6. Nouveaux joueurs",
  rulesSec6_process: "Tout nouveau joueur peut s'inscrire lui-même via l'application. Un administrateur examinera l'inscription.",

  // Section 7 — AAA Subscription
  rulesSec7Title: "7. Cotisation AAA",
  rulesSec7_pay: "Paye tes cotisations AAA pour pouvoir jouer.",

  // Section 8 — Contact
rulesSec8Title: "8. Contact",
  rulesSec8_contact: "Pour toute question, commentaire ou suggestion, tu peux contacter Ivan TCHOMGUE MIEGUEM ou David RODRIGUEZ ROCHA via Teams.",
   bannedCannotRegister: "Tu es banni des inscriptions. Le ban se termine le {date}.",
   lateCancelPenaltyApplied: "Pénalité d'annulation tardive appliquée — 2 semaines en file d'attente.",
   reportNoShow: "Signaler un no-show",
   reportNoShowTitle: "Signaler {name} comme no-show ?",
   reportNoShowDescription: "Un email sera envoyé aux administrateurs pour qu'ils puissent vérifier et appliquer la pénalité si nécessaire.",
   reportNoShowSent: "Signalement envoyé aux administrateurs",
   bannedUntil: "Banni jusqu'au {date}",
   profileTitle: "Mon profil",
  profilePhoto: "Photo de profil",
  profileChangePhoto: "Changer la photo",
  profileDisplayName: "Nom complet",
  profileEmail: "Adresse email",
  profilePassword: "Mot de passe",
  profileChangePassword: "Changer le mot de passe",
  profileNewPassword: "Nouveau mot de passe",
  profileConfirmPassword: "Confirmer le nouveau mot de passe",
  profileCurrentPassword: "Mot de passe actuel",
  profilePasswordMismatch: "Les mots de passe ne correspondent pas",
  profileSave: "Enregistrer",
  profileSaved: "Modifications enregistrées",
  profilePhotoUploaded: "Photo mise à jour",
  profilePasswordChanged: "Mot de passe modifié",
  profileReauthRequired: "Session expirée. Déconnecte-toi puis reconnecte-toi avant de modifier l'email",
  profileErrorReauth: "Mot de passe actuel incorrect",

  // Weather
  weatherLinkLabel: "☀️ Météo de la semaine à Villeneuve-Loubet",

  // Email content
  emailSubject: "⚽ Matchs de la semaine ouverts — {weekLabel}",
  emailHeading: "Les matchs de la semaine sont ouverts !",
  emailWeekOf: "Semaine du",
  emailBody: "Les inscriptions sont ouvertes pour les matchs de cette semaine. Réserve ta place dès maintenant — les places partent vite !",
  emailCta: "S'inscrire aux matchs",
  emailWeatherLabel: "🌤️ Météo Villeneuve-Loubet",
  emailWeatherDescription: "Consulte la météo de la semaine pour anticiper les conditions de jeu.",
  emailWeatherLink: "Voir les prévisions →",
  emailFooter: "Tous les jours à 12h30 · 12 places par match",

  // No-show reports
  reportsTab: "Signalements",
  pendingReports: "Signalements en attente",
  noPendingReports: "Aucun signalement en attente",
  confirmReport: "Confirmer et pénaliser",
  confirmReportDescription: "Confirmer ce signalement appliquera une pénalité de no-show à {name}. Cette action est irréversible.",
  dismissReport: "Rejeter",
  reportConfirmed: "Signalement confirmé, pénalité appliquée",
  reportDismissed: "Signalement rejeté",
  reportedBy: "Signalé par {name}",
  reportedPlayer: "Joueur signalé",
  reportMatch: "Match : {day} {date}",
  playerReported: "Joueur signalé",
} as const;

export default fr;
export type TranslationKeys = keyof typeof fr;
