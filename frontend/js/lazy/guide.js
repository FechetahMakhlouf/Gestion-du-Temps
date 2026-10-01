/* lazy/guide.js — loaded when the Guide panel is opened
   Classic script: top-level functions stay global so index.html onclick="…" handlers keep working. */

/* ══════════════════════════════════════════════
   GUIDE D'UTILISATION — Données & Logique
══════════════════════════════════════════════ */

const GUIDE_STEPS = [
  {
    id: "welcome",
    icon: "👋",
    title: "Bienvenue sur Jadwal !",
    subtitle: "Votre assistant de planning hebdomadaire.",
    actions: [
      {
        title: "Qu'est-ce que Jadwal ?",
        desc: "Une application pour organiser votre semaine. Définissez vos tâches, vos créneaux horaires, puis générez votre emploi du temps automatiquement. Tout est sauvegardé en temps réel.",
      },
      {
        title: "Par où commencer ?",
        desc: "① Activez vos jours → ② Créez vos créneaux horaires → ③ Ajoutez vos tâches → ④ Générez votre planning.",
      },
    ],
    tip: "<strong>Important :</strong> Commencez toujours par créer vos créneaux horaires. Sans eux, impossible d'assigner des tâches.",
  },
  {
    id: "days",
    icon: "📅",
    title: "Étape 1 — Jours actifs",
    subtitle: "Choisissez les jours qui apparaissent dans votre planning.",
    actions: [
      {
        title: "Où configurer ?",
        desc: 'Dans "Créneaux Horaires", section "Jours affichés" en bas. Cochez les jours souhaités (Lun–Ven, ou plus si besoin).',
      },
      {
        title: "Effet immédiat",
        desc: "Seuls les jours cochés s'affichent dans votre emploi du temps. La modification est sauvegardée instantanément.",
      },
    ],
    tip: "<strong>Exemple :</strong> Pour un étudiant Lun–Ven, cochez uniquement ces cinq jours.",
  },
  {
    id: "timeslots",
    icon: "🕐",
    title: "Étape 2 — Créneaux horaires",
    subtitle: "Définissez vos plages de temps disponibles.",
    actions: [
      {
        title: "Créer un créneau",
        desc: 'Dans "Créneaux Horaires", cliquez "+ Ajouter un créneau". Renseignez l\'heure de début, l\'heure de fin, et cochez les jours concernés.',
      },
      {
        title: "Exemple pratique",
        desc: '"08h–10h" sur Lun, Mar, Jeu ; "14h–16h" sur Mer, Ven. Créez un créneau séparé pour chaque plage unique.',
      },
    ],
    tip: "<strong>Conseil :</strong> Plus vos créneaux sont précis, plus le planning généré sera fidèle à la réalité.",
    warn: "<strong>Attention :</strong> Supprimer un créneau efface toutes ses assignations sur toutes les semaines.",
  },
  {
    id: "subjects",
    icon: "📚",
    title: "Étape 3 — Tâches / Matières",
    subtitle: "Créez les activités à placer dans votre planning.",
    actions: [
      {
        title: "Ajouter une tâche",
        desc: 'Dans "Mes Tâches", cliquez "+ Ajouter une tâche". Donnez-lui un nom (ex: "Maths"), un sous-titre optionnel (ex: "TD") et choisissez une couleur.',
      },
      {
        title: "Modifier ou supprimer",
        desc: "Cliquez sur l'icône ✏️ d'une tâche pour la modifier. La couleur est mise à jour partout dans l'emploi du temps immédiatement.",
      },
    ],
    tip: "<strong>Astuce couleurs :</strong> Utilisez des couleurs contrastées pour distinguer rapidement vos tâches d'un coup d'œil.",
  },
  {
    id: "autogen",
    icon: "⚡",
    title: "Étape 4 — Génération automatique",
    subtitle: "Laissez Jadwal remplir votre planning.",
    actions: [
      {
        title: "Définir les heures par tâche",
        desc: "Dans \"Génération Auto\", saisissez le nombre d'heures par semaine souhaité pour chaque tâche. Le total s'affiche en temps réel. Ne dépassez pas la capacité disponible.",
      },
      {
        title: "Lancer la génération",
        desc: 'Cliquez "⚡ Générer automatiquement". Jadwal remplit les créneaux libres et bascule vers la vue emploi du temps. Les cellules déjà assignées ne sont pas écrasées.',
      },
    ],
    tip: "<strong>Exemple :</strong> 3h Maths + 2h Anglais + 1h Sport → Jadwal remplit 6 créneaux dans l'ordre.",
    warn: "<strong>Note :</strong> La génération ne tient pas compte de vos préférences de jours. Pour un contrôle fin, ajustez manuellement après.",
  },
  {
    id: "schedule",
    icon: "🗓️",
    title: "Étape 5 — Emploi du temps",
    subtitle: "Visualisez et suivez votre semaine.",
    actions: [
      {
        title: "Naviguer entre les semaines",
        desc: 'Utilisez les flèches ← → en haut du planning pour changer de semaine. Le bouton "Aujourd\'hui" ramène à la semaine en cours. Chaque semaine est indépendante.',
      },
      {
        title: "Marquer une tâche comme faite",
        desc: "Cliquez le bouton ○ dans une cellule pour la cocher ✓. Le bouton ↺ en haut d'une colonne remet toute la journée à zéro.",
      },
      {
        title: "Vider la semaine",
        desc: 'Dans "Génération Auto", le bouton "🗑 Vider l\'emploi du temps" efface toutes les assignations de la semaine affichée.',
      },
    ],
    tip: "<strong>Barre de progression :</strong> Elle indique le taux de remplissage de votre semaine. Visez 100% !",
  },
  {
    id: "export",
    icon: "📤",
    title: "Étape 6 — Exporter",
    subtitle: "Sauvegardez ou partagez votre planning.",
    actions: [
      {
        title: "Accéder à l'export",
        desc: 'Dans "Emploi du Temps", cliquez sur "⬇ Exporter" en haut à droite. Votre planning s\'affiche mis en forme.',
      },
      {
        title: "Formats disponibles",
        desc: '<strong>HTML</strong> — fichier à ouvrir dans un navigateur, sans connexion. <strong>CSV</strong> — compatible Excel / Google Sheets. <strong>Imprimer</strong> — ou "Imprimer vers PDF" depuis votre navigateur.',
      },
    ],
    tip: "<strong>Partage :</strong> Envoyez le fichier HTML par email ou WhatsApp. Le destinataire l'ouvre directement sans compte Jadwal.",
  },
  {
    id: "tips",
    icon: "💡",
    title: "Astuces & raccourcis",
    subtitle: "Pour aller plus vite.",
    shortcuts: [
      { key: "Échap", desc: "Fermer un modal" },
      { key: "Clic extérieur", desc: "Fermer un modal" },
      { key: "Entrée", desc: "Valider un formulaire" },
    ],
    actions: [
      {
        title: "Mot de passe oublié ?",
        desc: 'Sur la page de connexion, cliquez "Mot de passe oublié ?". Un lien valable 1h sera envoyé à votre adresse email.',
      },
      {
        title: "Application mobile",
        desc: "Sur téléphone, la navigation est en bas de l'écran. L'interface est entièrement optimisée pour les écrans tactiles.",
      },
    ],
    tip: "<strong>En cas de problème :</strong> Rafraîchissez la page (F5). Vos données sont toujours sauvegardées.",
  },
];

