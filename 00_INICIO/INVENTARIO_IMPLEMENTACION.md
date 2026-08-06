# Inventario de implementación — Ambiente destino

Complete esta matriz a medida que publica. Los valores deben copiarse luego a `configuracion_ciren.json` y al `CONFIG_JSON` interno de la PYT.

| Componente | Título en destino | Item ID / URL | Verificado por | Fecha |
|---|---|---|---|---|
| Portal/organización | | | | |
| Form Survey de captura | | | | |
| Feature Service Survey | | | | |
| Tabla padre (URL REST) | | | | |
| Relación padre → puntos | | | | |
| Relación padre → líneas | | | | |
| Feature Service consolidado | | | | |
| Capa final de puntos | | | | |
| Capa final de líneas | | | | |
| Web Map de revisión | | | | |
| Web Map de edición | | | | |
| Form Survey de edición | | | | |
| Dashboard de validación | | | | |
| GP Service consolidación | | | | |
| Webhook de la encuesta Survey123 de edición | | | | |
| Cuenta técnica | | | | |
| Ruta segura de credenciales | | | | |
| Ruta persistente de logs | | | | |
| Equipo y cuenta de Windows Task Scheduler | | | | |
| Ruta de `propy.bat` | | | | |

## Criterios mínimos antes de producción

- [ ] Un registro nuevo queda como `No validado`.
- [ ] La encuesta de edición guarda exactamente `si`.
- [ ] Punto y línea conservan `globalid` hijo en `id_unique`.
- [ ] La segunda ejecución no duplica registros.
- [ ] Atributos y mapeo de cotas son correctos.
- [ ] Adjuntos se copian y visualizan.
- [ ] Regex encuentra la cantidad configurada de `var token`.
- [ ] `ActualizarTokensScheduler.py` finaliza con código 0 y deja log institucional.
- [ ] Task Scheduler ejecuta con la cuenta técnica aunque no haya sesión abierta.
- [ ] GP Service ejecuta sin parámetros.
- [ ] El webhook Survey123 de edición recibe `editData` y solo invoca el GP cuando `validacion = 'si'`.
- [ ] El análisis de publicación incluye `consolidar_survey.py` y `Lib/esrilogs.py`.
- [ ] Logs Esri Chile registran inicio, cierre, duración y errores.
