# Mobile performance changes

## What changed

- Only the navigation interface for the current viewport is mounted in the DOM. Phones mount the top and bottom navigation; larger screens mount the sidebar.
- The mobile schedule renders one active day at a time instead of the complete week.
- Previous and next day controls switch the visible mobile day and wrap across the active week.
- Mobile free-task and subtask preparation is limited to the visible day.
- Desktop keeps the full week schedule.
- Crossing the 768 px breakpoint swaps navigation interfaces and rebuilds the schedule once.

## Verification

In Chrome DevTools, compare `document.querySelectorAll('*').length` on mobile before and after this change. The schedule should contain one `.day-card` on mobile and all active `.day-card` elements on desktop. Confirm that only `.mobile-top-bar`/`.mobile-bottom-nav` or `.sidebar` exists at a time.