let currentGuideStep = 0;
let completedGuideSteps = new Set();

function renderGuideStepsNav() {
  const nav = document.getElementById("guide-steps-nav");
  if (!nav) return;
  nav.innerHTML = GUIDE_STEPS.map(
    (step, i) => `
        <button class="guide-step-pill ${i === currentGuideStep ? "active" : ""} ${completedGuideSteps.has(i) && i !== currentGuideStep ? "completed" : ""}"
                onclick="goToGuideStep(${i})"
                aria-label="Étape ${i + 1} : ${step.title}">
            <span class="pill-num">${completedGuideSteps.has(i) && i !== currentGuideStep ? "✓" : i + 1}</span>
            ${step.icon}
            <span style="display:none;font-size:0.7rem">${step.title.split("—")[0].trim()}</span>
        </button>
    `,
  ).join("");
}

function renderGuideStepContent() {
  const el = document.getElementById("guide-step-content");
  if (!el) return;
  const step = GUIDE_STEPS[currentGuideStep];

  let bodyHtml = "";

  // Actions list
  if (step.actions && step.actions.length) {
    bodyHtml += `<div class="guide-section-label">Comment faire</div>`;
    bodyHtml += `<div class="guide-actions">`;
    step.actions.forEach((action, i) => {
      bodyHtml += `
                <div class="guide-action">
                    <div class="guide-action-num">${i + 1}</div>
                    <div class="guide-action-content">
                        <div class="guide-action-title">${action.title}</div>
                        <div class="guide-action-desc">${action.desc}</div>
                    </div>
                </div>`;
    });
    bodyHtml += `</div>`;
  }

  // Shortcuts
  if (step.shortcuts && step.shortcuts.length) {
    bodyHtml += `<div class="guide-section-label">Raccourcis clavier</div>`;
    bodyHtml += `<div class="guide-shortcuts">`;
    step.shortcuts.forEach((sc) => {
      bodyHtml += `<div class="guide-shortcut"><kbd>${sc.key}</kbd><span>${sc.desc}</span></div>`;
    });
    bodyHtml += `</div>`;
  }

  // Tip
  if (step.tip) {
    bodyHtml += `
            <div class="guide-tip-box">
                <div class="guide-tip-icon">💡</div>
                <div class="guide-tip-text">${step.tip}</div>
            </div>`;
  }

  // Warning
  if (step.warn) {
    bodyHtml += `
            <div class="guide-warn-box">
                <div class="guide-tip-icon">⚠️</div>
                <div class="guide-warn-text">${step.warn}</div>
            </div>`;
  }

  // Last step: quick nav summary
  if (currentGuideStep === GUIDE_STEPS.length - 1) {
    bodyHtml += `
            <div class="guide-section-label" style="margin-top:0.5rem">Accès rapide aux sections</div>
            <div class="guide-summary-grid">
                <div class="guide-summary-card" onclick="showPanel('schedule');updateMobileNav('schedule')">
                    <div class="guide-summary-icon">🗓️</div>
                    <div class="guide-summary-title">Emploi du Temps</div>
                    <div class="guide-summary-desc">Vue semaine, assignation, suivi</div>
                </div>
                <div class="guide-summary-card" onclick="showPanel('tasks');updateMobileNav('tasks')">
                    <div class="guide-summary-icon">📚</div>
                    <div class="guide-summary-title">Mes Tâches</div>
                    <div class="guide-summary-desc">Créer et gérer vos matières</div>
                </div>
                <div class="guide-summary-card" onclick="showPanel('timeslots');updateMobileNav('timeslots')">
                    <div class="guide-summary-icon">🕐</div>
                    <div class="guide-summary-title">Créneaux Horaires</div>
                    <div class="guide-summary-desc">Plages de temps disponibles</div>
                </div>
                <div class="guide-summary-card" onclick="showPanel('autogen');updateMobileNav('autogen')">
                    <div class="guide-summary-icon">⚡</div>
                    <div class="guide-summary-title">Génération Auto</div>
                    <div class="guide-summary-desc">Planning automatique</div>
                </div>
            </div>`;
  }

  const stepNum = currentGuideStep + 1;
  const totalSteps = GUIDE_STEPS.length;

  el.innerHTML = `
        <div class="guide-step-card">
            <div class="guide-step-header">
                <div class="guide-step-icon">${step.icon}</div>
                <div class="guide-step-meta">
                    <div class="guide-step-num">Étape ${stepNum} / ${totalSteps}</div>
                    <div class="guide-step-title">${step.title}</div>
                    <div class="guide-step-subtitle">${step.subtitle}</div>
                </div>
            </div>
            <div class="guide-step-body">${bodyHtml}</div>
        </div>`;

  // Update nav buttons
  const prevBtn = document.getElementById("guide-prev-btn");
  const nextBtn = document.getElementById("guide-next-btn");
  if (prevBtn) prevBtn.style.display = currentGuideStep === 0 ? "none" : "";
  if (nextBtn) {
    if (currentGuideStep === GUIDE_STEPS.length - 1) {
      nextBtn.textContent = "✓ Terminer le guide";
      nextBtn.onclick = () => {
        showPanel("schedule");
        updateMobileNav("schedule");
        toast("Guide terminé — bon planning ! 🗓️", "success");
      };
    } else {
      nextBtn.textContent = "Suivant →";
      nextBtn.onclick = guideNext;
    }
  }
}

