/* modals.js — shared modal behavior and accessible focus management. */

const _modalTriggers = new WeakMap();
const _modalFocusable = [
  "a[href]", "button:not([disabled])", "input:not([disabled])",
  "select:not([disabled])", "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function ensureModal(id) {
  let modal = document.getElementById(id);
  if (modal) return modal;
  const template = document.getElementById("secondary-modals-template");
  const source = template?.content.querySelector("#" + id);
  if (!source) return null;
  modal = source.cloneNode(true);
  document.body.insertBefore(modal, template);
  modal.setAttribute("aria-hidden", "true");
  _modalObserver.observe(modal, { attributes: true, attributeFilter: ["class"] });
  return modal;
}

function closeModal(id) {
  const overlay = ensureModal(id);
  if (!overlay) return;
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  const trigger = _modalTriggers.get(overlay);
  if (trigger?.isConnected) trigger.focus();
}

function openModal(id, trigger = document.activeElement) {
  const overlay = ensureModal(id);
  if (!overlay) return;
  _modalTriggers.set(overlay, trigger);
  overlay.classList.add("open");
  overlay.removeAttribute("aria-hidden");
  requestAnimationFrame(() => {
    const first = overlay.querySelector(_modalFocusable);
    if (first) first.focus();
  });
}

function trapModalFocus(event, overlay) {
  if (event.key !== "Tab") return;
  const focusable = [...overlay.querySelectorAll(_modalFocusable)];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

const _modalObserver = new MutationObserver((mutations) => {
  mutations.forEach(({ target }) => {
    if (!(target instanceof HTMLElement) || !target.classList.contains("modal-overlay")) return;
    if (target.classList.contains("open")) {
      if (!_modalTriggers.has(target)) _modalTriggers.set(target, document.activeElement);
      target.removeAttribute("aria-hidden");
      requestAnimationFrame(() => target.querySelector(_modalFocusable)?.focus());
    }
  });
});

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.setAttribute("aria-hidden", overlay.classList.contains("open") ? "false" : "true");
  _modalObserver.observe(overlay, { attributes: true, attributeFilter: ["class"] });
});

// Close modals with Escape key
// (Focus Mode has its own ESC handler registered via registerFocusShortcuts)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Let focus-mode.js handle ESC when overlay is active
    if (document.getElementById("focus-overlay")) return;
    document.querySelectorAll(".modal-overlay.open").forEach((o) => closeModal(o.id));
    closeEmojiPicker(); // stub until the emoji module is loaded
    return;
  }
  const open = document.querySelector(".modal-overlay.open");
  if (open) trapModalFocus(e, open);
});

// Click outside modal to close
document.addEventListener("click", (e) => {
  const overlay = e.target.closest(".modal-overlay");
  if (overlay && e.target === overlay) closeModal(overlay.id);
});
