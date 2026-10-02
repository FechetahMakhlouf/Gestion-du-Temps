const FM={active:!1,paused:!1,intervalId:null,currentTask:null,notified5min:!1,notifiedStart:!1,shortcutHandler:null,STORAGE_KEY:"jadwal_focus_state",PREFS_KEY:"jadwal_focus_prefs"},FM_DEFAULT_PREFS={darkBackground:!0,largeTypography:!1,hideCountdown:!1,ambientGradient:!0,autoEnter:!1},FM_QUOTES=["Restez concentré.","Chaque minute compte.","Vous êtes capable.","Un pas à la fois.","La régularité crée l'excellence.","Moins de distractions, plus de résultats.","Focalisez-vous sur maintenant.","Le succès est une habitude.","Allez, vous pouvez le faire !","Gardez le cap."];function _randomQuote(){return FM_QUOTES[Math.floor(Math.random()*FM_QUOTES.length)]}function loadFocusPreferences(){try{const t=localStorage.getItem(FM.PREFS_KEY);return t?{...FM_DEFAULT_PREFS,...JSON.parse(t)}:{...FM_DEFAULT_PREFS}}catch{return{...FM_DEFAULT_PREFS}}}function saveFocusPreferences(t){try{localStorage.setItem(FM.PREFS_KEY,JSON.stringify(t))}catch{}}function _timeToMinutes(t){if(!t)return 0;const[e,n]=t.split(":").map(Number);return e*60+(n||0)}function _todayAbbr(){return["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][new Date().getDay()]}async function _fetchTodayTasks(){try{const t=window.appState.subjects,[e,n]=await Promise.all([window.Store.getTimeslots(),window.Store.getSchedule(0)]),i=_todayAbbr(),o=e.filter(s=>!s.days||s.days.length===0||s.days.includes(i)),a=[];for(const s of o){const r=`0_${i}_${s.id}`,c=n[r];if(!c)continue;const d=t.find(u=>u.id===c);d&&a.push({subject:d,timeslot:s,dayAbbr:i,startMin:_timeToMinutes(s.start),endMin:_timeToMinutes(s.end)})}return a.sort((s,r)=>s.startMin-r.startMin),a}catch{return[]}}async function getCurrentTask(){const t=await _fetchTodayTasks(),e=_nowMinutes();return t.find(n=>e>=n.startMin&&e<n.endMin)||null}async function getNextTask(){const t=await _fetchTodayTasks(),e=_nowMinutes();return t.find(n=>n.startMin>e)||null}function _nowMinutes(){const t=new Date;return t.getHours()*60+t.getMinutes()}function _formatHHMM(t){return t||"—"}function _fmtCountdown(t){t<0&&(t=0);const e=Math.floor(t/3600),n=Math.floor(t%3600/60),i=t%60;return`${String(e).padStart(2,"0")}:${String(n).padStart(2,"0")}:${String(i).padStart(2,"0")}`}function _taskProgress(t){const e=new Date().getHours()*3600+new Date().getMinutes()*60+new Date().getSeconds(),n=t.startMin*60,i=t.endMin*60,o=i-n,a=Math.max(0,e-n),s=Math.max(0,i-e),r=o>0?Math.min(100,a/o*100):0;return{totalSec:o,elapsedSec:a,remainSec:s,pct:r}}function renderFocusOverlay(t,e){const n=document.getElementById("focus-overlay");n&&n.remove();const i=loadFocusPreferences(),o=document.createElement("div");if(o.id="focus-overlay",o.setAttribute("role","dialog"),o.setAttribute("aria-modal","true"),o.setAttribute("aria-label","Mode Focus"),i.darkBackground&&o.classList.add("fm-dark"),i.largeTypography&&o.classList.add("fm-large"),i.ambientGradient&&t&&o.classList.add("fm-gradient"),!t)o.innerHTML=_buildEmptyState(e);else{const{remainSec:a,pct:s}=_taskProgress(t),c=new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});o.innerHTML=`
            <div class="fm-inner" role="main">
                <!-- Live clock -->
                <div class="fm-clock" id="fm-clock" aria-live="off">${c}</div>

                <!-- Task info -->
                <div class="fm-task-block">
                    <div class="fm-task-emoji" style="color:${t.subject.color}" aria-hidden="true">
                        ${t.subject.name.match(/^\p{Emoji}/u)?.[0]||"📚"}
                    </div>
                    <div class="fm-task-name" style="border-bottom-color:${t.subject.color}">
                        ${_escHtml(t.subject.name)}
                    </div>
                    <div class="fm-task-type">${_escHtml(t.subject.type||"")}</div>
                    <div class="fm-task-time">
                        <span>${_formatHHMM(t.timeslot.start)}</span>
                        <span class="fm-time-arrow">→</span>
                        <span>${_formatHHMM(t.timeslot.end)}</span>
                    </div>
                </div>

                <!-- Countdown -->
                <div class="fm-countdown-section ${i.hideCountdown?"fm-hidden":""}">
                    <div class="fm-countdown" id="fm-countdown"
                         aria-live="polite" aria-atomic="true">
                        ${_fmtCountdown(a)}
                    </div>
                    <div class="fm-countdown-label">restant</div>
                </div>

                <!-- Progress bar -->
                <div class="fm-progress-wrap" role="progressbar"
                     aria-valuemin="0" aria-valuemax="100"
                     aria-valuenow="${Math.round(s)}"
                     id="fm-progressbar">
                    <div class="fm-progress-track">
                        <div class="fm-progress-fill" id="fm-progress-fill"
                             style="width:${s}%; background:${t.subject.color}"></div>
                    </div>
                    <div class="fm-progress-label">
                        <span id="fm-pct">${Math.round(s)}%</span>
                    </div>
                </div>

                <!-- Motivational quote -->
                <div class="fm-quote" id="fm-quote" aria-live="off">${_randomQuote()}</div>

                <!-- Settings toggle row -->
                <div class="fm-settings-row">
                    <button class="fm-settings-btn" onclick="toggleFocusSettings()"
                            aria-expanded="false" id="fm-settings-toggle"
                            aria-label="Paramètres du mode focus">
                        ⚙ Options
                    </button>
                </div>

                <!-- Settings panel (hidden by default) -->
                <div class="fm-settings-panel" id="fm-settings-panel" hidden>
                    ${_buildSettingsHTML(i)}
                </div>

                <!-- Exit button -->
                <button class="fm-exit-btn" onclick="exitFocusMode()"
                        aria-label="Quitter le mode focus">
                    ✕ Quitter le focus
                </button>
            </div>
        `}document.body.appendChild(o),_trapFocus(o),requestAnimationFrame(()=>o.classList.add("fm-visible"))}function _buildEmptyState(t){let e="";return t?e=`
            <div class="fm-next-task">
                <div class="fm-next-label">Prochaine tâche :</div>
                <div class="fm-next-name" style="color:${t.subject.color}">
                    ${_escHtml(t.subject.name)}
                </div>
                <div class="fm-next-time">à ${_formatHHMM(t.timeslot.start)}</div>
            </div>
        `:e='<div class="fm-free-time">Profitez de votre temps libre !</div>',`
        <div class="fm-inner fm-empty" role="main">
            <div class="fm-empty-icon" aria-hidden="true">🎉</div>
            <div class="fm-empty-title">Aucune tâche active</div>
            <div class="fm-empty-sub">Vous avez terminé pour le moment.</div>
            ${e}
            <button class="fm-exit-btn" onclick="exitFocusMode()"
                    aria-label="Quitter le mode focus">
                ✕ Quitter le focus
            </button>
        </div>
    `}function _buildSettingsHTML(t){const e=(n,i)=>`
        <label class="fm-pref-row">
            <input type="checkbox" class="fm-pref-check"
                   data-pref="${n}"
                   ${t[n]?"checked":""}
                   onchange="applyFocusPref(this)">
            <span>${i}</span>
        </label>
    `;return`
        <div class="fm-settings-title">Préférences du focus</div>
        ${e("darkBackground","☾ Fond sombre")}
        ${e("largeTypography","𝐀 Grande typographie")}
        ${e("hideCountdown","⏱ Masquer le compte à rebours")}
        ${e("ambientGradient","✨ Dégradé ambiant")}
        ${e("autoEnter","▶ Entrer automatiquement au démarrage d'une tâche")}
    `}function updateCountdown(){if(!FM.active||FM.paused||!FM.currentTask)return;const t=FM.currentTask,{remainSec:e,pct:n}=_taskProgress(t),i=document.getElementById("fm-clock");if(i){const c=new Date;i.textContent=c.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}const o=document.getElementById("fm-countdown");o&&(o.textContent=_fmtCountdown(e));const a=document.getElementById("fm-progress-fill"),s=document.getElementById("fm-pct"),r=document.getElementById("fm-progressbar");a&&(a.style.width=n+"%"),s&&(s.textContent=Math.round(n)+"%"),r&&r.setAttribute("aria-valuenow",Math.round(n)),_checkNotifications(e),e<=0&&_advanceToNextTask()}function updateProgress(){updateCountdown()}async function _advanceToNextTask(){cleanupFocusMode(!0),_fireNotification("✅ Tâche terminée !","success");const t=await getCurrentTask();FM.currentTask=t||null,FM.notified5min=!1,FM.notifiedStart=!1;const e=t?null:await getNextTask();renderFocusOverlay(t,e),t&&(_startInterval(),_fireNotification("▶ Votre session de focus a démarré.","info"))}function _checkNotifications(t){FM.notifiedStart||(FM.notifiedStart=!0,_fireNotification("▶ Votre session de focus a démarré.","info")),!FM.notified5min&&t<=300&&t>0&&(FM.notified5min=!0,_fireNotification("⚠ 5 minutes restantes.","info"))}function _fireNotification(t,e="info"){if(typeof Notification<"u"&&Notification.permission==="granted")try{new Notification("Jadwal · Focus",{body:t,icon:"frontend/img/icon-192.png"})}catch{}typeof toast=="function"&&toast(t,e)}function _requestNotifPermission(){typeof Notification<"u"&&Notification.permission==="default"&&Notification.requestPermission().catch(()=>{})}async function enterFocusMode(){if(FM.active)return;_requestNotifPermission(),FM.active=!0,FM.paused=!1,FM.notified5min=!1,FM.notifiedStart=!1,_hideAppUI(),FM.currentTask=await getCurrentTask();const t=FM.currentTask?null:await getNextTask();renderFocusOverlay(FM.currentTask,t),_saveFocusState(!0),registerFocusShortcuts(),FM.currentTask&&_startInterval(),_updateToggleBtn(!0)}async function exitFocusMode(){if(!FM.active)return;FM.active=!1,cleanupFocusMode();const t=document.getElementById("focus-overlay");t&&(t.classList.remove("fm-visible"),setTimeout(()=>t.remove(),300)),_showAppUI(),_saveFocusState(!1),_updateToggleBtn(!1)}async function toggleFocusMode(){FM.active?await exitFocusMode():await enterFocusMode()}function _hideAppUI(){document.body.classList.add("focus-mode-active");const t=document.getElementById("sidebar");t&&t.setAttribute("aria-hidden","true");const e=document.getElementById("mobile-bottom-nav");e&&e.setAttribute("aria-hidden","true")}function _showAppUI(){document.body.classList.remove("focus-mode-active");const t=document.getElementById("sidebar");t&&t.removeAttribute("aria-hidden");const e=document.getElementById("mobile-bottom-nav");e&&e.removeAttribute("aria-hidden")}function registerFocusShortcuts(){FM.shortcutHandler&&document.removeEventListener("keydown",FM.shortcutHandler),FM.shortcutHandler=t=>{if(!["INPUT","TEXTAREA","SELECT"].includes(t.target.tagName))if(t.key==="Escape"&&FM.active)exitFocusMode();else if(t.key===" "&&FM.active){t.preventDefault(),FM.paused=!FM.paused;const e=document.getElementById("fm-countdown");e&&e.classList.toggle("fm-paused",FM.paused)}else(t.key==="f"||t.key==="F")&&!FM.active&&toggleFocusMode()},document.addEventListener("keydown",FM.shortcutHandler)}function cleanupFocusMode(t=!1){FM.intervalId&&(clearInterval(FM.intervalId),FM.intervalId=null),!t&&FM.shortcutHandler&&(document.removeEventListener("keydown",FM.shortcutHandler),FM.shortcutHandler=null)}function _startInterval(){cleanupFocusMode(!0),FM.intervalId=setInterval(updateCountdown,1e3)}function _saveFocusState(t){try{localStorage.setItem(FM.STORAGE_KEY,JSON.stringify({active:t}))}catch{}}async function restoreFocusState(){try{const t=localStorage.getItem(FM.STORAGE_KEY);if(!t)return;JSON.parse(t)?.active&&await enterFocusMode()}catch{}}function toggleFocusSettings(){const t=document.getElementById("fm-settings-panel"),e=document.getElementById("fm-settings-toggle");if(!t)return;const n=t.hidden;t.hidden=!n,e&&e.setAttribute("aria-expanded",n?"true":"false")}function applyFocusPref(t){const e=t.dataset.pref,n=loadFocusPreferences();n[e]=t.checked,saveFocusPreferences(n);const i=document.getElementById("focus-overlay");if(i&&(e==="darkBackground"&&i.classList.toggle("fm-dark",n.darkBackground),e==="largeTypography"&&i.classList.toggle("fm-large",n.largeTypography),e==="ambientGradient"&&i.classList.toggle("fm-gradient",n.ambientGradient),e==="hideCountdown")){const o=i.querySelector(".fm-countdown-section");o&&o.classList.toggle("fm-hidden",n.hideCountdown)}}function _trapFocus(t){const e='button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',n=i=>{if(i.key!=="Tab")return;const o=[...t.querySelectorAll(e)].filter(r=>!r.disabled);if(!o.length)return;const a=o[0],s=o[o.length-1];i.shiftKey&&document.activeElement===a?(i.preventDefault(),s.focus()):!i.shiftKey&&document.activeElement===s&&(i.preventDefault(),a.focus())};t.addEventListener("keydown",n),setTimeout(()=>{const i=t.querySelector(e);i&&i.focus()},100)}function _updateToggleBtn(t){const e=document.getElementById("focus-mode-btn");e&&(e.textContent=t?"✕ Focus":"⏱ Focus",e.classList.toggle("fm-btn-active",t),e.setAttribute("aria-pressed",t?"true":"false"))}function _escHtml(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}window.enterFocusMode=enterFocusMode,window.exitFocusMode=exitFocusMode,window.toggleFocusMode=toggleFocusMode,window.restoreFocusState=restoreFocusState,window.toggleFocusSettings=toggleFocusSettings,window.applyFocusPref=applyFocusPref,window.getCurrentTask=getCurrentTask,window.getNextTask=getNextTask;
