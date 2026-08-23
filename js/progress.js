/* progress.js - métricas y cálculos */
(function(global){
  'use strict';
  const isDone = t => !!(t._done || t.estado==='completado' || t.dominado);

  const Progress = {
    /**
     * Contadores del curso.
     * - conceptosAprendidos: temas tipo concepto/teoria completados
     * - practicasHechas: flag practicas=true, o tipo practica completada
     * - ejerciciosHechos: flag ejercicios=true, o tipo ejercicio completado
     */
    countTopics(course){
      let total=0, done=0, dominados=0;
      let totConceptos=0, conceptosAprendidos=0;
      let totPracticas=0, practicasHechas=0;
      let totEjercicios=0, ejerciciosHechos=0;
      course.semanas.forEach(sem=> sem.dias.forEach(dia=> dia.temas.forEach(t=>{
        total++;
        const d = isDone(t);
        if(d) done++;
        if(t.dominado) dominados++;
        const tipo = String(t.tipo||'').toLowerCase();
        if(tipo==='practica'){
          totPracticas++;
          if(t.practicas || d) practicasHechas++;
        } else if(tipo==='ejercicio' || tipo==='proyecto'){
          totEjercicios++;
          if(t.ejercicios || d) ejerciciosHechos++;
        } else { // concepto | teoria | desconocido
          totConceptos++;
          if(d) conceptosAprendidos++;
        }
        // flags en temas de otro tipo también cuentan
        if(t.practicas && tipo!=='practica') practicasHechas++;
        if(t.ejercicios && !(tipo==='ejercicio'||tipo==='proyecto')) ejerciciosHechos++;
      })));
      return {
        total, done, pendientes: total-done, dominados,
        totConceptos, conceptosAprendidos,
        totPracticas, practicasHechas,
        totEjercicios, ejerciciosHechos
      };
    },
    percent(course){
      const {total,done}=this.countTopics(course);
      return total? Math.round(done/total*100):0;
    },
    /** Horas totales según plan; estudiadas/restantes proporcionales al avance. */
    hours(course){
      let totalH=0;
      course.semanas.forEach(sem=> sem.dias.forEach(d=> totalH+= Number(d.horas||0)));
      const {total,done}=this.countTopics(course);
      const studied = total? (done/total)*totalH : 0;
      return { total: totalH, studied: Math.round(studied*10)/10, remaining: Math.round((totalH-studied)*10)/10 };
    },
    daysCompleted(course){
      let days=0, totalDays=0;
      course.semanas.forEach(sem=> sem.dias.forEach(dia=>{
        totalDays++;
        if(dia.temas.length && dia.temas.every(isDone)) days++;
      }));
      return { days, totalDays };
    },
    weeklyProgress(course){
      return course.semanas.map(sem=>{
        let tot=0, done=0;
        sem.dias.forEach(d=> d.temas.forEach(t=>{ tot++; if(isDone(t)) done++; }));
        return { label:'S'+sem.numero, percent: tot? Math.round(done/tot*100):0, done, tot };
      });
    },
    /** Mapa fecha -> minutos estudiados (para calendario/gráficos). */
    calendarData(course, stats){
      return stats?.studyLog || {};
    }
  };
  global.ASPProgress = Progress;
})(window);
