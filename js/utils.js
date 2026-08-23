/* utils.js - helpers, exports, prompt maestro */
(function(global){
  'use strict';
  const Utils = {
    uid: ()=> Math.random().toString(36).slice(2,9),
    /**
     * Normaliza un recurso a URL limpia y navegable:
     * 1. Si trae markdown [a](b) prioriza la URL de YouTube presente en la cadena,
     *    luego la del paréntesis y luego la del corchete.
     * 2. Si trae texto con una URL plano incrustada, la extrae.
     * 3. Limpia puntuación final y corchetes residuales.
     */
    cleanRecurso(raw){
      let s = String(raw ?? '').trim();
      if(!s) return '';
      // 1. URL de YouTube en cualquier parte de la cadena (prioridad máxima)
      const yt = s.match(/https?:\/\/[^\s<>"')\]]*(?:youtube\.com|youtu\.be)[^\s<>"')\]]*/i);
      if(yt) return yt[0];
      // 2. Markdown [label](target): preferir target si es URL absoluta
      const md = s.match(/\[([^\]]*)\]\(([^)]+)\)/);
      if(md){
        const target = md[2].trim();
        const label = md[1].trim();
        if(/^https?:\/\//i.test(target)) return target.replace(/[.,;:]+$/,'');
        if(/^https?:\/\//i.test(label)) return label;
        s = label || target;
      }
      // 3. Primer URL plano dentro del texto
      const plain = s.match(/https?:\/\/[^\s<>"')\]]+/i);
      if(plain) return plain[0].replace(/[.,;:]+$/,'');
      // 4. Texto sin URL: devolver limpio
      return s.replace(/^[\[\(]+/,'').replace(/[\]\)]+$/,'').trim();
    },
    escapeHtml(s){
      return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    },
    copy(text){
      if(navigator.clipboard && window.isSecureContext){
        return navigator.clipboard.writeText(text);
      } else {
        const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        return Promise.resolve();
      }
    },
    download(filename, content, mime='text/plain'){
      const blob=new Blob([content],{type:mime});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
    },
    toCSV(course){
      const rows=[['semana','dia','tema','tipo','prioridad','estado','dominado','horas','notas']];
      course.semanas.forEach(sem=>{
        sem.dias.forEach(dia=>{
          dia.temas.forEach(t=>{
            rows.push([sem.numero, dia.numero, t.titulo, t.tipo, t.prioridad, t.estado, t.dominado?'si':'no', dia.horas, (t.notas||'').replace(/\n/g,' ')]);
          });
        });
      });
      return rows.map(r=> r.map(v=> `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    },
    exportPDF(course){
      // usa window.print con estilo dedicado
      const w=window.open('', '_blank');
      if(!w){ alert('El navegador bloqueó la ventana. Permite popups para exportar PDF.'); return; }
      const html = `
      <html><head><meta charset="utf-8"><title>${Utils.escapeHtml(course.curso)} - Plan</title>
      <style>
        body{font-family:Inter,system-ui;padding:24px;color:#111}
        h1{font-size:22px;margin:0} h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:6px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f5f5f5} .muted{color:#666;font-size:13px}
      </style></head><body>
      <h1>${Utils.escapeHtml(course.curso)}</h1>
      <p class="muted">${Utils.escapeHtml(course.descripcion)}<br>Nivel: ${Utils.escapeHtml(course.nivel)} | Inicio: ${Utils.escapeHtml(course.fecha_inicio)} | Duración: ${Utils.escapeHtml(course.duracion)} | Horas/día: ${course.horas_dia}</p>
      <p><strong>Objetivo:</strong> ${Utils.escapeHtml(course.objetivo)}</p>
      ${course.semanas.map(sem=>`
        <h2>Semana ${sem.numero}: ${Utils.escapeHtml(sem.titulo)} - ${Utils.escapeHtml(sem.objetivo)}</h2>
        ${sem.dias.map(dia=>`
          <h3 style="font-size:14px;margin:14px 0 6px">Día ${dia.numero} (${dia.horas}h)</h3>
          <table><tr><th>Tema</th><th>Tipo</th><th>Prioridad</th><th>Estado</th><th>Dominado</th></tr>
          ${dia.temas.map(t=>`<tr><td>${Utils.escapeHtml(t.titulo)}</td><td>${t.tipo}</td><td>${t.prioridad}</td><td>${t.estado}</td><td>${t.dominado?'Sí':'No'}</td></tr>`).join('')}
          </table>
        `).join('')}
      `).join('')}
      <script>window.onload=()=>{window.print();}<\/script>
      </body></html>`;
      w.document.write(html); w.document.close();
    },
    // Prompt Maestro que obliga a JSON exclusivo
    buildPrompt(topic){
      const t = topic.trim();
      return `Actúa como un DISEÑADOR CURRICULAR EXPERTO. Genera un PLAN DE ESTUDIO COMPLETO para: "${t}".

REGLAS INQUEBRANTABLES:
- Responde EXCLUSIVAMENTE con JSON válido, sin texto antes ni después, sin markdown, sin explicaciones, sin \`\`\`json.
- El JSON debe ser parseable con JSON.parse().
- Usa UTF-8, comillas dobles, sin comas finales.
- No omitas ningún campo del esquema.

ESQUEMA EXACTO (respétalo al 100%):
{
  "curso": "string - nombre del curso",
  "descripcion": "string - 1-2 frases que describan el curso",
  "duracion": "string - ej: '4 semanas'",
  "horas_dia": 2,
  "objetivo": "string - objetivo general del curso",
  "nivel": "Principiante | Intermedio | Avanzado",
  "fecha_inicio": "YYYY-MM-DD - usa la fecha de hoy si no se especifica",
  "semanas": [
    {
      "numero": 1,
      "titulo": "string",
      "objetivo": "string",
      "dias": [
        {
          "numero": 1,
          "horas": 2,
          "temas": [
            {
              "titulo": "string - nombre del tema",
              "tipo": "concepto | practica | ejercicio",
              "prioridad": "alta | media | baja",
              "estado": "pendiente",
              "dominado": false,
              "notas": "",
              "practicas": false,
              "ejercicios": false,
              "criterios": "string - cómo saber que lo dominas",
              "recursos": ["https://www.youtube.com/results?search_query=...", "https://pagina-oficial.com/docs"]
            }
          ]
        }
      ]
    }
  ]
}

CONTENIDO PEDAGÓGICO PARA "${t}":
- Duración recomendada según complejidad (mínimo 3 semanas, máximo 8).
- Cada semana 5 días de estudio (lunes-viernes), 2-4 temas por día.
- Progresión lógica: fundamentos → intermedio → avanzado → proyecto.
- Tipos balanceados: 40% concepto, 30% practica, 30% ejercicio.
- Prioridades coherentes: fundamentos = alta.
- Criterios evaluables y medibles por tema.
- Nivel coherente con el tema: si es introductorio usa Principiante.

REGLA CRÍTICA DE RECURSOS (autodidacta navegable):
- CADA tema debe tener mínimo 2 recursos en "recursos", todos como URL PLANA y completa:
  usa SOLO la URL, sin markdown, sin corchetes [ ], sin paréntesis ( ), sin texto alrededor.
  1. Un video: YouTube en formato BÚSQUEDA (siempre válido, nunca inventes IDs de video):
     https://www.youtube.com/results?search_query=<nombre+del+tema+con+signos+de+suma>
  2. Documentación o página OFICIAL del programa/tecnología/entidad tratado, ejemplos:
     Docker → https://docs.docker.com | Python → https://docs.python.org/es/3/
     Linux → https://ubuntu.com/tutorials | Inglés → https://cambridgeenglish.org/learningenglish
     Git → https://git-scm.com/doc | Excel → https://support.microsoft.com/excel
  3. Puedes añadir un tercero: curso gratuito, artículo o libro (con URL si existe).
- Si el tema es sobre un software, herramienta u organización, SIEMPRE incluye su sitio oficial.
- NUNCA devuelvas recursos vacíos [] ni texto sin URL.
- PROHIBIDO el formato markdown en recursos. MAL: ["[url](url)"]. BIEN: ["https://..."]

VALIDACIÓN FINAL ANTES DE RESPONDER:
- ¿Es solo JSON? SÍ.
- ¿Todos los campos existen? SÍ.
- ¿horas_dia es número? SÍ.
- ¿semanas es arreglo no vacío? SÍ.
- ¿Cada tema tiene mínimo 2 recursos con URL navegable (YouTube búsqueda + oficial)? SÍ.

Ahora genera ÚNICAMENTE el JSON para "${t}".`;
    },
    debounce(fn, ms){
      let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
    },
    formatDate(iso){
      if(!iso) return '-';
      const d=new Date(iso+'T00:00:00'); return d.toLocaleDateString('es-ES',{year:'numeric',month:'short',day:'numeric'});
    }
  };
  global.ASPUtils = Utils;
})(window);
