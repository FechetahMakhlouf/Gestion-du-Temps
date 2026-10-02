const exportCSS=":root{--bg:#0B1020;--surface:#121A2B;--surface2:#18233A;--border:#293B5A;--border2:#385174;--primary:#6366F1;--primary-light:#818CF8;--info:#38BDF8;--text:#e4edf8;--muted:#5a6e85;--dim:#2e3f55;}*{margin:0;padding:0;box-sizing:border-box;}body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}.page{max-width:1000px;margin:0 auto;padding:2rem 1.5rem 4rem;}.export-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;padding-bottom:1.5rem;margin-bottom:1.75rem;border-bottom:1px solid var(--border);}.logo{font-family:'Amiri',serif;font-size:2.4rem;color:var(--primary-light);text-shadow:0 0 40px color-mix(in srgb,var(--primary-light) 25%,transparent);line-height:1;}.logo-sub{font-size:.7rem;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;margin-top:.3rem;}.gold-line{width:40px;height:1.5px;background:linear-gradient(90deg,var(--primary),transparent);margin:.5rem 0;}.meta-row{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.75rem;}.meta-chip{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:.2rem .65rem;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.7rem;color:var(--muted);}.actions{display:flex;flex-direction:column;gap:.5rem;align-items:flex-end;}.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.65rem 1.1rem;border-radius:10px;font-size:.82rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;text-decoration:none;border:none;transition:all .2s;white-space:nowrap;}.btn-gold{background:linear-gradient(135deg,var(--primary),var(--primary-light));color:var(--bg);box-shadow:0 4px 14px color-mix(in srgb,var(--primary) 28%,transparent);}.btn-gold:hover{transform:translateY(-2px);box-shadow:0 8px 22px color-mix(in srgb,var(--primary) 38%,transparent);}.btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border);}.btn-ghost:hover{border-color:var(--primary);color:var(--primary-light);}.btn svg{flex-shrink:0;}.btn-hint{font-size:.65rem;color:var(--muted);text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;margin-top:.2rem;}.legend{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.5rem;}.legend-item{display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:var(--muted);background:var(--surface);padding:.25rem .6rem;border-radius:6px;border:1px solid var(--border);}.legend-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0;}.days-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;}.day-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;}.day-header{padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);gap:.5rem;}.day-title{display:flex;align-items:center;gap:.6rem;}.day-abbr{font-weight:700;font-size:1rem;color:var(--text);}.day-date{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.78rem;background:var(--surface2);color:var(--muted);padding:.1rem .4rem;border-radius:5px;border:1px solid var(--border);}.day-actions{display:flex;align-items:center;gap:.4rem;}.day-chip{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.6rem;padding:.1rem .4rem;border-radius:4px;background:var(--surface2);color:var(--muted);border:1px solid var(--border);}.print-day-btn,.img-day-btn{display:inline-flex;align-items:center;gap:.3rem;padding:.28rem .6rem;border-radius:7px;font-size:.7rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;border:1px solid var(--border);background:var(--surface2);color:var(--muted);transition:all .18s;white-space:nowrap;}.print-day-btn:hover{border-color:var(--primary);color:var(--primary-light);}.img-day-btn{border-color:color-mix(in srgb,var(--info) 30%,transparent);color:var(--info);background:color-mix(in srgb,var(--info) 8%,transparent);}.img-day-btn:hover{border-color:var(--info);background:color-mix(in srgb,var(--info) 15%,transparent);}.timeline{padding:.65rem;display:flex;flex-direction:column;gap:.3rem;}.block{display:grid;grid-template-columns:64px 1fr;gap:.4rem;align-items:start;}.block-time{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.6rem;color:var(--muted);padding-top:.45rem;line-height:1.35;text-align:right;padding-right:.5rem;border-right:2px solid var(--border);}.block-content{border-radius:8px;padding:.45rem .65rem;font-size:.8rem;line-height:1.4;font-weight:600;}.block-sub{display:block;font-size:.65rem;font-weight:400;opacity:.75;margin-top:.1rem;}.block-empty{border-radius:8px;padding:.45rem .65rem;min-height:36px;background:color-mix(in srgb,var(--border) 30%,transparent)!important;border:1.5px dashed var(--border2)!important;color:var(--dim);font-size:.65rem;display:flex;align-items:center;}.export-footer{margin-top:3rem;text-align:center;font-size:.68rem;color:var(--dim);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}@media print{body{background:#fff!important;color:#111!important;}.page{padding:.5rem!important;}.export-header .actions,.btn-hint,.print-day-btn,.img-day-btn{display:none!important;}.export-header{border-bottom:1px solid #ddd!important;}.logo{color:var(--primary)!important;text-shadow:none!important;}.gold-line{background:var(--primary)!important;}.meta-chip{background:#f5f5f5!important;border:1px solid #ddd!important;color:#666!important;}.legend-item{background:#f5f5f5!important;border:1px solid #ddd!important;color:#555!important;}.days-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))!important;gap:.75rem!important;}.day-card{background:#fff!important;border:1px solid #ddd!important;border-radius:10px!important;break-inside:avoid;}.day-header{border-bottom:1px solid #eee!important;}.day-abbr{color:#111!important;}.day-date{background:#f5f5f5!important;border:1px solid #ddd!important;color:#666!important;}.day-chip{background:#f5f5f5!important;border:1px solid #ddd!important;color:#888!important;}.block-time{color:#888!important;border-right:2px solid #ddd!important;}.block-empty{background:#fafafa!important;border:1.5px dashed #ddd!important;color:#bbb!important;}.export-footer{color:#aaa!important;}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;}}@media(max-width:600px){.export-header{flex-direction:column;}.actions{align-items:stretch;width:100%;}.btn-hint{text-align:left;}.days-grid{grid-template-columns:1fr;}.day-actions{flex-wrap:wrap;}}";async function exportSchedule(){document.getElementById("sidebar").classList.remove("open"),document.body.classList.add("export-mode"),showPanel("export");const p=document.getElementById("export-loading"),g=document.getElementById("export-frame");p&&(p.style.display="flex"),g&&(g.style.display="none");const f=appState.subjects,[l,k,$,m]=await Promise.all([Store.getSchedule(currentWeekOffset),Store.getTimeslots(),Store.getDays(),Store.getUser()]),S=k.slice().sort((r,t)=>r.start.localeCompare(t.start));function M(r,t){const a=parseInt(r.slice(1,3),16),e=parseInt(r.slice(3,5),16),d=parseInt(r.slice(5,7),16);return`rgba(${a},${e},${d},${t})`}const i=new Date;i.setDate(i.getDate()-i.getDay()+currentWeekOffset*7);const D=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"],C=$.map((r,t)=>{const a=D.indexOf(r),e=new Date(i);e.setDate(i.getDate()+(a>=0?a:t));const d=e.getDate();return{abbr:r,dateNum:d,monthStr:["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"][e.getMonth()],dateObj:e}}),b=new Date().toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),u=`jadwal_${m.name.replace(/\s+/g,"_")}_semaine${currentWeekOffset>=0?"+":""}${currentWeekOffset}`;let h="";C.forEach(({abbr:r,dateNum:t,monthStr:a})=>{const e=S.filter(n=>!n.days||n.days.length===0||n.days.includes(r));if(!e.length)return;const d=e.filter(n=>l[`${currentWeekOffset}_${r}_${n.id}`]).length,v=e.length;let c="";e.forEach(n=>{const j=`${currentWeekOffset}_${r}_${n.id}`,w=l[j],o=w?f.find(F=>F.id===w):null;o?c+=`
                <div class="block">
                    <div class="block-time">${n.start}<br>→ ${n.end}</div>
                    <div class="block-content" style="background:${M(o.color,.18)};border-left:3px solid ${o.color};color:${o.color}">
                        <strong>${o.name}</strong>
                        ${o.type?`<span class="block-sub">${o.type}</span>`:""}
                    </div>
                </div>`:c+=`
                <div class="block">
                    <div class="block-time">${n.start}<br>→ ${n.end}</div>
                    <div class="block-empty">—</div>
                </div>`}),h+=`
        <div class="day-card" id="day-${r}">
            <div class="day-header">
                <div class="day-title">
                    <span class="day-abbr">${r}</span>
                    <span class="day-date">${t} ${a}</span>
                </div>
                <div class="day-actions">
                    <span class="day-chip">${d}/${v}</span>
                    <button class="img-day-btn" onclick="saveAsImage('${r}')" title="Sauvegarder en image">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        Image
                    </button>
                </div>
            </div>
            <div class="timeline">${c}</div>
        </div>`});const z=new Set(Object.values(l)),y=f.filter(r=>z.has(r.id)).map(r=>"").join(""),s=document.getElementById("export-frame"),x=document.getElementById("export-loading");s&&(s.srcdoc=`<!DOCTYPE html>\r
<html lang="fr">\r
<head>\r
<meta charset="UTF-8">\r
<meta name="viewport" content="width=device-width, initial-scale=1.0">\r
<title>Emploi du Temps — ${m.name}</title>\r
<link href="https://fonts.googleapis.com/css2?family=Amiri&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">\r
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>\r
<style>${exportCSS}</style>\r
</head>\r
<body>\r
<div class="page">\r
\r
  <div class="export-header">\r
    <div>\r
      <div class="logo">جدول</div>\r
      <div class="gold-line"></div>\r
      <div class="logo-sub">Jadwal — Emploi du Temps</div>\r
      <div class="meta-row">\r
        <span class="meta-chip">👤 ${m.name}</span>\r
        <span class="meta-chip">📅 ${b}</span>\r
        <span class="meta-chip">Semaine ${currentWeekOffset>=0?"+":""}${currentWeekOffset}</span>\r
      </div>\r
    </div>\r
    <div class="actions">\r
      <button class="btn btn-gold" onclick="window.print()">\r
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>\r
        Imprimer la semaine\r
      </button>\r
      <a id="dl-html" class="btn btn-ghost" download="${u}.html">\r
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>\r
        Télécharger HTML\r
      </a>\r
      <div class="btn-hint">Chaque jour : bouton Image 👇</div>\r
    </div>\r
  </div>\r
\r
  ${y?`<div class="legend">${y}</div>`:""}\r
\r
  <div class="days-grid">\r
    ${h}\r
  </div>\r
\r
  <div class="export-footer">Généré par Jadwal · ${b}</div>\r
</div>\r
\r
<script>\r
(function() {\r
  const htmlContent = '<!DOCTYPE html>' + document.documentElement.outerHTML;\r
  const htmlBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });\r
  document.getElementById('dl-html').href = URL.createObjectURL(htmlBlob);\r
})();\r
\r
function printDay(abbr) {\r
  const card = document.getElementById('day-' + abbr);\r
  if (!card) return;\r
  const printWin = window.open('', '_blank', 'width=480,height=700');\r
  const cardHtml = card.outerHTML;\r
  printWin.document.write(\`<!DOCTYPE html>\r
<html><head><meta charset="UTF-8">\r
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">\r
<style>\r
  *{margin:0;padding:0;box-sizing:border-box;}\r
  body{background:#fff;color:#111;font-family:'DM Sans',sans-serif;padding:1.5rem;}\r
  .day-card{border:1px solid #ddd;border-radius:12px;overflow:hidden;max-width:400px;margin:0 auto;}\r
  .day-header{padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;gap:.5rem;}\r
  .day-title{display:flex;align-items:center;gap:.6rem;}\r
  .day-abbr{font-weight:700;font-size:1rem;color:#111;}\r
  .day-date{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.78rem;background:#f5f5f5;color:#666;padding:.1rem .4rem;border-radius:5px;border:1px solid #ddd;}\r
  .day-actions{display:none;}\r
  .day-chip{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.6rem;padding:.1rem .4rem;border-radius:4px;background:#f5f5f5;color:#888;border:1px solid #ddd;}\r
  .timeline{padding:.65rem;display:flex;flex-direction:column;gap:.3rem;}\r
  .block{display:grid;grid-template-columns:64px 1fr;gap:.4rem;align-items:start;}\r
  .block-time{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.6rem;color:#888;padding-top:.45rem;line-height:1.35;text-align:right;padding-right:.5rem;border-right:2px solid #eee;}\r
  .block-content{border-radius:8px;padding:.45rem .65rem;font-size:.8rem;line-height:1.4;font-weight:600;}\r
  .block-sub{display:block;font-size:.65rem;font-weight:400;opacity:.7;margin-top:.1rem;}\r
  .block-empty{border-radius:8px;padding:.45rem .65rem;min-height:36px;background:#fafafa;border:1.5px dashed #ddd;color:#ccc;font-size:.65rem;display:flex;align-items:center;}\r
  .footer{margin-top:1.5rem;text-align:center;font-size:.65rem;color:#bbb;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}\r
</style>\r
</head><body>\r
\${cardHtml}\r
<div class="footer">Jadwal · \${new Date().toLocaleDateString('fr-FR')}</div>\r
</body></html>\`);\r
  printWin.document.close();\r
  printWin.onload = () => { printWin.focus(); printWin.print(); };\r
}\r
\r
async function saveAsImage(abbr) {\r
  const card = document.getElementById('day-' + abbr);\r
  if (!card) return;\r
  if (typeof html2canvas === 'undefined') {\r
    alert('html2canvas non chargé, réessayez dans un instant.');\r
    return;\r
  }\r
  const btn = card.querySelector('.img-day-btn');\r
  if (btn) { btn.textContent = '…'; btn.disabled = true; }\r
  try {\r
    const canvas = await html2canvas(card, { backgroundColor: '#121A2B', scale: 2, useCORS: true, logging: false });\r
    const link = document.createElement('a');\r
    link.download = 'jadwal_' + abbr + '_${u}.png';\r
    link.href = canvas.toDataURL('image/png');\r
    link.click();\r
  } catch(e) {\r
    alert('Erreur lors de la capture : ' + e.message);\r
  } finally {\r
    if (btn) { btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Image'; btn.disabled = false; }\r
  }\r
}\r
<\/script>\r
</body>\r
</html>`,s.onload=()=>{x&&(x.style.display="none"),s.style.display="block"})}