function goToGuideStep(index) {
  completedGuideSteps.add(currentGuideStep);
  currentGuideStep = index;
  renderGuideStepsNav();
  renderGuideStepContent();
  document
    .getElementById("guide-step-content")
    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function guideNext() {
  if (currentGuideStep < GUIDE_STEPS.length - 1) {
    goToGuideStep(currentGuideStep + 1);
  }
}

function guidePrev() {
  if (currentGuideStep > 0) {
    goToGuideStep(currentGuideStep - 1);
  }
}

// ── Invocation overlay for the guide ──────────────────────────────────────
function showGuideInvocation(callback) {
  const overlay = document.createElement("div");
  overlay.id = "guide-invocation-overlay";
  overlay.innerHTML = `
        <div class="giv-card">
            <div class="giv-bismillah">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</div>
            <div class="giv-dua-block">
                <p class="giv-arabic">رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي</p>
                <p class="giv-transliteration">Rabbish-raḥ lī ṣadrī, wa yassir lī amrī, waḥlul ʿuqdatan min lisānī, yafqahū qawlī.</p>
            </div>
            <div class="giv-separator"><span>✦</span></div>
            <div class="giv-dua-block">
                <p class="giv-arabic">اللَّهُمَّ لاَ سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الحَزْنَ إِذَا شِئْتَ سَهْلًا</p>
                <p class="giv-transliteration">Allāhumma lā sahla illā mā jaʿaltahu sahlan, wa anta tajʿalul-ḥazna idhā shiʾta sahlā.</p>
            </div>
            <button class="giv-btn" id="giv-start-btn">Commencer le guide →</button>
        </div>`;
  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => overlay.classList.add("giv-visible"));

  document.getElementById("giv-start-btn").addEventListener("click", () => {
    overlay.classList.remove("giv-visible");
    overlay.classList.add("giv-hiding");
    setTimeout(() => {
      overlay.remove();
      callback();
    }, 500);
  });
}


/** Entry point called by showPanel('guide'). */
function openGuide() {
  currentGuideStep = 0;
  completedGuideSteps = new Set();
  showGuideInvocation(() => {
    renderGuideStepsNav();
    renderGuideStepContent();
  });
}
