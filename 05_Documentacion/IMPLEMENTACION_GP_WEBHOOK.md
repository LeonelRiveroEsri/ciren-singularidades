# Publicación GP y activación desde la encuesta de edición Survey123

## Flujo operativo

1. El registro original permanece en la tabla padre con `validacion` distinto de `si`.
2. El Dashboard abre la encuesta Survey123 de edición sobre ese registro.
3. El revisor selecciona **Sí** y envía la edición.
4. Survey123 genera un evento de edición (`editData`; algunos proveedores lo muestran como `updateData`).
5. El receptor del webhook comprueba que `validacion = 'si'` en el registro editado e invoca el GP Service.
6. La herramienta vuelve a consultar el servicio Survey, consolida punto o línea y copia adjuntos.
7. `id_unique` impide volver a cargar una geometría ya consolidada.

El disparador es el webhook de la **encuesta Survey123 de edición** y no debe configurarse sobre la encuesta inicial de captura.

## Componentes de publicación

La herramienta no recibe parámetros, pero el análisis de ArcGIS Pro debe empaquetar estos tres archivos conservando su ubicación relativa:

- `CatastroConsolidacion.pyt`: entrada GP y `CONFIG_JSON` interno.
- `consolidar_survey.py`: consolidación, geometrías, cotas, `id_unique` y adjuntos.
- `Lib/__init__.py` y `Lib/esrilogs.py`: paquete de trazabilidad institucional Esri Chile.

No publicar únicamente una copia aislada de la `.pyt`. Preparar una carpeta con todos los componentes, agregar la toolbox al proyecto desde esa carpeta y revisar el análisis de **Compartir como herramienta web**. Si `consolidar_survey.py` o el paquete `Lib` no aparecen entre las dependencias incorporadas, cancelar la publicación y corregir la carpeta de origen.

## Configuración interna y credenciales

La PYT publicada no busca `credenciales.json`. Antes de publicar, crear una copia local llamada `CatastroConsolidacion.publicacion.pyt` —excluida por `.gitignore`— y completar dentro de `CONFIG_JSON`:

```json
{
  "arcgis": {
    "url": "https://portal.organizacion.cl/portal",
    "username": "USUARIO_TECNICO",
    "password": "CONTRASENA_TECNICA"
  }
}
```

Completar también los IDs del Survey y del servicio consolidado, el filtro `validacion = 'si'` y la ruta persistente de logs. La copia configurada contiene una contraseña: no debe confirmarse en Git, enviarse por correo ni conservarse en una carpeta compartida. El repositorio mantiene solamente marcadores.

Los notebooks y el ejecutor de Windows son artefactos diferentes y continúan leyendo sus credenciales desde el archivo externo configurado.

## Publicar el GP Service

1. Copiar `CatastroConsolidacion.pyt`, `consolidar_survey.py` y `Lib/esrilogs.py` a una carpeta local de preparación.
2. Completar `CONFIG_JSON` solamente en esa copia de la PYT.
3. Agregar la toolbox a ArcGIS Pro y ejecutar **Consolidar encuestas validadas**.
4. Confirmar que procesa únicamente padres con `validacion = 'si'` y que una segunda ejecución no duplica datos.
5. Compartir el resultado como herramienta web o servicio de geoprocesamiento asíncrono.
6. Revisar los mensajes del analizador y confirmar que los dos módulos Python fueron empaquetados.
7. Probar `submitJob`, esperar `esriJobSucceeded` y revisar el log Esri Chile.

## Configurar el webhook Survey123

En la encuesta de edición:

1. Abrir **Survey123 website > Configuración > Webhooks**.
2. Crear y activar un webhook para el evento de edición de una respuesta existente.
3. Usar la URL del receptor institucional que invocará el GP Service.
4. En el receptor, aceptar únicamente el evento de edición correspondiente al formulario configurado.
5. Leer el atributo `validacion` del registro editado y continuar solo cuando su valor normalizado sea `si`.
6. Invocar `submitJob` sin parámetros de herramienta, registrar el `jobId` y controlar el resultado.
7. Responder correctamente a Survey123 y aplicar reintentos sin riesgo: la carga es idempotente por `id_unique`.

El GP Service no consume directamente el JSON del webhook. El receptor institucional adapta el POST de Survey123 a la llamada REST autenticada de `submitJob`.

Cada consolidación se origina exclusivamente en el webhook de la encuesta de edición. La GP no tiene una tarea programada. El único proceso agendado de esta solución es la renovación de tokens Arcade mediante Windows Task Scheduler.

## Prueba de aceptación

- Enviar una captura nueva: no debe consolidarse mientras no esté validada.
- Abrir desde el Dashboard la encuesta de edición, seleccionar **Sí** y enviarla.
- Confirmar que el webhook registra un evento de edición y que el atributo enviado es `validacion = 'si'`.
- Confirmar que el GP finaliza correctamente y copia atributos, geometría y adjuntos.
- Reenviar o reintentar el evento: no debe crear duplicados porque el GlobalID hijo ya existe en `id_unique`.
