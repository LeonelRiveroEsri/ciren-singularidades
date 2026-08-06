# AOI de padres Survey para ArcGIS Dashboards

`AOIPadresSurvey.js` es una expresión de datos del perfil Dashboard Data. Devuelve un FeatureSet poligonal con una entidad por registro de la tabla padre del Survey.

## Lógica

1. Consulta la tabla padre y las capas hijas de puntos y líneas.
2. Relaciona cada hijo mediante `parentglobalid = padre.globalid`.
3. Convierte cada punto y línea en polígono mediante `BufferGeodetic`.
4. Une los polígonos y calcula su `ConvexHull`.
5. Conserva en la AOI los atributos principales del padre y los conteos de hijos.
6. Omite padres sin geometría relacionada.

## Configuración obligatoria

Reemplazar en la cabecera:

- `<URL_PORTAL>`: URL del Portal de ArcGIS Enterprise o ArcGIS Online.
- `<ITEM_ID_SERVICIO_SURVEY>`: Item ID del Feature Service del Survey.
- `parentTableId`, `pointLayerId` y `lineLayerId`: IDs REST reales.
- `pointBufferMeters` y `lineBufferMeters`: tamaño de influencia requerido.
- `parentWhere`: `1=1` para todos o `validacion = 'si'` para aprobados.

## Uso

En ArcGIS Dashboards, crear una nueva expresión de datos, pegar el código y definir un intervalo de actualización coherente con el volumen. El FeatureSet resultante puede alimentar elementos de mapa y acciones espaciales basadas en polígonos.

Esta expresión genera geometrías en memoria; no crea ni edita una capa padre persistente. Para grandes volúmenes, se recomienda materializar las AOI en un Feature Service mediante un proceso ETL o GP.
