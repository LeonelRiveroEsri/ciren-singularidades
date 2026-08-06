# AOI de padres Survey para ArcGIS Dashboards

`AOIPadresSurvey.js` es una expresión del perfil **Dashboard Data**. Devuelve un FeatureSet poligonal con una entidad por registro de la tabla padre del Survey.

## Qué entrega

- Todos los campos del padre, obtenidos dinámicamente con `Schema(parents)` y conservando nombre, alias y tipo compatible.
- El `globalid` como texto, adecuado para filtros y acciones del Dashboard.
- Una geometría AOI creada a partir de los puntos y líneas relacionados.
- Los campos calculados `cantidad_puntos`, `cantidad_lineas`, `cantidad_geometrias` y `area_ha`.
- El campo `html`, con una tarjeta profesional lista para el elemento Lista.
- Un reporte detallado con tablas de colores alternos y una galería de adjuntos
  obtenidos directamente desde el padre mediante `Attachments(parent)`.

La relación se detecta por separado para puntos y líneas. La expresión admite
`uniquerowid` → `parentrowid` y `globalid` → `parentglobalid`, por lo que funciona
con las dos variantes habituales de publicación de Survey123.

El ObjectID del origen se excluye porque es un campo de sistema y no identifica de manera estable al registro. Para relacionar selecciones y acciones se debe usar `globalid`.

## Configuración obligatoria

Reemplazar en la cabecera:

- `<URL_PORTAL>`: URL del Portal de ArcGIS Enterprise o ArcGIS Online.
- `<ITEM_ID_SERVICIO_SURVEY>`: Item ID del Feature Service del Survey.
- `<URL_REST_TABLA_PADRE_FEATURESERVER_0>`: URL REST exacta de la tabla padre.
- `<TOKEN_GESTIONADO_AUTOMATICAMENTE>`: valor inicial que luego renovará el Scheduler.
- `parentTableId`, `pointLayerId` y `lineLayerId`: IDs REST reales.
- `pointBufferMeters` y `lineBufferMeters`: tamaño de influencia requerido.
- `parentWhere`: `1=1` para todos o `validacion = 'si'` para aprobados.

## Configurar la lista

1. Crear una expresión de datos en el Dashboard y pegar `AOIPadresSurvey.js`.
2. Crear un elemento **Lista** usando esa expresión como fuente.
3. En las opciones de línea de pedido, seleccionar el modo de texto enriquecido/código fuente.
4. Pegar el contenido de `PlantillaListaAOI.html`: `{html}`.
5. Habilitar selección única y configurar la acción geográfica usando la geometría de la expresión.
6. Para filtros por atributos, seleccionar cualquiera de los campos originales del padre; ahora están disponibles en la fuente calculada.

La tarjeta muestra ID de inspección, canal, singularidad, validación, comuna, cantidad de geometrías y área. Los valores de texto se codifican antes de insertarlos en HTML.

La ficha expandida muestra únicamente campos con valor y organiza los
antecedentes en identificación, responsables, iniciativa, ubicación,
coordenadas, características, evaluación, rehabilitación y evidencias. La
variable `maxAttachmentsPerReport` limita la cantidad de adjuntos renderizados
por registro para proteger el rendimiento de la Lista.

## Renovación del token de fotografías

La expresión mantiene la asignación `var token = "..."`, compatible con el
actualizador Regex. Después de guardar la expresión en el Dashboard:

1. Agregar el Item ID del Dashboard a `arcade_tokens.item_ids`.
2. Ejecutar el actualizador en simulación.
3. Ajustar `expected_matches` al total informado, incluyendo esta nueva expresión.
4. Ejecutar la actualización y comprobar las imágenes desde el mismo referer configurado.

## Consideraciones

Esta expresión genera geometrías en memoria; no crea ni edita una capa persistente. Como consulta todos los campos del padre, conviene definir un intervalo de actualización acorde con el volumen. Para grandes volúmenes se recomienda materializar las AOI en un Feature Service mediante un proceso ETL o GP.
