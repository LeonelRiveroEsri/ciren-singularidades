# Automatización

Todos los archivos de esta carpeta deben conservar su ubicación relativa. `Lib/esrilogs.py` es una dependencia obligatoria.

## Configuración

- Notebooks y tareas: editar `configuracion_ciren.json`.
- GP Service: editar el bloque `CONFIG_JSON` dentro de `CatastroConsolidacion.pyt`.
- Ambos deben contener los mismos IDs, filtro y rutas.
- Usar `credenciales.example.json` solo como plantilla; no escribir la clave real dentro del entregable.

## Pruebas

1. Mantener `notebook_execute_changes: false`.
2. Ejecutar `001.ipynb` y revisar el reporte de simulación.
3. Ejecutar `Actualizar_token_Arcade_CIREN.ipynb` y confirmar `expected_matches`.
4. Recién después habilitar cambios en el ambiente destino.

## Windows Task Scheduler

- `ActualizarTokensScheduler.py`: entrada de producción sin parámetros para renovar tokens Arcade. Cambia al directorio del script, por lo que también funciona cuando el campo **Iniciar en** queda vacío.
- `WINDOWS_TASK_SCHEDULER.md`: instalación, prueba, configuración de la tarea, códigos de salida y monitoreo.
- `ejecutar_actualizacion_tokens.py`: ejecutor genérico conservado para compatibilidad; para una nueva tarea de Windows usar `ActualizarTokensScheduler.py`.

El ejecutor realiza siempre una simulación previa y cancela sin escribir si la cantidad encontrada difiere de `arcade_tokens.expected_matches`.

## Publicación PYT

Publicar juntos:

- `CatastroConsolidacion.pyt`
- `consolidar_survey.py`
- `Lib/esrilogs.py`

La herramienta no recibe parámetros. La cuenta de ArcGIS Server debe leer las credenciales y escribir en la ruta de logs configurada.
