/* modals.js — open/close helpers, Escape + backdrop handling
   Classic script: top-level functions stay global so index.html onclick="…" handlers keep working. */

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

// Close modals with Escape key
// (Focus Mode has its own ESC handler registered via registerFocusShortcuts)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Let focus-mode.js handle ESC when overlay is active
    if (document.getElementById("focus-overlay")) return;
    document
      .querySelectorAll(".modal-overlay.open")
      .forEach((o) => o.classList.remove("open"));
    closeEmojiPicker(); // stub until the emoji module is loaded
  }
});

// Click outside modal to close
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
});
