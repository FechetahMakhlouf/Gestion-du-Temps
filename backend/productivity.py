"""
productivity.py — Jadwal Productivity Score Service
=====================================================
Calculates a 0–100 score reflecting weekly schedule *quality*, not task completion.

All scoring weights are defined as constants at the top so they can be tuned
independently without touching the algorithm logic.

Score breakdown
---------------
  1. Planned Hours     — 25 pts  ideal range is 25–40 h/week
  2. Consistency       — 20 pts  low std-dev across active days
  3. Distribution      — 20 pts  work spread over many days
  4. Block Efficiency  — 15 pts  few isolated sessions / many continuous blocks
  5. Subject Variety   — 10 pts  healthy mix of subjects
  6. Workload Balance  — 10 pts  no single subject dominates

Total max = 100 pts, clamped to [0, 100].
"""

import math
from collections import defaultdict
from models import ScheduleEntry, Timeslot, Subject

# ── Scoring Weights (max points per factor) ────────────────────────────────
W_HOURS        = 25   # Planned total hours
W_CONSISTENCY  = 20   # Std-dev of daily hours
W_DISTRIBUTION = 20   # How many days carry work
W_EFFICIENCY   = 15   # Continuous vs. fragmented blocks
W_VARIETY      = 10   # Number of distinct subjects
W_BALANCE      = 10   # Subject dominance ratio

# ── Hours targets ──────────────────────────────────────────────────────────
HOURS_IDEAL_MIN = 25   # below this → proportional penalty
HOURS_IDEAL_MAX = 40   # above this → slight overload penalty
HOURS_OVERLOAD  = 60   # beyond this → score floors at 0

# ── Balance threshold ──────────────────────────────────────────────────────
BALANCE_DOMINANCE_THRESHOLD = 0.60   # one subject > 60 % → penalty starts


# ── Tip generation constants ───────────────────────────────────────────────
TIPS_MIN_HOURS_LOW    = 25
TIPS_MIN_HOURS_HIGH   = 40
TIPS_STD_DEV_HIGH     = 2.5   # hours; if daily std-dev is above this → tip
TIPS_DOMINANCE_RATIO  = 0.55  # subject share above this → variety tip


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def calculate_productivity(user_id: int, week_offset: int) -> dict:
    """
    Main entry point.
    Loads all schedule entries + related timeslots + subjects for the given
    week in a single pass, then delegates to sub-calculators.

    Returns a dict shaped like the API response spec.
    """
    # ── 1. Load raw entries (O(n) single query) ───────────────────────────
    entries = (
        ScheduleEntry.query
        .filter_by(user_id=user_id, week_offset=week_offset)
        .all()
    )

    # ── 2. Load timeslots and subjects by id (one query each) ─────────────
    timeslot_map: dict[str, Timeslot] = {
        ts.id: ts
        for ts in Timeslot.query.filter_by(user_id=user_id).all()
    }
    subject_map: dict[str, Subject] = {
        s.id: s
        for s in Subject.query.filter_by(user_id=user_id).all()
    }

    # ── 3. Build rich entry list ──────────────────────────────────────────
    # Each element: { day, start_min, end_min, duration_h, subject_id }
    rich_entries = _build_rich_entries(entries, timeslot_map)

    # ── 4. Compute component helpers ─────────────────────────────────────
    daily_hours   = calculate_daily_hours(rich_entries)
    subject_dist  = calculate_subject_distribution(rich_entries)
    total_hours   = sum(daily_hours.values())

    # ── 5. Score each factor ─────────────────────────────────────────────
    s_hours        = _score_hours(total_hours)
    s_consistency  = _score_consistency(daily_hours)
    s_distribution = _score_distribution(daily_hours)
    s_efficiency   = calculate_efficiency(rich_entries, daily_hours)
    s_variety      = _score_variety(subject_dist)
    s_balance      = calculate_balance(subject_dist, total_hours)

    total = int(min(100, max(0,
        s_hours + s_consistency + s_distribution +
        s_efficiency + s_variety + s_balance
    )))

    level, emoji = _score_level(total)

    # ── 6. Build human-readable daily hours map ───────────────────────────
    day_order = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    daily_hours_ordered = {
        d: round(daily_hours.get(d, 0), 2)
        for d in day_order
        if d in daily_hours
    }

    # ── 7. Tips ──────────────────────────────────────────────────────────
    tips = _generate_tips(
        total_hours, daily_hours, subject_dist,
        s_consistency, s_efficiency
    )

    return {
        "score":   total,
        "level":   f"{emoji} {level}",
        "details": {
            "hours":        round(s_hours,        1),
            "consistency":  round(s_consistency,  1),
            "distribution": round(s_distribution, 1),
            "efficiency":   round(s_efficiency,   1),
            "variety":      round(s_variety,      1),
            "balance":      round(s_balance,      1),
        },
        "stats": {
            "planned_hours": round(total_hours, 2),
            "daily_hours":   daily_hours_ordered,
        },
        "tips": tips,
        "max": {
            "hours":        W_HOURS,
            "consistency":  W_CONSISTENCY,
            "distribution": W_DISTRIBUTION,
            "efficiency":   W_EFFICIENCY,
            "variety":      W_VARIETY,
            "balance":      W_BALANCE,
        },
    }


