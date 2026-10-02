function updateAutogenTotal(){const s=document.querySelectorAll("#autogen-grid input[data-subj-id]");let a=0;s.forEach(i=>{a+=parseFloat(i.value)||0});const n=document.getElementById("autogen-total-display");if(!n)return;if(s.length===0){n.innerHTML="";return}const o=window.currentActiveDays?.length||5,e=window._timeslotsHoursPerDay||0,t=o*e,r=t>0&&a>t;n.innerHTML=`
        <div class="autogen-total-inner ${r?"autogen-over":""}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Total demandé : <strong>${a}h / semaine</strong>
            ${t>0?`<span class="autogen-capacity ${r?"over":""}">— capacité : ${t}h${r?" ⚠ dépassement":""}</span>`:""}
        </div>`}async function renderAutogenGrid(){const s=appState.subjects,[a,n]=await Promise.all([Store.getAutogen(),Store.getTimeslots()]);window._timeslotsHoursPerDay=n.reduce((e,t)=>{const[r,i]=t.start.split(":").map(Number),[u,l]=t.end.split(":").map(Number);return e+(u*60+l-(r*60+i))/60},0);const o=document.getElementById("autogen-grid");if(!s.length){o.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-title">Aucune tâche définie</div></div>',updateAutogenTotal();return}o.innerHTML=s.map(e=>{const t=a[e.id]||0;return`
            <div class="autogen-row" style="border-left:3px solid ${e.color}">
                <div class="autogen-row-dot" style="background:${e.color}" aria-hidden="true"></div>
                <span class="autogen-row-name" style="color:${e.color}">${e.name}</span>
                <span class="autogen-row-unit">h/sem</span>
                <input class="form-input" type="number" min="0" max="40" step="0.5"
                       value="${t}"
                       aria-label="Heures par semaine pour ${e.name}"
                       data-subj-id="${e.id}"
                       oninput="updateAutogenTotal()">
            </div>
        `}).join(""),updateAutogenTotal()}async function autoGenerate(){const s=document.querySelectorAll("#autogen-grid .autogen-row"),a={};s.forEach(n=>{const o=n.querySelector("input[data-subj-id]");if(!o)return;const e=o.dataset.subjId,t=parseFloat(o.value)||0;t>0&&(a[e]=t)}),setLoading("autogen-submit",!0);try{await apiCall("/api/autogen",{method:"PUT",body:JSON.stringify(a)}),Store.invalidateAutogen();const n=await apiCall("/api/autogen/generate?weekOffset="+currentWeekOffset,{method:"POST"});Store.invalidateSchedule(currentWeekOffset),document.getElementById("autogen-result").textContent=`✓ Planning généré : ${n.assigned} créneaux assignés.`,toast("Planning généré ✓","success"),showPanel("schedule"),await renderScheduleGrid()}catch(n){toast(n.message,"error")}finally{setLoading("autogen-submit",!1)}}
