# Animation/UI performance audit

## Changes applied

- Removed the continuously animated 80px blurred authentication-page blobs; equivalent ambient color now uses static radial backgrounds.
- Removed large `backdrop-filter` effects from the authentication card, modal overlay, toast, guide overlay, and fixed mobile navigation. Opaque/translucent backgrounds preserve contrast without live page sampling.
- Reduced the largest static shadows to smaller paint regions.
- Replaced broad `transition: all` declarations with explicit small-component properties.
- Removed the unused `filter` transition from schedule blocks and the brightness filter from subject chips.
- Removed whole-day-card transitions and touch scaling so the schedule grid remains stable. Small controls retain targeted feedback.
- Removed day-card shadow animation from generated schedule exports.
- Added a global `prefers-reduced-motion: reduce` rule using 0.01ms animation and transition durations, and disabled smooth scrolling for reduced-motion users.

## Retained motion

Short transform/opacity entrance effects remain on small dialogs, toasts, pickers, and controls. Spinner rotation and compact progress indicators remain functional. These effects avoid animating box shadows, filters, or large schedule containers.
