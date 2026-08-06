# Entregable técnico — Catastro de singularidades

Este paquete permite implementar la solución en una organización ArcGIS nueva. No contiene credenciales, tokens ni IDs del ambiente de desarrollo.

## Orden recomendado

1. Leer `05_Documentacion/Manual_Tecnico_Implementacion.html`.
2. Completar `00_INICIO/INVENTARIO_IMPLEMENTACION.md` durante la publicación.
3. Publicar el Survey desde `01_Survey123/Singularidades.zip`.
4. Migrar el esquema de `02_Modelo_Datos/ShemaSDE.gdb.zip` a la geodatabase corporativa SDE y publicar sus capas como Feature Service referenciado.
5. Crear Web Maps, Form de edición y Dashboard; registrar sus IDs.
6. Configurar los Arcade de `04_Popups_Arcade`.
7. Completar `03_Automatizacion/configuracion_ciren.json`.
8. Crear una copia local no versionada de `CatastroConsolidacion.pyt` y completar su `CONFIG_JSON`, incluidas las credenciales técnicas requeridas por el GP publicado.
9. Ejecutar los notebooks primero en simulación.
10. Publicar la PYT como GP Service y conectarla al webhook de la encuesta Survey123 de edición.
11. Agendar la renovación de tokens Arcade siguiendo `03_Automatizacion/WINDOWS_TASK_SCHEDULER.md`.

## Estructura

- `01_Survey123`: paquete Survey123 Connect.
- `02_Modelo_Datos`: File Geodatabase modelo para crear el esquema en SDE y publicar el servicio consolidado referenciado.
- `03_Automatizacion`: PYT, módulos, notebooks, configuración, ejecutor Windows y logs Esri Chile.
- `04_Popups_Arcade`: expresiones para puntos y líneas.
- `05_Documentacion`: manual técnico, guía GP/webhook y manual de logs.

## Seguridad

- Para notebooks y Scheduler, crear el archivo real de credenciales fuera del repositorio.
- Para la PYT, completar las credenciales únicamente en la copia de publicación; nunca confirmar esa copia en Git.
- No incluir contraseñas ni `client_secret` en PYT, notebooks o Arcade.
- No ejecutar mientras existan marcadores `<...>` en la configuración.
- Proteger las rutas de credenciales y logs para la cuenta técnica/ArcGIS Server.

## Ambiente Python

Usar el ambiente de Python incluido con ArcGIS Pro o un clon compatible que contenga `arcgis`, `arcpy`, `pandas` y las dependencias institucionales.
