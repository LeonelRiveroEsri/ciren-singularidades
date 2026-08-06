# AOI de padres Survey para ArcGIS Dashboards

`AOIPadresSurvey.js` es una expresión del perfil **Dashboard Data**. Devuelve un FeatureSet poligonal con una entidad por registro de la tabla padre del Survey.

## Qué entrega

- Todos los campos del padre, obtenidos dinámicamente con `Schema(parents)` y conservando nombre, alias y tipo compatible.
- El `globalid` como texto, adecuado para filtros y acciones del Dashboard.
- Una geometría AOI creada a partir de los puntos y líneas relacionados.
- Los campos calculados `cantidad_puntos`, `cantidad_lineas`, `cantidad_geometrias` y `area_ha`.
- El campo `html`, con una tarjeta profesional lista para el elemento Lista.

El ObjectID del origen se excluye porque es un campo de sistema y no identifica de manera estable al registro. Para relacionar selecciones y acciones se debe usar `globalid`.

## Configuración obligatoria

Reemplazar en la cabecera:

- `<URL_PORTAL>`: URL del Portal de ArcGIS Enterprise o ArcGIS Online.
- `<ITEM_ID_SERVICIO_SURVEY>`: Item ID del Feature Service del Survey.
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

## Consideraciones

Esta expresión genera geometrías en memoria; no crea ni edita una capa persistente. Como consulta todos los campos del padre, conviene definir un intervalo de actualización acorde con el volumen. Para grandes volúmenes se recomienda materializar las AOI en un Feature Service mediante un proceso ETL o GP.
