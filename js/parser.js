/* parser.js - Validación estricta del JSON de curso */
(function(global){
  'use strict';
  const Parser = {
    validate(jsonStr){
      const errors=[];
      let obj=null;
      // 1. JSON parse con línea
      try{ obj=JSON.parse(jsonStr); }catch(e){
        const msg=e.message||'JSON inválido';
        const m=msg.match(/position\s+(\d+)/i);
        let line=null;
        if(m){
          const pos=Number(m[1]);
          line = jsonStr.slice(0,pos).split('\n').length;
        }
        return { ok:false, errors:[{ path:'(json)', line, message: 'JSON inválido: '+msg }], data:null };
      }
      // 2. Debe ser objeto
      if(!obj || typeof obj!=='object' || Array.isArray(obj)){
        return { ok:false, errors:[{ path:'(root)', message:'El JSON raíz debe ser un objeto' }], data:null };
      }
      const reqRoot=['curso','descripcion','duracion','horas_dia','objetivo','nivel','fecha_inicio','semanas'];
      reqRoot.forEach(k=>{
        if(!(k in obj)) errors.push({ path:k, message:`Campo requerido faltante: "${k}"` });
      });
      if(errors.length) return { ok:false, errors, data:null };

      // tipos básicos
      if(typeof obj.curso!=='string' || !obj.curso.trim()) errors.push({ path:'curso', message:'curso debe ser texto no vacío' });
      if(typeof obj.descripcion!=='string') errors.push({ path:'descripcion', message:'descripcion debe ser texto' });
      if(typeof obj.duracion!=='string') errors.push({ path:'duracion', message:'duracion debe ser texto (ej: "4 semanas")' });
      if(typeof obj.horas_dia!=='number' && typeof obj.horas_dia!=='string') errors.push({ path:'horas_dia', message:'horas_dia debe ser número' });
      if(typeof obj.objetivo!=='string') errors.push({ path:'objetivo', message:'objetivo debe ser texto' });
      if(typeof obj.nivel!=='string') errors.push({ path:'nivel', message:'nivel debe ser texto (Principiante/Intermedio/Avanzado)' });
      if(!/^\d{4}-\d{2}-\d{2}$/.test(String(obj.fecha_inicio))) errors.push({ path:'fecha_inicio', message:'fecha_inicio debe ser YYYY-MM-DD' });
      if(!Array.isArray(obj.semanas) || obj.semanas.length===0) errors.push({ path:'semanas', message:'semanas debe ser un arreglo con al menos 1 semana' });

      if(Array.isArray(obj.semanas)){
        obj.semanas.forEach((sem, i)=>{
          const base=`semanas[${i}]`;
          ['numero','titulo','objetivo','dias'].forEach(k=>{
            if(!(k in sem)) errors.push({ path:`${base}.${k}`, message:`Falta ${k} en semana ${i+1}` });
          });
          if(!Array.isArray(sem.dias)) errors.push({ path:`${base}.dias`, message:'dias debe ser arreglo' });
          else sem.dias.forEach((dia, j)=>{
            const dpath=`${base}.dias[${j}]`;
            ['numero','horas','temas'].forEach(k=>{
              if(!(k in dia)) errors.push({ path:`${dpath}.${k}`, message:`Falta ${k} en ${dpath}` });
            });
            if(!Array.isArray(dia.temas)) errors.push({ path:`${dpath}.temas`, message:'temas debe ser arreglo' });
            else dia.temas.forEach((t, k)=>{
              const tpath=`${dpath}.temas[${k}]`;
              ['titulo','tipo','prioridad','estado','dominado','notas','practicas','ejercicios','criterios','recursos'].forEach(field=>{
                if(!(field in t)) errors.push({ path:`${tpath}.${field}`, message:`Falta "${field}" en ${tpath}` });
              });
              if(t.tipo && !['concepto','practica','ejercicio','teoria','proyecto'].includes(String(t.tipo).toLowerCase())){
                // no bloqueante, advertencia como error suave
                // permitimos pero avisamos
              }
              if(t.prioridad && !['alta','media','baja'].includes(String(t.prioridad).toLowerCase())){
                errors.push({ path:`${tpath}.prioridad`, message:'prioridad debe ser alta|media|baja' });
              }
            });
          });
        });
      }
      if(errors.length) return { ok:false, errors, data:null };
      // normalizar horas_dia a número
      obj.horas_dia = Number(obj.horas_dia);
      return { ok:true, errors:[], data:obj };
    },
    formatErrors(errors){
      return errors.map(e=>{
        const line = e.line? ` (línea ~${e.line})`:'';
        return `• ${e.path}${line}: ${e.message}`;
      }).join('\n');
    }
  };
  global.ASPParser = Parser;
})(window);
