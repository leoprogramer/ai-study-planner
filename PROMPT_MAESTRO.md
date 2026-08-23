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
              "recursos": ["string url o nombre de recurso"]
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
- Criterios evaluables y recursos reales (documentación oficial, libros, cursos).
- Nivel coherente con el tema: si es introductorio usa Principiante.

VALIDACIÓN FINAL ANTES DE RESPONDER:
- ¿Es solo JSON? SÍ.
- ¿Todos los campos existen? SÍ.
- ¿horas_dia es número? SÍ.
- ¿semanas es arreglo no vacío? SÍ.

Ahora genera ÚNICAMENTE el JSON para "[TEMA]".
```

## Ejemplo de uso:
- Tema: `Docker desde cero`
- Pegas el prompt con ese tema en ChatGPT
- Copias el JSON resultante
- Lo importas en `index.html` > Importar JSON > Validar e Importar

El prompt es generado automáticamente por la app al escribir el tema en la pantalla principal.
