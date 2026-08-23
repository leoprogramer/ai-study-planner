/* storage.js - LocalStorage con principios SOLID (single responsibility) */
(function(global){
  'use strict';
  const KEY = 'asp_courses_v1';
  const ACTIVE_KEY = 'asp_active_v1';
  const THEME_KEY = 'asp_theme_v1';
  const STATS_KEY = 'asp_stats_v1'; // horas, racha, calendario

  function uid(){ return 'c_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7); }

  // fecha local YYYY-MM-DD (evita desfase UTC de toISOString)
  function localDateStr(d){
    d = d || new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  // racha: días consecutivos con actividad terminando hoy (o ayer si hoy aún sin actividad)
  function computeStreak(log){
    const set = new Set(Object.keys(log||{}));
    if(!set.size) return 0;
    const oneDay = 86400000;
    let cursor = new Date(); cursor.setHours(0,0,0,0);
    if(!set.has(localDateStr(cursor))) cursor = new Date(cursor.getTime()-oneDay);
    let streak = 0;
    while(set.has(localDateStr(cursor))){ streak++; cursor = new Date(cursor.getTime()-oneDay); }
    return streak;
  }

  /**
   * Fusiona contenido nuevo con progreso existente.
   * - Estructura/contenido: del JSON nuevo.
   * - Tracking (_done, notas, dominado, etc.): del curso previo,
   *   emparejando por misma posición (semana/día/tema) y por título como fallback.
   */
  function mergeProgress(oldC, newC){
    const TRACK = ['_done','_resumen','notas','practicas','ejercicios','dominado','estado','_completedAt'];
    const out = newC;
    out.id = oldC.id;
    out.createdAt = oldC.createdAt || new Date().toISOString();
    out.archived = !!oldC.archived;
    out.updatedAt = new Date().toISOString();
    const oldByTitle = new Map();
    oldC.semanas.forEach(sem=>sem.dias.forEach(dia=>dia.temas.forEach(t=>{
      const key = String(t.titulo).trim().toLowerCase();
      if(!oldByTitle.has(key)) oldByTitle.set(key, t);
    })));
    out.semanas.forEach((sem,i)=>sem.dias.forEach((dia,j)=>dia.temas.forEach((t,k)=>{
      const samePath = oldC.semanas[i] && oldC.semanas[i].dias[j] && oldC.semanas[i].dias[j].temas[k];
      const src = samePath || oldByTitle.get(String(t.titulo).trim().toLowerCase()) || null;
      if(src){
        TRACK.forEach(f=>{
          const v = src[f];
          if(typeof v!=='undefined' && v!==null && v!=='') t[f]=v;
        });
        if(!t._id && src._id) t._id=src._id;
      }
    })));
    return out;
  }

  function loadCourses(){
    try{ const raw=localStorage.getItem(KEY); return raw? JSON.parse(raw): []; }catch(e){ return []; }
  }
  function saveCourses(list){ localStorage.setItem(KEY, JSON.stringify(list)); }

  function loadStats(){
    try{ const r=localStorage.getItem(STATS_KEY); return r? JSON.parse(r): { studyLog:{}, totalMinutes:0, streak:0, lastDate:null } }catch(e){ return { studyLog:{}, totalMinutes:0, streak:0, lastDate:null } }
  }
  function saveStats(s){ localStorage.setItem(STATS_KEY, JSON.stringify(s)); }

  const Storage = {
    // cursos
    getAll(){ return loadCourses(); },
    getById(id){ return loadCourses().find(c=>c.id===id) || null; },
    getActiveId(){ return localStorage.getItem(ACTIVE_KEY); },
    setActiveId(id){ if(id) localStorage.setItem(ACTIVE_KEY, id); else localStorage.removeItem(ACTIVE_KEY); },
    getActive(){ const id=this.getActiveId(); return id? this.getById(id): null; },

    /**
     * Crea un curso. Si existe uno con el mismo nombre:
     * - opts.merge=true  -> fusiona conservando progreso y devuelve {_merged:true}
     * - opts.merge=false -> lanza error (curso duplicado)
     */
    create(courseObj, opts){
      opts = opts || {};
      const list=loadCourses();
      const normalized = normalizeCourse(courseObj);
      const dupIdx = list.findIndex(c=> c.curso.trim().toLowerCase()===normalized.curso.trim().toLowerCase());
      if(dupIdx!==-1){
        if(opts.merge){
          const merged = mergeProgress(list[dupIdx], normalized);
          list[dupIdx] = merged;
          saveCourses(list);
          this.setActiveId(merged.id);
          return Object.assign({}, merged, { _merged:true });
        }
        throw new Error('Ya existe un curso llamado "'+normalized.curso+'". Se importó con fusión de progreso o renombra el curso en el JSON.');
      }
      normalized.id = uid();
      normalized.createdAt = new Date().toISOString();
      normalized.archived = false;
      list.unshift(normalized);
      saveCourses(list);
      this.setActiveId(normalized.id);
      return normalized;
    },
    update(id, patch){
      const list=loadCourses();
      const idx=list.findIndex(c=>c.id===id);
      if(idx===-1) throw new Error('Curso no encontrado');
      list[idx] = { ...list[idx], ...patch, updatedAt:new Date().toISOString() };
      saveCourses(list);
      return list[idx];
    },
    save(course){
      // guarda el objeto completo (usado tras cambios de progreso/notas)
      const list=loadCourses();
      const idx=list.findIndex(c=>c.id===course.id);
      if(idx===-1) list.unshift(course); else list[idx]=course;
      saveCourses(list);
    },
    remove(id){
      let list=loadCourses();
      list=list.filter(c=>c.id!==id);
      saveCourses(list);
      if(this.getActiveId()===id) this.setActiveId(list[0]?.id || null);
    },
    duplicate(id){
      const c=this.getById(id); if(!c) throw new Error('No existe');
      const clone=JSON.parse(JSON.stringify(c));
      clone.id=uid();
      clone.curso = c.curso + ' (copia)';
      clone.createdAt=new Date().toISOString();
      clone.archived=false;
      const list=loadCourses(); list.unshift(clone); saveCourses(list); return clone;
    },
    toggleArchive(id){
      const c=this.getById(id); if(!c) return;
      c.archived=!c.archived; this.save(c);
    },
    // stats / estudio
    getStats(){ return loadStats(); },
    /** Registra minutos estudiados (pomodoro) globalmente y por curso. */
    addStudyMinutes(dateISO, minutes, courseId){
      const s=loadStats();
      const d = localDateStr(new Date(dateISO));
      s.studyLog[d]=(s.studyLog[d]||0)+minutes;
      s.totalMinutes=(s.totalMinutes||0)+minutes;
      if(courseId){
        s.courseLog = s.courseLog || {};
        s.courseLog[courseId] = s.courseLog[courseId] || {};
        s.courseLog[courseId][d]=(s.courseLog[courseId][d]||0)+minutes;
      }
      s.streak = computeStreak(s.studyLog);
      saveStats(s);
      return s;
    },
    /** Marca hoy como día de actividad del curso (sin minutos; usado al completar temas). */
    touchDay(courseId){
      if(!courseId) return;
      const s=loadStats();
      const d = localDateStr();
      s.courseLog = s.courseLog || {};
      s.courseLog[courseId] = s.courseLog[courseId] || {};
      if(!(d in s.courseLog[courseId])) s.courseLog[courseId][d]=0;
      saveStats(s);
    },
    /** Racha de un curso: unión de días con pomodoro (courseLog) y días con temas completados (_completedAt). */
    getCourseStreak(courseId, course){
      const s = loadStats();
      const set = new Set(Object.keys((s.courseLog && s.courseLog[courseId])||{}));
      if(course && Array.isArray(course.semanas)){
        course.semanas.forEach(sem=>sem.dias.forEach(dia=>dia.temas.forEach(t=>{
          if((t._done||t.estado==='completado'||t.dominado) && t._completedAt){
            set.add(String(t._completedAt).slice(0,10));
          }
        })));
      }
      const log={}; set.forEach(d=>log[d]=1);
      return computeStreak(log);
    },
    // backup
    exportBackup(){
      return JSON.stringify({ courses: loadCourses(), stats: loadStats(), exportedAt:new Date().toISOString(), version:1 }, null, 2);
    },
    importBackup(jsonStr){
      const obj=JSON.parse(jsonStr);
      if(!obj.courses || !Array.isArray(obj.courses)) throw new Error('Backup inválido: falta courses');
      saveCourses(obj.courses);
      if(obj.stats) saveStats(obj.stats);
      if(obj.courses[0]) this.setActiveId(obj.courses[0].id);
    },
    // theme
    getTheme(){ return localStorage.getItem(THEME_KEY) || 'light'; },
    setTheme(t){ localStorage.setItem(THEME_KEY, t); document.documentElement.setAttribute('data-theme', t); }
  };

  function normalizeCourse(c){
    const out = JSON.parse(JSON.stringify(c));
    // asegurar campos base
    out.curso = String(out.curso||'').trim();
    out.descripcion = String(out.descripcion||'');
    out.duracion = String(out.duracion||'');
    out.horas_dia = Number(out.horas_dia||1);
    out.objetivo = String(out.objetivo||'');
    out.nivel = String(out.nivel||'Intermedio');
    out.fecha_inicio = String(out.fecha_inicio|| new Date().toISOString().slice(0,10));
    out.semanas = Array.isArray(out.semanas)? out.semanas: [];
    out.semanas.forEach((sem, si)=>{
      sem.numero = Number(sem.numero||si+1);
      sem.titulo = String(sem.titulo||'Semana '+(si+1));
      sem.objetivo = String(sem.objetivo||'');
      sem.dias = Array.isArray(sem.dias)? sem.dias: [];
      sem.dias.forEach((dia, di)=>{
        dia.numero = Number(dia.numero||di+1);
        dia.horas = Number(dia.horas||out.horas_dia||1);
        dia.temas = Array.isArray(dia.temas)? dia.temas: [];
        dia.temas.forEach(t=>{
          t.titulo = String(t.titulo||'Tema');
          t.tipo = String(t.tipo||'concepto'); // concepto|practica|ejercicio
          t.prioridad = String(t.prioridad||'media'); // alta|media|baja
          t.estado = String(t.estado||'pendiente'); // pendiente|en_progreso|completado
          t.dominado = !!t.dominado;
          t.notas = String(t.notas||'');
          t.practicas = !!t.practicas;
          t.ejercicios = !!t.ejercicios;
          t.criterios = String(t.criterios||'');
          t.recursos = Array.isArray(t.recursos)? t.recursos: (t.recursos? [String(t.recursos)]: []);
          // tracking adicional
          if(typeof t._done === 'undefined') t._done = false; // completado global
          if(typeof t._resumen === 'undefined') t._resumen = false;
          if(!t._id) t._id = 't_'+Math.random().toString(36).slice(2,9);
        });
      });
    });
    return out;
  }

  // exponer
  global.ASPStorage = Storage;
  global.ASPNormalize = normalizeCourse;
})(window);
