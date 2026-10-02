/* lazy/export.js — loaded on first export
   Classic script: top-level functions stay global so index.html onclick="…" handlers keep working. */

/* ══════════════════════════════════════════════
   EXPORT
══════════════════════════════════════════════ */

const exportCSS = `:root{--bg:#060a10;--surface:#0d1420;--surface2:#131c2e;--border:#1a2840;--border2:#243650;--text:#e4edf8;--muted:#5a6e85;--dim:#2e3f55;--gold:#c9972a;--gold-l:#e8b84b;}*{margin:0;padding:0;box-sizing:border-box;}body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}.page{max-width:1000px;margin:0 auto;padding:2rem 1.5rem 4rem;}.export-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;padding-bottom:1.5rem;margin-bottom:1.75rem;border-bottom:1px solid var(--border);}.logo{font-family:'Amiri',serif;font-size:2.4rem;color:var(--gold-l);text-shadow:0 0 40px rgba(232,184,75,.25);line-height:1;}.logo-sub{font-size:.7rem;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;margin-top:.3rem;}.gold-line{width:40px;height:1.5px;background:linear-gradient(90deg,var(--gold),transparent);margin:.5rem 0;}.meta-row{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.75rem;}.meta-chip{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:.2rem .65rem;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.7rem;color:var(--muted);}.actions{display:flex;flex-direction:column;gap:.5rem;align-items:flex-end;}.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.65rem 1.1rem;border-radius:10px;font-size:.82rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;text-decoration:none;border:none;transition:all .2s;white-space:nowrap;}.btn-gold{background:linear-gradient(135deg,#c9972a,#e8b84b);color:#07090d;box-shadow:0 4px 14px rgba(201,151,42,.28);}.btn-gold:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(201,151,42,.38);}.btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border);}.btn-ghost:hover{border-color:var(--gold);color:var(--gold-l);}.btn svg{flex-shrink:0;}.btn-hint{font-size:.65rem;color:var(--muted);text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;margin-top:.2rem;}.legend{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.5rem;}.legend-item{display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:var(--muted);background:var(--surface);padding:.25rem .6rem;border-radius:6px;border:1px solid var(--border);}.legend-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0;}.days-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;}.day-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;}.day-header{padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);gap:.5rem;}.day-title{display:flex;align-items:center;gap:.6rem;}.day-abbr{font-weight:700;font-size:1rem;color:var(--text);}.day-date{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.78rem;background:var(--surface2);color:var(--muted);padding:.1rem .4rem;border-radius:5px;border:1px solid var(--border);}.day-actions{display:flex;align-items:center;gap:.4rem;}.day-chip{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.6rem;padding:.1rem .4rem;border-radius:4px;background:var(--surface2);color:var(--muted);border:1px solid var(--border);}.print-day-btn,.img-day-btn{display:inline-flex;align-items:center;gap:.3rem;padding:.28rem .6rem;border-radius:7px;font-size:.7rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;border:1px solid var(--border);background:var(--surface2);color:var(--muted);transition:all .18s;white-space:nowrap;}.print-day-btn:hover{border-color:var(--gold);color:var(--gold-l);}.img-day-btn{border-color:rgba(31,111,235,.3);color:#58a6ff;background:rgba(31,111,235,.08);}.img-day-btn:hover{border-color:#58a6ff;background:rgba(31,111,235,.15);}.timeline{padding:.65rem;display:flex;flex-direction:column;gap:.3rem;}.block{display:grid;grid-template-columns:64px 1fr;gap:.4rem;align-items:start;}.block-time{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.6rem;color:var(--muted);padding-top:.45rem;line-height:1.35;text-align:right;padding-right:.5rem;border-right:2px solid var(--border);}.block-content{border-radius:8px;padding:.45rem .65rem;font-size:.8rem;line-height:1.4;font-weight:600;}.block-sub{display:block;font-size:.65rem;font-weight:400;opacity:.75;margin-top:.1rem;}.block-empty{border-radius:8px;padding:.45rem .65rem;min-height:36px;background:rgba(26,40,64,.3)!important;border:1.5px dashed var(--border2)!important;color:var(--dim);font-size:.65rem;display:flex;align-items:center;}.export-footer{margin-top:3rem;text-align:center;font-size:.68rem;color:var(--dim);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}@media print{body{background:#fff!important;color:#111!important;}.page{padding:.5rem!important;}.export-header .actions,.btn-hint,.print-day-btn,.img-day-btn{display:none!important;}.export-header{border-bottom:1px solid #ddd!important;}.logo{color:#c9972a!important;text-shadow:none!important;}.gold-line{background:#c9972a!important;}.meta-chip{background:#f5f5f5!important;border:1px solid #ddd!important;color:#666!important;}.legend-item{background:#f5f5f5!important;border:1px solid #ddd!important;color:#555!important;}.days-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))!important;gap:.75rem!important;}.day-card{background:#fff!important;border:1px solid #ddd!important;border-radius:10px!important;break-inside:avoid;}.day-header{border-bottom:1px solid #eee!important;}.day-abbr{color:#111!important;}.day-date{background:#f5f5f5!important;border:1px solid #ddd!important;color:#666!important;}.day-chip{background:#f5f5f5!important;border:1px solid #ddd!important;color:#888!important;}.block-time{color:#888!important;border-right:2px solid #ddd!important;}.block-empty{background:#fafafa!important;border:1.5px dashed #ddd!important;color:#bbb!important;}.export-footer{color:#aaa!important;}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;}}@media(max-width:600px){.export-header{flex-direction:column;}.actions{align-items:stretch;width:100%;}.btn-hint{text-align:left;}.days-grid{grid-template-columns:1fr;}.day-actions{flex-wrap:wrap;}}`;

