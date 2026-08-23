/* app.js - Orquestador SPA (hash routing), pomodoro, eventos, file:// safe */
(function(){
  'use strict';
  const S = window.ASPStorage;
  const P = window.ASPParser;
  const U = window.ASPUtils;
  const PR = window.ASPProgress;
  const D = window.ASPDashboard;
  const CH = window.ASPCharts;

  const els = {};
  let filterState={ q:'', tipo:'', estado:'', pri:'' };
  let pomo={ timer:null, left:25*60, total:25*60, running:false, mode:25 };
  let editTargetId=null;

  function $(id){ return document.getElementById(id); }

  // mostrar errores JS visibles (útil en file:// sin consola)
  window.addEventListener('error', function(e){
    const area=document.getElementById('toastArea');
    if(area){ area.insertAdjacentHTML('beforeend', `<div class="toast show bg-danger text-white border-0"><div class="toast-body small">JS Error: ${e.message} @ ${e.filename.split('/').pop()}:${e.lineno}</div></div>`); }
    console.error(e);
  });

  function init(){
    try{
      if(!S || !P || !U || !PR || !D || !CH){ throw new Error('Módulos no cargados. Verifica rutas js/*.js'); }
      // aplica tema claro/oscuro (data-theme + data-bs-theme)
      S.setTheme(S.getTheme());
      const sw=$('themeSwitch'); if(sw) sw.checked = S.getTheme()==='dark';
      els.topicInput=$('topicInput');
      els.promptBox=$('promptBox');
      els.jsonArea=$('jsonArea');
      els.validationBox=$('validationBox');
      els.coursesGrid=$('coursesGrid');
      els.dashboardWrap=$('dashboardWrap');
      els.weeksWrap=$('weeksWrap');
      bindEvents();
      handleRoute();
      window.addEventListener('hashchange', handleRoute);
      renderCourses();
      updatePomoUI();
      console.log('[AI Study Planner] inicializado');
    }catch(err){
      console.error(err);
      const box=document.getElementById('validationBox') || document.getElementById('dashboardWrap') || document.body;
      if(box) box.insertAdjacentHTML('afterbegin', `<div class="alert alert-danger">Error inicializando: ${err.message}</div>`);
    }
  }

  function bindEvents(){
    $('btnGeneratePrompt')?.addEventListener('click', generatePrompt);
    $('topicInput')?.addEventListener('input', U.debounce(generatePrompt, 300));
    document.querySelectorAll('[data-chip]').forEach(ch=> ch.addEventListener('click', ()=>{
      $('topicInput').value = ch.dataset.chip;
      generatePrompt();
    }));
    $('btnCopyPrompt')?.addEventListener('click', ()=>{
      const txt=$('promptBox').textContent.trim();
      if(!txt || txt.includes('Escribe un tema')) return toast('Genera un prompt primero','warning');
      U.copy(txt).then(()=> toast('Prompt copiado al portapapeles','success'));
    });
    $('btnValidate')?.addEventListener('click', validateAndSave);
    $('btnClearJson')?.addEventListener('click', ()=>{ $('jsonArea').value=''; $('validationBox').innerHTML=''; });
    $('btnLoadSample')?.addEventListener('click', loadSample);
    // courses
    $('btnNewCourse')?.addEventListener('click', ()=> location.hash='#home');
    // backup
    $('btnBackup')?.addEventListener('click', ()=>{
      U.download('backup-ai-study-planner.json', S.exportBackup(), 'application/json');
      toast('Backup descargado','success');
    });
    $('backupFile')?.addEventListener('change', (e)=>{
      const f=e.target.files[0]; if(!f) return;
      const r=new FileReader(); r.onload=()=>{
        try{ S.importBackup(r.result); toast('Backup restaurado','success'); renderCourses(); handleRoute(); }catch(err){ toast(err.message,'danger'); }
      }; r.readAsText(f);
    });
    // theme
    $('themeSwitch')?.addEventListener('change', e=>{
      const t=e.target.checked?'dark':'light';
      S.setTheme(t);
      // los gráficos usan paleta según tema: re-render si el dashboard está visible
      if(location.hash==='#dashboard') renderDashboard();
    });
    // sidebar mobile
    $('btnMenu')?.addEventListener('click', ()=>{
      $('sidebar').classList.toggle('open');
      $('backdrop').classList.toggle('show');
    });
    $('backdrop')?.addEventListener('click', ()=>{
      $('sidebar').classList.remove('open');
      $('backdrop').classList.remove('show');
    });
    // pomodoro
    $('pomo25')?.addEventListener('click', ()=> setPomo(25));
    $('pomo50')?.addEventListener('click', ()=> setPomo(50));
    $('pomoCustom')?.addEventListener('click', ()=>{
      const v=Number($('pomoInput').value);
      if(!v || v<1 || v>180) return toast('Minutos inválidos (1-180)','warning');
      setPomo(v);
    });
    $('pomoStart')?.addEventListener('click', pomoStart);
    $('pomoPause')?.addEventListener('click', pomoPause);
    $('pomoReset')?.addEventListener('click', pomoReset);
    // editar curso
    $('btnSaveEdit')?.addEventListener('click', ()=> window.APP.saveCourseEdit());
    // filtros delegados (se re-bindean tras render)
  }

  function handleRoute(){
    const hash=location.hash.replace('#','')||'home';
    document.querySelectorAll('[data-view]').forEach(v=> v.classList.add('d-none'));
    const target=$('view-'+hash);
    if(target) target.classList.remove('d-none');
    else $('view-home').classList.remove('d-none');
    // active nav
    document.querySelectorAll('[data-nav]').forEach(a=> a.classList.toggle('active', a.dataset.nav===hash));
    if(hash==='dashboard') renderDashboard();
    if(hash==='cursos') renderCourses();
    if(hash==='import') $('jsonArea')?.focus();
  }

  function generatePrompt(){
    const topic = $('topicInput')?.value?.trim() || '';
    const box=$('promptBox');
    if(!topic){
      box.textContent='Escribe un tema arriba para generar el Prompt Maestro...';
      return;
    }
    box.textContent = U.buildPrompt(topic);
  }

  function validateAndSave(){
    const raw=$('jsonArea').value.trim();
    const box=$('validationBox');
    if(!raw){ box.innerHTML='<div class="alert alert-warning py-2">Pega un JSON primero.</div>'; return; }
    const res=P.validate(raw);
    if(!res.ok){
      box.innerHTML=`<div class="alert alert-danger"><strong>JSON inválido</strong><pre class="mb-0 mt-2 small" style="white-space:pre-wrap">${U.escapeHtml(P.formatErrors(res.errors))}</pre></div>`;
      return;
    }
    try{
      const course=S.create(res.data, { merge:true });
      const msg = course._merged
        ? `♻️ Curso "<strong>${U.escapeHtml(course.curso)}</strong>" actualizado sin perder tu progreso.`
        : `✅ Curso "<strong>${U.escapeHtml(course.curso)}</strong>" importado correctamente.`;
      box.innerHTML=`<div class="alert alert-success">${msg} Redirigiendo...</div>`;
      renderCourses();
      setTimeout(()=> location.hash='#dashboard', 700);
    }catch(e){
      box.innerHTML=`<div class="alert alert-warning">${U.escapeHtml(e.message)}</div>`;
    }
  }

  function loadSample(){
    const sample={
      curso:"Arquitectura de Software",
      descripcion:"Plan completo para dominar arquitectura de software moderna.",
      duracion:"4 semanas",
      horas_dia:2,
      objetivo:"Diseñar sistemas escalables, aplicar patrones y tomar decisiones arquitectónicas.",
      nivel:"Intermedio",
      fecha_inicio:new Date().toISOString().slice(0,10),
      semanas:[
        { numero:1, titulo:"Fundamentos", objetivo:"Principios SOLID y estilos arquitectónicos", dias:[
          { numero:1, horas:2, temas:[
            { titulo:"Principios SOLID", tipo:"concepto", prioridad:"alta", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Explicar cada principio con ejemplo", recursos:["https://refactoring.guru"] },
            { titulo:"Estilos: Monolito vs Microservicios", tipo:"concepto", prioridad:"media", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Comparar pros/contras", recursos:["https://martinfowler.com"] }
          ]},
          { numero:2, horas:2, temas:[
            { titulo:"Diagramar C4 - Nivel 1 y 2", tipo:"practica", prioridad:"alta", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Crear diagrama C4 de un e-commerce", recursos:["https://c4model.com"] }
          ]},
          { numero:3, horas:2, temas:[
            { titulo:"Ejercicios: identificar code smells", tipo:"ejercicio", prioridad:"media", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Refactorizar 3 ejemplos", recursos:[] }
          ]},
          { numero:4, horas:2, temas:[
            { titulo:"Patrones Creacionales", tipo:"concepto", prioridad:"alta", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Implementar Singleton y Factory", recursos:[] }
          ]},
          { numero:5, horas:2, temas:[
            { titulo:"Mini proyecto: diseñar catálogo", tipo:"practica", prioridad:"alta", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Entregar diagrama y justificación", recursos:[] }
          ]}
        ]},
        { numero:2, titulo:"Patrones y Comunicación", objetivo:"Patrones estructurales y mensajería", dias:[
          { numero:1, horas:2, temas:[{ titulo:"Patrones Estructurales", tipo:"concepto", prioridad:"alta", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Adapter vs Decorator", recursos:[] }]},
          { numero:2, horas:2, temas:[{ titulo:"Event-Driven y colas", tipo:"concepto", prioridad:"alta", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Explicar eventual consistency", recursos:[] }]},
          { numero:3, horas:2, temas:[{ titulo:"Práctica: API Gateway", tipo:"practica", prioridad:"media", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Configurar gateway simple", recursos:[] }]},
          { numero:4, horas:2, temas:[{ titulo:"Ejercicio: diseñar notificaciones", tipo:"ejercicio", prioridad:"media", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Diagrama de secuencia", recursos:[] }]},
          { numero:5, horas:2, temas:[{ titulo:"Repaso y quiz", tipo:"ejercicio", prioridad:"baja", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"80% aciertos", recursos:[] }]}
        ]},
        { numero:3, titulo:"Escalabilidad", objetivo:"Cache, BD y observabilidad", dias:[
          { numero:1, horas:2, temas:[{ titulo:"Escalado horizontal y cache", tipo:"concepto", prioridad:"alta", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Estrategias de cache", recursos:[] }]},
          { numero:2, horas:2, temas:[{ titulo:"Bases SQL vs NoSQL", tipo:"concepto", prioridad:"media", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Elegir BD para 3 casos", recursos:[] }]},
          { numero:3, horas:2, temas:[{ titulo:"Práctica: diseñar alta disponibilidad", tipo:"practica", prioridad:"alta", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Diagrama HA", recursos:[] }]},
          { numero:4, horas:2, temas:[{ titulo:"Observabilidad: logs, métricas, traces", tipo:"concepto", prioridad:"media", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Definir 3 SLIs", recursos:[] }]},
          { numero:5, horas:2, temas:[{ titulo:"Ejercicio final: caso real", tipo:"ejercicio", prioridad:"alta", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Propuesta arquitectónica completa", recursos:[] }]}
        ]},
        { numero:4, titulo:"Proyecto Final", objetivo:"Integrar todo lo aprendido", dias:[
          { numero:1, horas:2, temas:[{ titulo:"Definir proyecto e-commerce", tipo:"practica", prioridad:"alta", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Documento de requisitos", recursos:[] }]},
          { numero:2, horas:2, temas:[{ titulo:"Arquitectura y diagramas C4", tipo:"practica", prioridad:"alta", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Entregar C4 completo", recursos:[] }]},
          { numero:3, horas:2, temas:[{ titulo:"ADR - decisiones", tipo:"concepto", prioridad:"media", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"3 ADRs escritos", recursos:[] }]},
          { numero:4, horas:2, temas:[{ titulo:"Presentación y defensa", tipo:"ejercicio", prioridad:"media", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Pitch 10 min", recursos:[] }]},
          { numero:5, horas:2, temas:[{ titulo:"Retrospectiva y plan continuo", tipo:"concepto", prioridad:"baja", estado:"pendiente", dominado:false, notas:"", practicas:false, ejercicios:false, criterios:"Plan de mejora", recursos:[] }]}
        ]}
      ]
    };
    $('jsonArea').value = JSON.stringify(sample, null, 2);
    $('validationBox').innerHTML='<div class="alert alert-info py-2">Ejemplo cargado. Pulsa <strong>Validar e Importar</strong>.</div>';
  }

  // Dashboard
  function renderDashboard(){
    const course=S.getActive();
    const wrap=$('dashboardWrap');
    const weeksEl=document.getElementById('weeksWrap');
    if(!wrap) return;
    if(!course){
      wrap.innerHTML='<div class="empty">No hay curso activo. Ve a <a href="#cursos">Mis Cursos</a> o <a href="#import">Importar JSON</a>.</div>';
      if(weeksEl) weeksEl.innerHTML='';
      CH.destroyAll();
      return;
    }
    wrap.innerHTML = D.render(course);
    const {done,total}=PR.countTopics(course);
    const weekly=PR.weeklyProgress(course);
    setTimeout(()=>{
      try{ CH.doughnut('chartDone', done, Math.max(0, total-done)); }catch(e){ console.warn('chartDone',e); }
      try{ CH.barWeekly('chartWeekly', weekly); }catch(e){ console.warn('chartWeekly',e); }
      const stats=S.getStats();
      const labels=[]; const hours=[];
      for(let i=13;i>=0;i--){
        const d=new Date(); d.setDate(d.getDate()-i);
        const iso=d.toISOString().slice(0,10);
        labels.push(iso.slice(5));
        hours.push(stats.studyLog[iso]||0);
      }
      try{ CH.lineHours('chartHours', labels, hours); }catch(e){ console.warn('chartHours',e); }
      const cal=document.getElementById('calendarWrap');
      if(cal) cal.innerHTML = D.renderCalendar(course);
      const w2=document.getElementById('weeksWrap');
      if(w2) w2.innerHTML = D.renderWeeks(course, filterState);
      bindDashboardFilters();
    }, 80);
  }

  function bindDashboardFilters(){
    const s=$('searchInput'), ft=$('filterTipo'), fe=$('filterEstado'), fp=$('filterPri');
    if(!s) return;
    const onChange=()=>{
      filterState={ q: s.value.trim(), tipo: ft.value, estado: fe.value, pri: fp.value };
      const course=S.getActive(); if(!course) return;
      const w=document.getElementById('weeksWrap');
      if(w) w.innerHTML = D.renderWeeks(course, filterState);
    };
    s.oninput=U.debounce(onChange, 250);
    ft.onchange=onChange; fe.onchange=onChange; fp.onchange=onChange;
  }

  function renderCourses(){
    const grid=$('coursesGrid'); if(!grid) return;
    const list=S.getAll();
    const activeId=S.getActiveId();
    // update sidebar list
    const sideList=$('sidebarCourses');
    if(sideList){
      sideList.innerHTML = list.slice(0,6).map(c=>`
        <a href="#" class="side-course ${c.id===activeId?'active':''}" onclick="APP.selectCourse('${c.id}');return false;">
          <span class="small fw-semibold text-truncate" style="max-width:150px">${U.escapeHtml(c.curso)}</span>
          <span class="side-pct">${PR.percent(c)}%</span>
        </a>
      `).join('') || '<div class="small text-muted">Sin cursos</div>';
    }
    // update select in dashboard header if exists
    if(!list.length){
      grid.innerHTML='<div class="empty">Aún no tienes cursos. <a href="#home">Genera tu primer prompt</a> o <a href="#import">importa un JSON</a>. <br><button class="btn btn-primary btn-sm mt-2" onclick="APP.loadSampleDirect()">Cargar ejemplo Arquitectura de Software</button></div>';
      return;
    }
    grid.innerHTML = list.map(c=>{
      const pct=PR.percent(c);
      const hrs=PR.hours(c);
      return `<div class="col-md-6 col-xl-4">
        <div class="card-asp course-card h-100 ${c.id===activeId?'border-dark':''}" onclick="APP.selectCourse('${c.id}')">
          <div class="card-pad">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <span class="badge ${c.archived?'bg-warning text-dark':'bg-dark'}">${c.archived?'Archivado':U.escapeHtml(c.nivel)}</span>
              <span class="badge-soft">${U.escapeHtml(c.duracion)}</span>
            </div>
            <h5 class="mt-2 mb-1" style="letter-spacing:-.02em">${U.escapeHtml(c.curso)}</h5>
            <p class="small text-muted mb-2" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${U.escapeHtml(c.descripcion)}</p>
            <div class="progress-asp mb-2"><span style="width:${pct}%"></span></div>
            <div class="d-flex justify-content-between small text-muted"><span>${pct}% completado</span><span>${hrs.studied}/${hrs.total}h</span></div>
            <div class="divider"></div>
            <div class="course-actions" onclick="event.stopPropagation()">
              <button class="btn btn-sm btn-primary" onclick="APP.selectCourse('${c.id}')"><i class="bi bi-eye"></i> Abrir</button>
              <button class="btn btn-sm btn-ghost" title="Editar" onclick="APP.openEditModal('${c.id}')"><i class="bi bi-pencil-square"></i></button>
              <button class="btn btn-sm btn-ghost" onclick="APP.duplicateCourse('${c.id}')"><i class="bi bi-copy"></i></button>
              <button class="btn btn-sm btn-ghost" onclick="APP.archiveCourse('${c.id}')"><i class="bi ${c.archived?'bi-box-arrow-in-up':'bi-archive'}"></i></button>
              <button class="btn btn-sm btn-ghost text-danger" onclick="APP.deleteCourse('${c.id}')"><i class="bi bi-trash"></i></button>
              <div class="btn-group">
                <button class="btn btn-sm btn-ghost dropdown-toggle" data-bs-toggle="dropdown">Exportar</button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" href="#" onclick="APP.exportSpecific('${c.id}','json');return false;">JSON</a></li>
                  <li><a class="dropdown-item" href="#" onclick="APP.exportSpecific('${c.id}','csv');return false;">CSV</a></li>
                  <li><a class="dropdown-item" href="#" onclick="APP.exportSpecific('${c.id}','pdf');return false;">PDF</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // acciones expuestas globalmente para onclick
  window.APP = {
    selectCourse(id){
      S.setActiveId(id);
      renderCourses();
      if(location.hash==='#dashboard'){ renderDashboard(); } // hash no cambia: refrescar manualmente
      else location.hash='#dashboard';
    },
    duplicateCourse(id){ try{ S.duplicate(id); toast('Curso duplicado','success'); renderCourses(); }catch(e){ toast(e.message,'danger'); } },
    archiveCourse(id){ S.toggleArchive(id); renderCourses(); toast('Estado actualizado','success'); },
    deleteCourse(id){
      if(!confirm('¿Eliminar este curso? Esta acción no se puede deshacer.')) return;
      S.remove(id); renderCourses(); renderDashboard(); toast('Curso eliminado','success');
    },
    exportSpecific(id, fmt){
      const c=S.getById(id); if(!c) return;
      if(fmt==='json') U.download(c.curso.replace(/\s+/g,'_')+'.json', JSON.stringify(c,null,2), 'application/json');
      if(fmt==='csv') U.download(c.curso.replace(/\s+/g,'_')+'.csv', U.toCSV(c), 'text/csv');
      if(fmt==='pdf') U.exportPDF(c);
    },
    exportCourse(fmt){
      const c=S.getActive(); if(!c) return toast('No hay curso activo','warning');
      this.exportSpecific(c.id, fmt);
    },
    loadSampleDirect(){ loadSample(); location.hash='#import'; },
    // ---- Semanas plegables (#2) ----
    toggleWeek(btn){
      const body = btn.parentElement.querySelector('.week-body');
      if(!body) return;
      const open = body.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      const chev = btn.querySelector('.chev');
      if(chev) chev.style.transform = open? 'rotate(180deg)':'';
    },
    toggleAllWeeks(open){
      document.querySelectorAll('#weeksWrap .week-card').forEach(card=>{
        const body=card.querySelector('.week-body'); if(!body) return;
        body.classList.toggle('open', open);
        const btn=card.querySelector('.week-head');
        if(btn){
          btn.setAttribute('aria-expanded', open);
          const ch=btn.querySelector('.chev');
          if(ch) ch.style.transform = open? 'rotate(180deg)':'';
        }
      });
    },
    // ---- Editar curso (#4) ----
    openEditModal(id){
      const c = id? S.getById(id) : S.getActive();
      if(!c) return toast('Curso no encontrado','warning');
      editTargetId=c.id;
      $('editCurso').value=c.curso||'';
      $('editDescripcion').value=c.descripcion||'';
      $('editDuracion').value=c.duracion||'';
      $('editHoras').value=c.horas_dia||1;
      $('editNivel').value=['Principiante','Intermedio','Avanzado'].includes(c.nivel)? c.nivel:'Intermedio';
      $('editFecha').value=c.fecha_inicio||'';
      bootstrap.Modal.getOrCreateInstance($('editModal')).show();
    },
    saveCourseEdit(){
      const c=S.getById(editTargetId)||S.getActive();
      if(!c) return toast('No hay curso para editar','warning');
      const nombre=$('editCurso').value.trim();
      if(!nombre) return toast('El nombre no puede estar vacío','warning');
      // validar duplicado con OTRO curso
      const dup=S.getAll().find(x=> x.id!==c.id && x.curso.trim().toLowerCase()===nombre.toLowerCase());
      if(dup) return toast('Ya existe otro curso con ese nombre','warning');
      S.update(c.id, {
        curso: nombre,
        descripcion: $('editDescripcion').value.trim(),
        duracion: $('editDuracion').value.trim(),
        horas_dia: Number($('editHoras').value)||1,
        nivel: $('editNivel').value,
        fecha_inicio: $('editFecha').value || c.fecha_inicio,
        objetivo: $('editObjetivo').value.trim()
      });
      bootstrap.Modal.getInstance($('editModal'))?.hide();
      toast('Curso actualizado','success');
      renderDashboard(); renderCourses();
    },
    toggleDone(tid, checked){
      const c=S.getActive(); if(!c) return;
      let t=findTopic(c, tid); if(!t) return;
      t._done=checked;
      if(checked){
        t.estado='completado'; t.dominado=true;
        t._completedAt=new Date().toISOString().slice(0,10);
        S.touchDay(c.id); // cuenta para la racha del curso
      } else {
        // revertir consistencia al desmarcar
        t.estado='pendiente'; t.dominado=false;
        delete t._completedAt;
      }
      S.save(c); renderDashboard();
    },
    toggleField(tid, field, checked){
      const c=S.getActive(); if(!c) return;
      const t=findTopic(c, tid); if(!t) return;
      t[field]=checked;
      // si marca practica/ejercicio/resumen y todos marcados, autocompletar?
      S.save(c);
      // no re-render completo para notas, solo guardar
      if(field==='dominado' && checked){ t._done=true; t.estado='completado'; }
      S.save(c);
      // refrescar solo métricas sin perder foco: re-render ligero
      // para no perder el textarea focus, no re-renderizamos si es notas
    },
    changeEstado(tid, val){
      const c=S.getActive(); const t=findTopic(c, tid); if(!t) return;
      t.estado=val; t._done = val==='completado';
      if(val==='completado'){
        t._completedAt=new Date().toISOString().slice(0,10);
        S.touchDay(c.id);
      } else {
        delete t._completedAt;
      }
      S.save(c); renderDashboard();
    },
    updateNotas: U.debounce((tid, val)=>{
      const c=S.getActive(); const t=findTopic(c, tid); if(!t) return;
      t.notas=val; S.save(c);
    }, 400)
  };

  function findTopic(course, tid){
    for(const sem of course.semanas) for(const dia of sem.dias) for(const t of dia.temas) if(t._id===tid) return t;
    return null;
  }

  // Pomodoro
  function setPomo(min){
    pomo.mode=min; pomo.total=min*60; pomo.left=min*60;
    updatePomoUI(); toast(`Pomodoro ${min} min listo`,'info');
  }
  function pomoStart(){
    if(pomo.running) return;
    if(pomo.left<=0) setPomo(pomo.mode||25);
    pomo.running=true; $('pomoRing')?.classList.add('active');
    pomo.timer=setInterval(()=>{
      pomo.left--;
      updatePomoUI();
      if(pomo.left<=0){
        clearInterval(pomo.timer); pomo.running=false;
        $('pomoRing')?.classList.remove('active');
        // registrar tiempo (global + curso activo)
        const minutes=pomo.total/60;
        S.addStudyMinutes(new Date().toISOString(), minutes, S.getActiveId());
        // sonido simple
        try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); o.connect(ctx.destination); o.frequency.value=880; o.start(); setTimeout(()=>{o.stop(); ctx.close();}, 700);}catch(e){}
        toast(`¡Pomodoro completado! +${minutes} min registrados`,'success');
        if(document.getElementById('dashboardWrap')) renderDashboard();
        // notificación
        if(Notification && Notification.permission==='granted') new Notification('AI Study Planner', { body:`Pomodoro ${minutes} min completado` });
        else if(Notification && Notification.permission!=='denied') Notification.requestPermission();
      }
    },1000);
    updatePomoUI();
  }
  function pomoPause(){ clearInterval(pomo.timer); pomo.running=false; $('pomoRing')?.classList.remove('active'); updatePomoUI(); }
  function pomoReset(){ clearInterval(pomo.timer); pomo.running=false; pomo.left=pomo.total||1500; $('pomoRing')?.classList.remove('active'); updatePomoUI(); }
  function updatePomoUI(){
    const m=Math.floor((pomo.left||0)/60), s=(pomo.left||0)%60;
    const el=$('pomoTime'); if(el) el.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const btnS=$('pomoStart'), btnP=$('pomoPause');
    if(btnS) btnS.disabled=pomo.running;
    if(btnP) btnP.disabled=!pomo.running;
    const label=$('pomoLabel'); if(label) label.textContent = pomo.running? 'En curso...':'Listo';
  }

  function toast(msg, type='info'){
    const area=$('toastArea'); if(!area) return;
    const id='t'+Date.now();
    const bg={success:'bg-success', danger:'bg-danger', warning:'bg-warning text-dark', info:'bg-dark'}[type]||'bg-dark';
    area.insertAdjacentHTML('beforeend', `<div id="${id}" class="toast align-items-center text-white ${bg} border-0 show" role="alert" style="min-width:260px"><div class="d-flex"><div class="toast-body">${U.escapeHtml(msg)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.closest('.toast').remove()"></button></div></div>`);
    setTimeout(()=> document.getElementById(id)?.remove(), 3200);
  }

  // init at DOM ready
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // exponer para inline
  window.APP.validateAndSave = validateAndSave;
  window.APP.generatePrompt = generatePrompt;
})();