def calculate_daily_hours(rich_entries: list) -> dict[str, float]:
    """
    Returns { day_abbr: total_hours } — O(n) over entries.
    Reuse this result wherever daily breakdown is needed.
    """
    daily: dict[str, float] = defaultdict(float)
    for e in rich_entries:
        daily[e['day']] += e['duration_h']
    return dict(daily)


def calculate_subject_distribution(rich_entries: list) -> dict[str, float]:
    """
    Returns { subject_id: total_hours } — O(n) over entries.
    """
    dist: dict[str, float] = defaultdict(float)
    for e in rich_entries:
        dist[e['subject_id']] += e['duration_h']
    return dict(dist)


def calculate_efficiency(rich_entries: list, daily_hours: dict) -> float:
    """
    Measures session continuity — do sessions cluster together or are they
    scattered with big idle gaps?

    Algorithm (per day):
      • Sort sessions by start time.
      • Count transitions where the gap between session end and next start
        is > GAP_THRESHOLD_MIN minutes → that's a "break".
      • efficiency_ratio = 1 − (breaks / total_sessions)
    Returns a score in [0, W_EFFICIENCY].
    """
    GAP_THRESHOLD_MIN = 60  # gaps > 60 min count as "context switches"

    if not rich_entries:
        return 0.0

    # Group sessions by day
    by_day: dict[str, list] = defaultdict(list)
    for e in rich_entries:
        by_day[e['day']].append(e)

    total_sessions = 0
    total_breaks   = 0

    for day, sessions in by_day.items():
        if not sessions:
            continue
        # Sort by start time in minutes
        sessions_sorted = sorted(sessions, key=lambda s: s['start_min'])
        total_sessions += len(sessions_sorted)

        for i in range(1, len(sessions_sorted)):
            prev_end   = sessions_sorted[i - 1]['end_min']
            next_start = sessions_sorted[i]['start_min']
            gap_min    = next_start - prev_end
            if gap_min > GAP_THRESHOLD_MIN:
                total_breaks += 1

    if total_sessions == 0:
        return 0.0

    # Ratio of uninterrupted flow (0 → 1)
    continuity_ratio = 1 - (total_breaks / total_sessions)
    return round(continuity_ratio * W_EFFICIENCY, 2)


def calculate_balance(subject_dist: dict, total_hours: float) -> float:
    """
    Penalises a schedule where one subject takes > BALANCE_DOMINANCE_THRESHOLD
    of all planned hours.

    Returns a score in [0, W_BALANCE].
    """
    if not subject_dist or total_hours == 0:
        return 0.0

    max_share = max(subject_dist.values()) / total_hours

    if max_share <= BALANCE_DOMINANCE_THRESHOLD:
        return float(W_BALANCE)

    # Linear penalty: at 60 % → full score; at 100 % → 0 score
    penalty_range = 1.0 - BALANCE_DOMINANCE_THRESHOLD
    over           = max_share - BALANCE_DOMINANCE_THRESHOLD
    factor         = 1 - (over / penalty_range)
    return round(max(0.0, factor) * W_BALANCE, 2)


# ─────────────────────────────────────────────────────────────────────────────
#  PRIVATE HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _build_rich_entries(entries: list, timeslot_map: dict) -> list:
    """
    Enriches raw ScheduleEntry rows with parsed numeric times.
    Skips entries whose timeslot is missing (orphaned data).
    O(n) — no extra queries.
    """
    result = []
    for e in entries:
        ts = timeslot_map.get(e.timeslot_id)
        if ts is None:
            continue
        start_min = _time_to_min(ts.start)
        end_min   = _time_to_min(ts.end)
        if end_min <= start_min:
            continue  # malformed timeslot
        result.append({
            'day':        e.day,
            'start_min':  start_min,
            'end_min':    end_min,
            'duration_h': (end_min - start_min) / 60.0,
            'subject_id': e.subject_id,
        })
    return result


def _time_to_min(t: str) -> int:
    """'HH:MM' → integer minutes since midnight."""
    h, m = t.split(':')
    return int(h) * 60 + int(m)


def _score_hours(total_hours: float) -> float:
    """
    25–40 h → full W_HOURS
    < 25 h  → proportional (0 h → 0 pts)
    > 40 h  → slight penalty, bottoms at 0 past HOURS_OVERLOAD
    """
    if total_hours <= 0:
        return 0.0

    if HOURS_IDEAL_MIN <= total_hours <= HOURS_IDEAL_MAX:
        return float(W_HOURS)

    if total_hours < HOURS_IDEAL_MIN:
        return round((total_hours / HOURS_IDEAL_MIN) * W_HOURS, 2)

    # Overloaded: linear decay from HOURS_IDEAL_MAX to HOURS_OVERLOAD
    over_range = HOURS_OVERLOAD - HOURS_IDEAL_MAX
    over       = total_hours - HOURS_IDEAL_MAX
    factor     = 1 - (over / over_range)
    return round(max(0.0, factor) * W_HOURS, 2)


