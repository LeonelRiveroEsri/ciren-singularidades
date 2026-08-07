# Lista directa desde la tabla padre

Esta alternativa no usa una expresion de datos Arcade. Tampoco consulta capas
hijas, geometria, AOI, adjuntos ni tokens.

1. En el elemento **Lista**, seleccionar directamente la tabla padre del Survey.
2. En **Opciones de lista**, habilitar el formato avanzado y abrir **Fuente HTML**.
3. Pegar el contenido de `PlantillaListaTablaPadre.html`.
4. Configurar la seleccion como unica.
5. Para abrir o filtrar la encuesta de edicion, mapear el campo `globalid` de
   esta tabla contra el campo `globalid` de la tabla usada por el formulario.

Los nombres entre llaves son campos reales de la tabla padre. Si un ambiente
publica alguno con otro nombre, se debe reemplazar solamente ese marcador en la
plantilla.
