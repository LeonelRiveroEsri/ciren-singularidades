# Diagnóstico del FeatureSet AOI

Usar `AOIPadresSurveyDiagnostico.js` únicamente en el editor de pruebas del
Dashboard. No agregar `return` manuales: un retorno que no sea FeatureSet cambia
el contrato de la expresión y puede producir mensajes engañosos.

Modificar `diagnosticMode` y ejecutar en este orden:

1. `diagnosticMode = 1`: FeatureSet mínimo vacío. Verifica el constructor.
2. `diagnosticMode = 2`: agrega las geometrías AOI con un solo atributo.
3. `diagnosticMode = 3`: agrega los primeros `diagnosticFieldLimit` campos.
4. `diagnosticMode = 4`: usa los 75 campos, pero reemplaza el HTML por un texto corto.
5. `diagnosticMode = 0`: salida completa con reporte y fotografías.

Si el modo 3 falla, ubicar el primer campo problemático mediante búsqueda
binaria: probar límites 38, 19/57, etc. El menor número que falla identifica la
posición del campo; el arreglo `fields` mostrado en la salida usa posiciones
desde cero, mientras `diagnosticFieldLimit` expresa cantidad de campos.

Interpretación:

- Falla modo 1: problema con el perfil/versión Arcade o `FeatureSet()`.
- Pasa 1 y falla 2: problema en la geometría o referencia espacial.
- Pasa 2 y falla 3: campo o valor incompatible; buscar con el límite.
- Pasa 3 con 75 y falla 4: revisar la mutación/copia del esquema completo.
- Pasa 4 y falla 0: el contenido o longitud del HTML es la causa.
