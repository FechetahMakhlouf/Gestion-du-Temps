/* lazy/productivity.js — productivity score card, loaded after first schedule render
   Classic script: top-level functions stay global so index.html onclick="…" handlers keep working. */

/* ══════════════════════════════════════════════════════
   📈 PRODUCTIVITY SCORE
   Fetches score from /api/productivity/<weekOffset>
   and renders the card in the schedule panel.
   Automatically refreshes whenever the schedule changes.
══════════════════════════════════════════════════════ */

/** Max scores per factor — must mirror backend constants */
const PROD_MAX = {
  hours: 25,
  consistency: 20,
  distribution: 20,
  efficiency: 15,
  variety: 10,
  balance: 10,
};

/** Human-readable French labels for each factor */
const PROD_LABELS = {
  hours: "Heures",
  consistency: "Régularité",
  distribution: "Distribution",
  efficiency: "Efficacité",
  variety: "Variété",
  balance: "Équilibre",
};

/**
 * Renders the productivity card for the current week.
 * Called automatically after every schedule mutation and on panel show.
 */
async function renderProductivityCard() {
  // Note: prefer refreshProductivity() (schedule.js), which skips this
  // entirely when the card is already up to date.
  const card = document.getElementById("productivity-card");
  if (!card) return;

  card.style.display = "";

  // Cache hit → paint immediately, no skeleton, no request.
  const cached = Store.peekProductivity(currentWeekOffset);
  if (cached !== undefined) {
    _prodRenderScore(cached);
    return;
  }

  // Cache miss → skeleton while the single request is in flight.
  _prodShowSkeleton();

  let data;
  try {
    data = await Store.getProductivity(currentWeekOffset);
  } catch (e) {
    console.error("Unable to load productivity score", e);
    card.style.display = "none";
    return;
  }

  _prodRenderScore(data);
}

/** Inject skeleton placeholders while the API call is in flight */
function _prodShowSkeleton() {
  const barsEl = document.getElementById("prod-bars");
  const scoreEl = document.getElementById("prod-gauge-score");
  const levelEl = document.getElementById("prod-card-level");
  if (scoreEl) scoreEl.textContent = "…";
  if (levelEl) levelEl.textContent = "";
  if (barsEl)
    barsEl.innerHTML = Object.keys(PROD_MAX)
      .map(
        () =>
          `<div class="prod-bar-row">
            <div class="prod-skeleton" style="height:10px;width:60px;border-radius:4px"></div>
            <div class="prod-skeleton prod-bar-track" style="height:6px"></div>
            <div class="prod-skeleton" style="height:10px;width:32px;border-radius:4px;margin-left:auto"></div>
         </div>`,
      )
      .join("");
}

/** Full render once data is available */
function _prodRenderScore(data) {
  const score = data.score ?? 0;
  const level = data.level ?? "";
  const details = data.details ?? {};
  const tips = data.tips ?? [];
  const max = data.max ?? PROD_MAX;

  // ── Gauge ──────────────────────────────────────────────────────────────
  const scoreEl = document.getElementById("prod-gauge-score");
  const fillEl = document.getElementById("prod-gauge-fill");
  const levelEl = document.getElementById("prod-card-level");

  if (scoreEl) scoreEl.textContent = score;
  if (levelEl) levelEl.textContent = level;

  if (fillEl) {
    const circumference = 2 * Math.PI * 50; // r=50 → 314.16
    const offset = circumference - (score / 100) * circumference;
    // Use requestAnimationFrame so CSS transition triggers
    requestAnimationFrame(() => {
      fillEl.style.strokeDashoffset = offset;
    });

    // Colour tier
    const tier =
      score >= 90
        ? "excellent"
        : score >= 75
          ? "productive"
          : score >= 60
            ? "good"
            : score >= 40
              ? "needs-work"
              : "poor";
    fillEl.setAttribute("data-score-tier", tier);

    // Also colour the level badge
    const levelEl2 = document.getElementById("prod-card-level");
    if (levelEl2) {
      levelEl2.style.color =
        tier === "excellent"
          ? "var(--success)"
          : tier === "productive"
            ? "var(--info)"
            : tier === "good"
              ? "var(--primary-light)"
              : tier === "needs-work"
                ? "var(--primary-light)"
                : "var(--danger)";
    }
  }

  // ── Breakdown bars ─────────────────────────────────────────────────────
  const barsEl = document.getElementById("prod-bars");
  if (barsEl) {
    barsEl.innerHTML = Object.keys(PROD_LABELS)
      .map((key) => {
        const val = details[key] ?? 0;
        const maxVal = max[key] ?? PROD_MAX[key] ?? 10;
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        const label = PROD_LABELS[key];

        // Bar colour reflects fill level
        const barColor =
          pct >= 80
            ? "var(--success)"
            : pct >= 50
              ? "var(--info)"
              : pct >= 30
                ? "var(--primary)"
                : "var(--danger)";

        return `<div class="prod-bar-row">
                <span class="prod-bar-label" title="${label}">${label}</span>
                <div class="prod-bar-track">
                    <div class="prod-bar-fill" style="width:${pct}%;background:${barColor}"></div>
                </div>
                <span class="prod-bar-value">${Math.round(val)}/${maxVal}</span>
            </div>`;
      })
      .join("");
  }

  // ── Tips ───────────────────────────────────────────────────────────────
  const tipsWrap = document.getElementById("prod-tips");
  const tipsList = document.getElementById("prod-tips-list");

  if (tipsWrap && tipsList && tips.length) {
    tipsList.innerHTML = tips.map((t) => `<li>${t}</li>`).join("");
    tipsWrap.style.display = "";
  } else if (tipsWrap) {
    tipsWrap.style.display = "none";
  }
}