async function exportSchedule() {
  // Ferme la sidebar sur TOUS les écrans (mobile + desktop)
  document.getElementById("sidebar").classList.remove("open");
  document.body.classList.add("export-mode");
  showPanel("export");
  const exportLoading = document.getElementById("export-loading");
  const exportFrame = document.getElementById("export-frame");
  if (exportLoading) {
    exportLoading.style.display = "flex";
  }
  if (exportFrame) {
    exportFrame.style.display = "none";
  }
  // appState.subjects is always populated after bootstrap — read it directly.
  const subjects = appState.subjects;
  const [sched, timeslots, days, user] = await Promise.all([
    Store.getSchedule(currentWeekOffset),
    Store.getTimeslots(),
    Store.getDays(),
    Store.getUser(),
  ]);

  const sortedSlots = timeslots
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start));

  // Helper: hex to rgba
  function hxAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Compute week dates like renderScheduleGrid does
  const weekStart = new Date();
  weekStart.setDate(
    weekStart.getDate() - weekStart.getDay() + currentWeekOffset * 7,
  );
  const dayOrder = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const weekDays = days.map((abbr, i) => {
    const idx = dayOrder.indexOf(abbr);
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + (idx >= 0 ? idx : i));
    const dateNum = d.getDate();
    const monthNames = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Jun",
      "Jul",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    return { abbr, dateNum, monthStr: monthNames[d.getMonth()], dateObj: d };
  });

  const exportDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const fileName = `jadwal_${user.name.replace(/\s+/g, "_")}_semaine${currentWeekOffset >= 0 ? "+" : ""}${currentWeekOffset}`;

  // Build day-card HTML for each day
  let dayCardsHtml = "";
  weekDays.forEach(({ abbr, dateNum, monthStr }) => {
    const daySlots = sortedSlots.filter(
      (ts) => !ts.days || ts.days.length === 0 || ts.days.includes(abbr),
    );
    if (!daySlots.length) return;

    const filled = daySlots.filter(
      (ts) => sched[`${currentWeekOffset}_${abbr}_${ts.id}`],
    ).length;
    const total = daySlots.length;

    let blocks = "";
    daySlots.forEach((ts) => {
      const key = `${currentWeekOffset}_${abbr}_${ts.id}`;
      const subjId = sched[key];
      const subj = subjId ? subjects.find((s) => s.id === subjId) : null;

      if (subj) {
        blocks += `
                <div class="block">
                    <div class="block-time">${ts.start}<br>→ ${ts.end}</div>
                    <div class="block-content" style="background:${hxAlpha(subj.color, 0.18)};border-left:3px solid ${subj.color};color:${subj.color}">
                        <strong>${subj.name}</strong>
                        ${subj.type ? `<span class="block-sub">${subj.type}</span>` : ""}
                    </div>
                </div>`;
      } else {
        blocks += `
                <div class="block">
                    <div class="block-time">${ts.start}<br>→ ${ts.end}</div>
                    <div class="block-empty">—</div>
                </div>`;
      }
    });

    dayCardsHtml += `
        <div class="day-card" id="day-${abbr}">
            <div class="day-header">
                <div class="day-title">
                    <span class="day-abbr">${abbr}</span>
                    <span class="day-date">${dateNum} ${monthStr}</span>
                </div>
                <div class="day-actions">
                    <span class="day-chip">${filled}/${total}</span>
                    <button class="img-day-btn" onclick="saveAsImage('${abbr}')" title="Sauvegarder en image">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        Image
                    </button>
                </div>
            </div>
            <div class="timeline">${blocks}</div>
        </div>`;
  });

  // Build legend from used subjects
  const usedSubjIds = new Set(Object.values(sched));
  const usedSubjects = subjects.filter((s) => usedSubjIds.has(s.id));
  const legendHtml = usedSubjects.map((s) => ``).join("");

  const exportFrame2 = document.getElementById("export-frame");
  const exportLoading2 = document.getElementById("export-loading");
  if (exportFrame2) {
    exportFrame2.srcdoc = `<!DOCTYPE html>\r\n<html lang="fr">\r\n<head>\r\n<meta charset="UTF-8">\r\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\r\n<title>Emploi du Temps — ${user.name}</title>\r\n<link href="https://fonts.googleapis.com/css2?family=Amiri&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">\r\n<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>\r\n<style>${exportCSS}<\/style>\r\n</head>\r\n<body>\r\n<div class="page">\r\n\r\n  <div class="export-header">\r\n    <div>\r\n      <div class="logo">جدول<\/div>\r\n      <div class="gold-line"><\/div>\r\n      <div class="logo-sub">Jadwal — Emploi du Temps<\/div>\r\n      <div class="meta-row">\r\n        <span class="meta-chip">👤 ${user.name}<\/span>\r\n        <span class="meta-chip">📅 ${exportDate}<\/span>\r\n        <span class="meta-chip">Semaine ${currentWeekOffset >= 0 ? "+" : ""}${currentWeekOffset}<\/span>\r\n      <\/div>\r\n    <\/div>\r\n    <div class="actions">\r\n      <button class="btn btn-gold" onclick="window.print()">\r\n        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"\/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"\/><rect x="6" y="14" width="12" height="8"\/><\/svg>\r\n        Imprimer la semaine\r\n      <\/button>\r\n      <a id="dl-html" class="btn btn-ghost" download="${fileName}.html">\r\n        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"\/><polyline points="7 10 12 15 17 10"\/><line x1="12" y1="15" x2="12" y2="3"\/><\/svg>\r\n        Télécharger HTML\r\n      <\/a>\r\n      <div class="btn-hint">Chaque jour : bouton Image 👇<\/div>\r\n    <\/div>\r\n  <\/div>\r\n\r\n  ${legendHtml ? `<div class="legend">${legendHtml}<\/div>` : ""}\r\n\r\n  <div class="days-grid">\r\n    ${dayCardsHtml}\r\n  <\/div>\r\n\r\n  <div class="export-footer">Généré par Jadwal · ${exportDate}<\/div>\r\n<\/div>\r\n\r\n<script>\r\n(function() {\r\n  const htmlContent = '<!DOCTYPE html>' + document.documentElement.outerHTML;\r\n  const htmlBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });\r\n  document.getElementById('dl-html').href = URL.createObjectURL(htmlBlob);\r\n})();\r\n\r\nfunction printDay(abbr) {\r\n  const card = document.getElementById('day-' + abbr);\r\n  if (!card) return;\r\n  const printWin = window.open('', '_blank', 'width=480,height=700');\r\n  const cardHtml = card.outerHTML;\r\n  printWin.document.write(\`<!DOCTYPE html>\r\n<html><head><meta charset="UTF-8">\r\n<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">\r\n<style>\r\n  *{margin:0;padding:0;box-sizing:border-box;}\r\n  body{background:#fff;color:#111;font-family:'DM Sans',sans-serif;padding:1.5rem;}\r\n  .day-card{border:1px solid #ddd;border-radius:12px;overflow:hidden;max-width:400px;margin:0 auto;}\r\n  .day-header{padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;gap:.5rem;}\r\n  .day-title{display:flex;align-items:center;gap:.6rem;}\r\n  .day-abbr{font-weight:700;font-size:1rem;color:#111;}\r\n  .day-date{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.78rem;background:#f5f5f5;color:#666;padding:.1rem .4rem;border-radius:5px;border:1px solid #ddd;}\r\n  .day-actions{display:none;}\r\n  .day-chip{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.6rem;padding:.1rem .4rem;border-radius:4px;background:#f5f5f5;color:#888;border:1px solid #ddd;}\r\n  .timeline{padding:.65rem;display:flex;flex-direction:column;gap:.3rem;}\r\n  .block{display:grid;grid-template-columns:64px 1fr;gap:.4rem;align-items:start;}\r\n  .block-time{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.6rem;color:#888;padding-top:.45rem;line-height:1.35;text-align:right;padding-right:.5rem;border-right:2px solid #eee;}\r\n  .block-content{border-radius:8px;padding:.45rem .65rem;font-size:.8rem;line-height:1.4;font-weight:600;}\r\n  .block-sub{display:block;font-size:.65rem;font-weight:400;opacity:.7;margin-top:.1rem;}\r\n  .block-empty{border-radius:8px;padding:.45rem .65rem;min-height:36px;background:#fafafa;border:1.5px dashed #ddd;color:#ccc;font-size:.65rem;display:flex;align-items:center;}\r\n  .footer{margin-top:1.5rem;text-align:center;font-size:.65rem;color:#bbb;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}\r\n<\/style>\r\n<\/head><body>\r\n\${cardHtml}\r\n<div class="footer">Jadwal · \${new Date().toLocaleDateString('fr-FR')}<\/div>\r\n<\/body><\/html>\`);\r\n  printWin.document.close();\r\n  printWin.onload = () => { printWin.focus(); printWin.print(); };\r\n}\r\n\r\nasync function saveAsImage(abbr) {\r\n  const card = document.getElementById('day-' + abbr);\r\n  if (!card) return;\r\n  if (typeof html2canvas === 'undefined') {\r\n    alert('html2canvas non chargé, réessayez dans un instant.');\r\n    return;\r\n  }\r\n  const btn = card.querySelector('.img-day-btn');\r\n  if (btn) { btn.textContent = '…'; btn.disabled = true; }\r\n  try {\r\n    const canvas = await html2canvas(card, { backgroundColor: '#0d1420', scale: 2, useCORS: true, logging: false });\r\n    const link = document.createElement('a');\r\n    link.download = 'jadwal_' + abbr + '_${fileName}.png';\r\n    link.href = canvas.toDataURL('image/png');\r\n    link.click();\r\n  } catch(e) {\r\n    alert('Erreur lors de la capture : ' + e.message);\r\n  } finally {\r\n    if (btn) { btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"\/><circle cx="8.5" cy="8.5" r="1.5"\/><polyline points="21 15 16 10 5 21"\/><\/svg> Image'; btn.disabled = false; }\r\n  }\r\n}\r\n<\/script>\r\n<\/body>\r\n<\/html>`;
    exportFrame2.onload = () => {
      if (exportLoading2) exportLoading2.style.display = "none";
      exportFrame2.style.display = "block";
    };
  }
}
