/* dashboard.js - render del dashboard y semanas/temas */
(function(global){
  'use strict';
  const { escapeHtml } = { escapeHtml: (s)=> String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) };

  const Dashboard = {
    render(course){
      if(!course) return '<div class="empty">No hay curso activo. Crea uno generando un prompt o importa un JSON.</div>';
      const P = global.ASPProgress;
      const S = global.ASPStorage;
      const counts = P.countTopics(course);
      const { total, done, pendientes, dominados, conceptosAprendidos, totConceptos, practicasHechas, totPracticas, ejerciciosHechos, totEjercicios } = counts;
      const pct = P.percent(course);
      const hrs = P.hours(course);
      const days = P.daysCompleted(course);
      const streak = S.getCourseStreak(course.id, course);

      return `
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div>
          <div class="eyebrow">Dashboard</div>
          <h2 class="section-title m-0" style="font-size:1.6rem">${escapeHtml(course.curso)}</h2>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <span class="badge bg-dark badge-level">${escapeHtml(course.nivel)}</span>
            <span class="badge-soft"><i class="bi bi-calendar3"></i> ${escapeHtml(course.fecha_inicio)}</span>
            <span class="badge-soft"><i class="bi bi-clock"></i> ${escapeHtml(course.duracion)} • ${course.horas_dia}h/día</span>
            ${course.archived?'<span class="badge bg-warning text-dark">Archivado</span>':''}
          </div>
          <p class="text-muted mt-2 mb-0" style="max-width:720px">${escapeHtml(course.descripcion)}</p>
          <p class="mt-1 mb-0"><strong>Objetivo:</strong> ${escapeHtml(course.objetivo)}</p>
        </div>
        <div class="d-flex gap-2 no-print">
          <button class="btn btn-ghost btn-sm" onclick="APP.openEditModal()"><i class="bi bi-pencil-square"></i> Editar</button>
          <button class="btn btn-ghost btn-sm" onclick="APP.exportCourse('json')"><i class="bi bi-filetype-json"></i> JSON</button>
          <button class="btn btn-ghost btn-sm" onclick="APP.exportCourse('csv')"><i class="bi bi-filetype-csv"></i> CSV</button>
          <button class="btn btn-ghost btn-sm" onclick="APP.exportCourse('pdf')"><i class="bi bi-filetype-pdf"></i> PDF</button>
        </div>
      </div>

      <div class="kpi-grid mb-3">
        <div class="kpi"><small>Progreso</small><strong>${pct}%</strong><div class="progress-asp progress-lg"><span style="width:${pct}%"></span></div><span class="hint">${done} de ${total} temas</span></div>
        <div class="kpi"><small>Tiempo</small><strong>${hrs.studied}h / ${hrs.total}h</strong><span class="hint">Restante: ${hrs.remaining}h</span></div>
        <div class="kpi"><small>Días</small><strong>${days.days} / ${days.totalDays}</strong><span class="hint">Días completados</span></div>
        <div class="kpi"><small>Racha del curso</small><strong>${streak} 🔥</strong><span class="hint">${streak===1?'día consecutivo':'días consecutivos'}</span></div>
      </div>

      <div class="kpi-grid mb-3">
        <div class="kpi"><small>Temas dominados</small><strong>${dominados}</strong><span class="hint">de ${total} temas</span></div>
        <div class="kpi"><small>Temas pendientes</small><strong>${pendientes}</strong><span class="hint">por completar</span></div>
        <div class="kpi"><small>Conceptos aprendidos</small><strong>${conceptosAprendidos}<span class="text-muted" style="font-size:1rem">/${totConceptos}</span></strong><span class="hint">tipo concepto</span></div>
        <div class="kpi"><small>Prácticas realizadas</small><strong>${practicasHechas}<span class="text-muted" style="font-size:1rem">/${totPracticas}</span></strong><span class="hint">tipo práctica</span></div>
        <div class="kpi"><small>Ejercicios realizados</small><strong>${ejerciciosHechos}<span class="text-muted" style="font-size:1rem">/${totEjercicios}</span></strong><span class="hint">tipo ejercicio</span></div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-lg-4">
          <div class="card-asp chart-card">
            <div class="d-flex justify-content-between align-items-center mb-2"><strong>Completado</strong><span class="badge-soft">${done}/${total}</span></div>
            <div class="chart-wrap" style="height:200px"><canvas id="chartDone"></canvas></div>
            <div class="d-flex gap-2 mt-2 small text-muted flex-wrap">
              <span><span class="dot dot-green"></span> Completado</span>
              <span><span class="dot" style="background:#e5e7eb"></span> Pendiente (${pendientes})</span>
            </div>
          </div>
        </div>
        <div class="col-lg-8">
          <div class="card-asp chart-card">
            <div class="d-flex justify-content-between align-items-center mb-2"><strong>Avance semanal</strong><span class="badge-soft">%</span></div>
            <div class="chart-wrap"><canvas id="chartWeekly"></canvas></div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-lg-7">
          <div class="card-asp chart-card">
            <div class="d-flex justify-content-between align-items-center mb-2"><strong>Horas por día (registradas)</strong><span class="badge-soft">últimos 14 días</span></div>
            <div class="chart-wrap"><canvas id="chartHours"></canvas></div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="card-asp card-pad">
            <strong><i class="bi bi-calendar-week"></i> Calendario mensual</strong>
            <div class="d-flex gap-2 mt-2 small text-muted"><span class="dot dot-red"></span> No estudió <span class="dot dot-yellow"></span> Parcial <span class="dot dot-green"></span> Cumplido</div>
            <div id="calendarWrap" class="mt-3"></div>
          </div>
        </div>
      </div>

      <div class="card-asp card-pad mb-3">
        <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <strong><i class="bi bi-search"></i> Buscar y filtros</strong>
          <div class="d-flex gap-2 flex-wrap">
            <select id="filterTipo" class="form-select form-select-sm" style="width:auto">
              <option value="">Todo tipo</option><option value="concepto">Concepto</option><option value="practica">Práctica</option><option value="ejercicio">Ejercicio</option>
            </select>
            <select id="filterEstado" class="form-select form-select-sm" style="width:auto">
              <option value="">Todo estado</option><option value="pendiente">Pendientes</option><option value="completado">Completados</option><option value="dominado">Dominados</option>
            </select>
            <select id="filterPri" class="form-select form-select-sm" style="width:auto">
              <option value="">Toda prioridad</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
            </select>
          </div>
        </div>
        <div class="mt-2"><input id="searchInput" class="form-control" placeholder="Buscar conceptos, temas, notas, prácticas... (ej: Docker, flexbox)"></div>
      </div>
      `;
    },

    renderWeeks(course, filter){
      const q = (filter?.q||'').toLowerCase();
      const fTipo = filter?.tipo||'';
      const fEstado = filter?.estado||'';
      const fPri = filter?.pri||'';
      let html='';
      course.semanas.forEach(sem=>{
        const weekDone = sem.dias.every(d=> d.temas.every(t=> t._done||t.estado==='completado'));
        html+=`<div class="card-asp week-card ${weekDone?'done':''} mb-3">
          <div class="p-3 d-flex justify-content-between align-items-start gap-2" style="cursor:pointer" onclick="this.nextElementSibling.classList.toggle('d-none')">
            <div><div class="eyebrow">Semana ${sem.numero}</div><div class="section-title">${escapeHtml(sem.titulo)}</div><div class="text-muted small">${escapeHtml(sem.objetivo)}</div></div>
            <span class="badge-soft">${sem.dias.length} días</span>
          </div>
          <div class="">
            ${sem.dias.map(dia=>{
              const diaDone = dia.temas.every(t=> t._done||t.estado==='completado');
              return `<div class="day-head"><strong>Día ${dia.numero} • ${dia.horas}h</strong><span class="badge ${diaDone?'bg-success':'bg-secondary'}">${dia.temas.length} temas</span></div>
              ${dia.temas.map(t=>{
                // filtros
                if(fTipo && t.tipo!==fTipo) return '';
                if(fPri && t.prioridad!==fPri) return '';
                if(fEstado==='pendiente' && (t._done||t.estado==='completado')) return '';
                if(fEstado==='completado' && !(t._done||t.estado==='completado')) return '';
                if(fEstado==='dominado' && !t.dominado) return '';
                if(q){
                  const hay = [t.titulo,t.tipo,t.notas,t.criterios, ...(t.recursos||[])].join(' ').toLowerCase().includes(q);
                  if(!hay) return '';
                }
                const checked = t._done||t.estado==='completado';
                const titleHl = q? highlight(t.titulo,q): escapeHtml(t.titulo);
                const notasHl = q && t.notas? highlight(t.notas,q): escapeHtml(t.notas||'');
                return `<div class="topic-row">
                  <div class="d-flex gap-2 align-items-start">
                    <input class="form-check-input mt-1" type="checkbox" ${checked?'checked':''} onchange="APP.toggleDone('${t._id}', this.checked)">
                    <div class="flex-grow-1">
                      <div class="d-flex flex-wrap gap-2 align-items-center">
                        <strong style="${checked?'text-decoration:line-through;opacity:.6':''}">${titleHl}</strong>
                        <span class="tag">${escapeHtml(t.tipo)}</span>
                        <span class="tag pri-${t.prioridad}">${escapeHtml(t.prioridad)}</span>
                        ${t.dominado?'<span class="badge bg-success">Dominado</span>':''}
                      </div>
                      <div class="topic-meta mt-1">
                        <span><i class="bi bi-bullseye"></i> ${escapeHtml(t.criterios||'')}</span>
                        ${t.recursos?.length? `<span><i class="bi bi-link-45deg"></i> ${t.recursos.map(r=>`<a href="${escapeHtml(r)}" target="_blank" rel="noopener">${escapeHtml(r)}</a>`).join(', ')}</span>`:''}
                      </div>
                      <div class="d-flex flex-wrap gap-2 mt-2">
                        <label class="d-flex gap-1 align-items-center small"><input type="checkbox" ${t.practicas?'checked':''} onchange="APP.toggleField('${t._id}','practicas',this.checked)"> Práctica</label>
                        <label class="d-flex gap-1 align-items-center small"><input type="checkbox" ${t.ejercicios?'checked':''} onchange="APP.toggleField('${t._id}','ejercicios',this.checked)"> Ejercicio</label>
                        <label class="d-flex gap-1 align-items-center small"><input type="checkbox" ${t._resumen?'checked':''} onchange="APP.toggleField('${t._id}','_resumen',this.checked)"> Resumen</label>
                        <label class="d-flex gap-1 align-items-center small"><input type="checkbox" ${t.dominado?'checked':''} onchange="APP.toggleField('${t._id}','dominado',this.checked)"> Dominado</label>
                        <select class="form-select form-select-sm" style="width:auto" onchange="APP.changeEstado('${t._id}', this.value)">
                          <option value="pendiente" ${t.estado==='pendiente'?'selected':''}>Pendiente</option>
                          <option value="en_progreso" ${t.estado==='en_progreso'?'selected':''}>En progreso</option>
                          <option value="completado" ${t.estado==='completado'?'selected':''}>Completado</option>
                        </select>
                      </div>
                      <div class="mt-2">
                        <label class="small text-muted">Notas</label>
                        <textarea class="form-control form-control-sm" rows="2" placeholder="Escribe tus notas..." oninput="APP.updateNotas('${t._id}', this.value)">${escapeHtml(t.notas||'')}</textarea>
                      </div>
                    </div>
                  </div>
                </div>`;
              }).join('')}
              `;
            }).join('')}
          </div>
        </div>`;
      });
      if(!html) html='<div class="empty">Sin resultados para los filtros/búsqueda.</div>';
      return html;
    },

    renderCalendar(course){
      const now=new Date();
      const y=now.getFullYear(), m=now.getMonth();
      const first=new Date(y,m,1).getDay(); // 0 dom
      const daysInMonth=new Date(y,m+1,0).getDate();
      const stats=global.ASPStorage.getStats();
      const log=stats.studyLog||{};
      const horasDia = course.horas_dia||1;
      let cells=[];
      // empty leading
      for(let i=0;i<first;i++) cells.push(`<div class="cal-cell muted"></div>`);
      for(let d=1; d<=daysInMonth; d++){
        const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const h=log[iso]||0;
        let cls='';
        if(h>=horasDia) cls='green';
        else if(h>0) cls='yellow';
        else {
          // si es futuro, no pintar rojo
          const isFuture = new Date(iso+'T00:00:00') > new Date(new Date().toISOString().slice(0,10)+'T00:00:00');
          cls = isFuture? '': 'red';
        }
        cells.push(`<div class="cal-cell ${cls}" title="${iso}: ${h}h"><span>${d}</span></div>`);
      }
      const weekdays=['D','L','M','M','J','V','S'].map(w=>`<div class="text-center small text-muted fw-bold py-1">${w}</div>`).join('');
      return `<div class="d-flex justify-content-between align-items-center mb-2"><strong>${now.toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</strong><span class="badge-soft">${horasDia}h objetivo/día</span></div>
        <div class="calendar-grid">${weekdays}${cells.join('')}</div>`;
    }
  };

  function highlight(text,q){
    const esc=escapeHtml(text);
    const re=new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'ig');
    return esc.replace(re,'<mark class="search-highlight">$1</mark>');
  }

  global.ASPDashboard = Dashboard;
})(window);
