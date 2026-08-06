# Publicación GP y activación desde Survey123

## Componentes

- `CatastroConsolidacion.pyt`: toolbox sin parámetros.
- `consolidar_survey.py`: lógica de atributos, geometría, cotas, `id_unique` y adjuntos.
- `CONFIG_JSON`: variable interna de la PYT con IDs, filtro, credenciales y logs.
- `Lib/esrilogs.py`: est?ndar corporativo obligatorio de trazabilidad.

La configuración no es un archivo adicional para la PYT. El módulo
`consolidar_survey.py` sí debe permanecer junto a la toolbox durante la publicación.
La herramienta procesa todos los padres con `validacion = 'si'` y omite los hijos
cuyo GlobalID ya existe en `id_unique`.

## Configuración y credenciales en ArcGIS Server

No se incluyen claves en el código ni se utiliza `client_secret`. La variable
`CONFIG_JSON` contiene la ruta del archivo seguro de credenciales y el nombre del
perfil. Formato requerido para el archivo externo:

```json
{
  "AGOL": {
    "url": "https://www.arcgis.com",
    "username": "USUARIO_TECNICO",
    "password": "CONTRASEÑA"
  }
}
```

El archivo debe quedar fuera de carpetas públicas y ser legible solamente por la
cuenta de ArcGIS Server. Antes de publicar se debe editar el bloque `CONFIG_JSON`
dentro de la PYT y verificar las rutas de credenciales y logs desde la cuenta del servicio.

## Logs Esri Chile

No se usa el m?dulo est?ndar `logging`. La PYT crea un `Logfile` usando la secci?n
`logs` del `CONFIG_JSON`; los errores se registran con `capturaError`. Configure una
ruta persistente con permiso de escritura para la cuenta de ArcGIS Server. Consulte
`ManualUsoLogsEsriChile.html` para rotaci?n, retenci?n y estructura del archivo.

## Publicar

1. Agregar `CatastroConsolidacion.pyt` a un proyecto de ArcGIS Pro.
2. Ejecutar **Consolidar encuestas validadas** y revisar los mensajes.
3. Compartir el resultado como **Web Tool / Geoprocessing Service**.
4. Elegir ejecución asíncrona y restringir el servicio a la cuenta técnica.
5. Confirmar en el servidor que `consolidar_survey.py` quedó junto a la toolbox. Si
   el proceso de publicación no lo copia, desplegarlo en una carpeta
   accesible por la cuenta de ArcGIS Server y publicar desde esa ubicación.
6. Probar el endpoint `submitJob` y revisar el estado hasta `esriJobSucceeded`.

## Webhook

El webhook de Survey123 entrega un JSON de evento, mientras que un GP Service
protegido requiere autenticación y una llamada REST a `submitJob`. Se recomienda un
intermediario (Azure Function, Logic App, Power Automate o servicio equivalente):

1. Recibir el webhook de Survey123.
2. Responder HTTP 200 rápidamente.
3. Verificar que el evento sea una edición relevante.
4. Obtener una credencial segura para ArcGIS Enterprise.
5. Ejecutar `POST <GPServer>/ConsolidarEncuestasValidadas/submitJob` con `f=json`.
6. Registrar el `jobId` y consultar su estado para auditoría/reintentos.

La toolbox no necesita recibir el payload: cada llamada vuelve a consultar el
servicio y `id_unique` hace que el proceso sea idempotente.

## Momento correcto del disparo

Una encuesta nueva nace con `validacion = 'No validado'`; el webhook de creación
ejecutará la GP, pero no cargará ese registro. Para consolidarlo debe existir un
segundo disparo cuando el revisor cambie el valor a `si`. Si la aplicación de
revisión no emite webhook, programe además el GP Service cada pocos minutos. El
barrido programado es seguro porque los ya cargados se omiten mediante `id_unique`.
