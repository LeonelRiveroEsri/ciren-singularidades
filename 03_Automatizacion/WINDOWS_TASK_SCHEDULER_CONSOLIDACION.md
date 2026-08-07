# Consolidacion con Windows Task Scheduler

## Objetivo

`ConsolidarEncuestasScheduler.py` ejecuta la misma logica incremental de la
Python Toolbox sin depender del webhook ni de CORS. Esta alternativa permite
procesar las validaciones enviadas desde Survey123 Web App y Field App.

La tarea consulta padres con `validacion = 'si'`, consolida puntos y lineas,
completa `Z=1` cuando el destino exige Z, evita duplicados con `id_unique`,
copia adjuntos habilitados y utiliza exclusivamente `Lib/esrilogs.py`.

## Archivos requeridos

Copiar juntos al servidor:

```text
03_Automatizacion/
|-- ConsolidarEncuestasScheduler.py
|-- consolidar_survey.py
|-- configuracion_ciren.py
|-- configuracion_ciren.json
|-- credenciales.example.json
`-- Lib/
    `-- esrilogs.py
```

Crear `credenciales.json` en una carpeta segura fuera del repositorio. La ruta
se define en `arcgis.credentials_file`.

## Configuracion

Completar las secciones `arcgis`, `items`, `consolidation` y `logs` de
`configuracion_ciren.json`. La cuenta tecnica debe consultar el Survey y editar
las capas y adjuntos del servicio destino.

El archivo real de credenciales debe tener permisos de lectura solamente para
la cuenta de Windows que ejecuta la tarea.

## Prueba previa

Antes de ejecutar la tarea efectiva:

1. ejecutar la simulacion de `001.ipynb`;
2. comprobar la relacion padre-hijo detectada;
3. revisar la cantidad de padres validados;
4. confirmar los Item ID y el destino SDE;
5. verificar la recuperacion del ambiente segun la politica CIREN.

Probar con la misma cuenta de Windows que usara la tarea:

```bat
"C:\Program Files\ArcGIS\Pro\bin\Python\Scripts\propy.bat" "C:\CIREN\Catastro\03_Automatizacion\ConsolidarEncuestasScheduler.py"
```

## Crear la tarea

En **Programador de tareas > Crear tarea**:

- **General:** usar la cuenta tecnica y ejecutar aunque el usuario no haya
  iniciado sesion.
- **Desencadenador:** repetir cada 5 minutos de forma indefinida. Ajustar el
  intervalo segun volumen y capacidad.
- **Programa:**
  `C:\Program Files\ArcGIS\Pro\bin\Python\Scripts\propy.bat`.
- **Argumentos:**
  `"C:\CIREN\Catastro\03_Automatizacion\ConsolidarEncuestasScheduler.py"`.
- **Iniciar en:** `C:\CIREN\Catastro\03_Automatizacion`.
- **Si la tarea ya esta en ejecucion:** seleccionar **No iniciar una nueva
  instancia**.
- **Reintento:** aplicar la politica de TI CIREN para errores transitorios.

No usar una instalacion generica de Python. `propy.bat` garantiza las
dependencias `arcgis` del ambiente de ArcGIS Pro.

## Codigos de salida

| Codigo | Resultado |
|---:|---|
| 0 | Ejecucion correcta, incluso cuando no existen registros nuevos. |
| 1 | Error de configuracion, credenciales, conexion o ejecucion general. |
| 2 | La consolidacion termino con errores de edicion, adjuntos o huerfanos. |

## Logs

El detalle queda bajo:

```text
<logs.path>\Logs\ConsolidarEncuestasScheduler.log
```

El log informa inicio, conexion, relaciones detectadas, metricas por geometria,
adjuntos, errores y cierre. No registra usuario, contrasena ni tokens. El
ejecutor no usa el modulo estandar `logging` y no intenta instalar paquetes.

## Convivencia con el webhook

El webhook directo de Survey123 Field App puede permanecer activo. Si procesa
primero un registro, la tarea lo reconoce como cargado mediante `id_unique` y no
lo duplica.

TI puede usar el Scheduler como mecanismo principal para Web App y Field App, o
mantener el webhook para Field App y usar el Scheduler como recuperacion de
eventos web. En ambos casos no se deben ejecutar instancias simultaneas.
