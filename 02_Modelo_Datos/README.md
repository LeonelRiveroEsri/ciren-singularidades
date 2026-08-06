# Modelo de datos consolidado

`ShemaSDE.gdb.zip` contiene la geodatabase de archivos modelo regenerada desde la fuente de desarrollo antes de la limpieza del proyecto. El ZIP versionado es desde ahora la fuente transferible del esquema; ninguna ruta local de desarrollo debe replicarse en producción.

## Uso en ArcGIS Enterprise

La geodatabase incluida es una plantilla de esquema, no el repositorio productivo ni un servicio alojado. El técnico debe:

El paquete validado contiene:

- `singularidades_pt`: geometría Point, GlobalID e `id_unique` de tipo GUID.
- `singularidades_ln`: geometría Polyline, GlobalID e `id_unique` de tipo GUID.
- tablas y relaciones de adjuntos para ambas clases.

1. Extraer `ShemaSDE.gdb.zip` y revisar las capas, campos, tipos de geometría, adjuntos e índices.
2. Crear o utilizar una conexión a la geodatabase corporativa SDE del ambiente destino.
3. Llevar el esquema de las capas de puntos y líneas desde la File Geodatabase modelo hacia la SDE.
4. Habilitar y verificar GlobalID, adjuntos y el campo `id_unique` en ambas capas.
5. Compartir las capas desde ArcGIS Pro como un Feature Service **referenciado**, manteniendo los datos registrados en la SDE.
6. Registrar el Item ID de ese servicio como `target_feature_service` en la configuración.

La consolidación no abre directamente la GDB ni la conexión SDE. `consolidar_survey.py` utiliza ArcGIS REST API a través de `arcgis.features.FeatureLayer`; las operaciones `query`, `edit_features` y adjuntos se realizan contra las capas del Feature Service referenciado.

No publicar este modelo como Hosted Feature Layer si el diseño de producción exige persistencia en la geodatabase corporativa SDE.
