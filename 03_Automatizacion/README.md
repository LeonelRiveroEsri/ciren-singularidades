# Automatización

Los notebooks y tareas Windows deben conservar su ubicación relativa respecto de `Lib/esrilogs.py`. La PYT no usa logs de archivo.

## Configuración

- Notebooks y tareas: editar `configuracion_ciren.json`.
- GP Service: editar el bloque `CONFIG_JSON` dentro de `CatastroConsolidacion.pyt`, incluidos URL, usuario y contraseña de la cuenta técnica.
- `items.target_feature_service` debe ser el Item ID del Feature Service referenciado cuya fuente son las capas SDE creadas desde `02_Modelo_Datos/ShemaSDE.gdb.zip`.
- `items.survey_feature_service` y `items.target_feature_service` son los únicos IDs usados por la consolidación.
- `arcade_tokens.item_ids` es una lista independiente: agregar solamente los Web Maps o Dashboards cuyo JSON contiene las expresiones Arcade con `var token`.
- `arcade_tokens.referer` debe coincidir con la aplicación web desde la cual el navegador solicitará las imágenes.
- `arcade_tokens.expiration_minutes` usa minutos: `21600` solicita 15 días. Portal puede aplicar un máximo menor según su política.
- Los IDs del Dashboard, la encuesta de edición y otros Web Maps pertenecen al inventario de implementación, no a la configuración de los scripts.
- Ambos deben contener los mismos IDs, filtro y rutas.
- Usar `credenciales.example.json` solo para notebooks y tareas Windows. La PYT publicada no lee ese archivo.

## Pruebas

1. Para consolidación, mantener `consolidation.notebook_execute_changes: false` hasta revisar la simulación de `001.ipynb`.
2. Ejecutar `Actualizar_token_Arcade_CIREN.ipynb`: primero simula y exige `expected_matches`; si coincide, la última celda actualiza el token.
3. La frecuencia de producción se configura exclusivamente en Windows Task Scheduler, no en el JSON.

## Windows Task Scheduler

- `ActualizarTokensScheduler.py`: entrada de producción sin parámetros para renovar tokens Arcade. Cambia al directorio del script, por lo que también funciona cuando el campo **Iniciar en** queda vacío.
- `WINDOWS_TASK_SCHEDULER.md`: instalación, prueba, configuración de la tarea, códigos de salida y monitoreo.
- `ejecutar_actualizacion_tokens.py`: ejecutor genérico conservado para compatibilidad; para una nueva tarea de Windows usar `ActualizarTokensScheduler.py`.

El ejecutor realiza siempre una simulación previa y cancela sin escribir si la cantidad encontrada difiere de `arcade_tokens.expected_matches`.
El token se obtiene con un POST HTTPS a `<portal>/sharing/rest/generateToken`, usando `client=referer`; no se reutiliza el token interno de `GIS._con`.
La sección `automation` y el interruptor `arcade_tokens.notebook_execute_changes` no existen: el Scheduler controla el calendario y el notebook operativo actualiza después de superar su validación.

## Publicación PYT

Publicar desde una carpeta de preparación que contenga juntos:

- `CatastroConsolidacion.pyt`
- `consolidar_survey.py`

La herramienta no recibe parámetros ni crea archivos en ArcGIS Server. Toda su salida operacional se entrega mediante mensajes `arcpy` del trabajo GP.

Crear la copia como `CatastroConsolidacion.publicacion.pyt`; ese patrón está excluido por `.gitignore`. Su contraseña queda dentro de `CONFIG_JSON`: no distribuirla como fuente. ArcGIS Pro debe incluir `consolidar_survey.py` como dependencia al crear la definición del servicio; revisar el análisis de publicación antes de cargarlo en el servidor.
