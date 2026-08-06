# Popups Arcade

## Versiones incluidas

- `arcadePopupProfesionalPuntos.js` y `arcadePopupProfesionalLineas.js`: ficha HTML completa.
- `arcadePopupSimplePuntos.js` y `arcadePopupSimpleLineas.js`: ficha simple de tipo `fields`.
- `arcadeFotosSeparadas.js`: galería de adjuntos del padre como expresión independiente.

## Preparación

Antes de pegar las expresiones:

- Reemplazar los nombres de relación por los valores REST reales del servicio Survey.
- Reemplazar las URLs de tabla padre por la URL REST completa, sin barra final.
- En `arcadeFotosSeparadas.js`, reemplazar `<URL_REST_TABLA_PADRE_FEATURESERVER_0>`.
- Mantener la asignación `var token = "<TOKEN_GENERADO_AUTOMATICAMENTE>";` para que el actualizador Regex pueda renovarla.

## Instalación

1. Abrir el Web Map de revisión.
2. Configurar el popup de la capa hija correspondiente.
3. Agregar contenido de tipo expresión Arcade.
4. Pegar el archivo completo.
5. Para la presentación simple, agregar además `arcadeFotosSeparadas.js` como segunda expresión.
6. Guardar el Web Map y registrar su Item ID en `arcade_tokens.item_ids`.
7. Ejecutar el notebook de tokens y confirmar `expected_matches`.
8. Probar atributos, fotografías y archivos con un registro relacionado.

No distribuir tokens reales dentro de estos archivos. Antes de usar las versiones simples, confirmar el nombre de la relación de puntos o líneas definido en cada archivo.
