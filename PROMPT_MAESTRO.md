# PROMPT MAESTRO - AI Study Planner

Copia y pega este prompt en ChatGPT, Claude, Gemini o cualquier IA. Reemplaza `[TEMA]` por lo que quieras aprender.

---

```
Actúa como un DISEÑADOR CURRICULAR EXPERTO. Genera un PLAN DE ESTUDIO COMPLETO para: "[TEMA]".

REGLAS INQUEBRANTABLES:
- Responde EXCLUSIVAMENTE con JSON válido, sin texto antes ni después, sin markdown, sin explicaciones, sin ```json.
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

CONTENIDO PEDAGÓGICO PARA "[TEMA]":
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

Ahora genera ÚNICAMENTE el JSON para "[TEMA]".
```

## Ejemplo de uso:
- Tema: `Docker desde cero`
- Pegas el prompt con ese tema en ChatGPT
- Copias el JSON resultante (cada tema traerá links de YouTube + documentación oficial)
- Lo importas en `index.html` > Importar JSON > Validar e Importar

El prompt es generado automáticamente por la app al escribir el tema en la pantalla principal.