def _score_consistency(daily_hours: dict) -> float:
    """
    Low standard deviation of daily hours → high score.
    std_dev = 0    → W_CONSISTENCY pts
    std_dev ≥ MAX  → 0 pts   (linear interpolation between)
    """
    STD_DEV_MAX = 4.0  # hours; beyond this → 0 pts

    if not daily_hours:
        return 0.0

    values = list(daily_hours.values())
    if len(values) < 2:
        return float(W_CONSISTENCY)  # single active day → no inconsistency

    mean    = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    std_dev  = math.sqrt(variance)

    factor = 1 - min(std_dev / STD_DEV_MAX, 1.0)
    return round(factor * W_CONSISTENCY, 2)


def _score_distribution(daily_hours: dict) -> float:
    """
    Reward work spread over many days.
    active_days / 5 (target = 5 active days) → capped at 1.
    """
    TARGET_DAYS = 5

    if not daily_hours:
        return 0.0

    active_days = sum(1 for h in daily_hours.values() if h > 0)
    factor      = min(active_days / TARGET_DAYS, 1.0)
    return round(factor * W_DISTRIBUTION, 2)


def _score_variety(subject_dist: dict) -> float:
    """
    Rewards using multiple subjects.
    1 subject → ~30 % of score
    ≥ VARIETY_TARGET subjects → full score
    """
    VARIETY_TARGET = 4  # 4+ subjects → full variety score

    if not subject_dist:
        return 0.0

    n_subjects = len(subject_dist)
    if n_subjects >= VARIETY_TARGET:
        return float(W_VARIETY)

    # Minimum floor: 30 % even for 1 subject (so score isn't brutally low)
    floor  = 0.30
    factor = floor + (1 - floor) * ((n_subjects - 1) / (VARIETY_TARGET - 1))
    return round(factor * W_VARIETY, 2)


def _score_level(score: int) -> tuple[str, str]:
    """Maps numeric score to label + emoji."""
    if score >= 90:
        return "Excellent",          "🔥"
    if score >= 75:
        return "Très Productif",     "✅"
    if score >= 60:
        return "Bon",                "🙂"
    if score >= 40:
        return "À améliorer",        "⚠️"
    return "Planification insuffisante", "❌"


def _generate_tips(
    total_hours:  float,
    daily_hours:  dict,
    subject_dist: dict,
    s_consistency: float,
    s_efficiency:  float,
) -> list[str]:
    """
    Generates 2–5 personalised improvement tips.
    Each tip targets a specific weakness in the schedule.
    """
    tips = []

    # Hours tips
    if total_hours < TIPS_MIN_HOURS_LOW:
        tips.append(
            "Votre charge est assez légère. Envisagez d'ajouter des sessions "
            "d'étude supplémentaires pour atteindre 25 h/semaine."
        )
    elif total_hours > TIPS_MIN_HOURS_HIGH:
        tips.append(
            "Votre emploi du temps est peut-être trop chargé. Pensez à "
            "intégrer des pauses ou à réduire certains créneaux."
        )

    # Consistency tip (high std-dev across days)
    if daily_hours:
        values  = list(daily_hours.values())
        mean    = sum(values) / len(values)
        std_dev = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values)) \
            if len(values) > 1 else 0
        if std_dev > TIPS_STD_DEV_HIGH:
            tips.append(
                "Essayez de répartir votre charge plus uniformément sur la semaine "
                "pour éviter les journées surchargées et les journées vides."
            )

    # Distribution tip (few active days)
    active_days = sum(1 for h in daily_hours.values() if h > 0)
    if active_days <= 2 and total_hours > 0:
        tips.append(
            "Vos sessions sont concentrées sur peu de jours. Étalez-les sur "
            "davantage de journées pour une meilleure rétention."
        )

    # Efficiency tip (many isolated sessions)
    if s_efficiency < (W_EFFICIENCY * 0.5) and total_hours > 0:
        tips.append(
            "Regroupez vos créneaux consécutifs pour limiter les coupures et "
            "réduire les changements de contexte."
        )

    # Balance tip (subject dominance)
    if subject_dist and total_hours > 0:
        max_share = max(subject_dist.values()) / total_hours
        if max_share > TIPS_DOMINANCE_RATIO:
            tips.append(
                "Un seul sujet domine votre planning. Variez les matières "
                "pour améliorer la mémorisation et l'engagement."
            )

    # Variety tip
    if len(subject_dist) == 1 and total_hours > 0:
        tips.append(
            "Intégrez plusieurs matières dans votre semaine pour bénéficier "
            "d'un apprentissage plus équilibré."
        )

    # Empty schedule tip
    if total_hours == 0:
        tips.append(
            "Votre emploi du temps est vide. Commencez par assigner des tâches "
            "à vos créneaux pour obtenir un score."
        )

    # Clamp: return at most 5 tips, at least 1
    tips = tips[:5]
    if not tips:
        tips = ["Votre planning est bien structuré. Continuez ainsi !"]

    return tips
