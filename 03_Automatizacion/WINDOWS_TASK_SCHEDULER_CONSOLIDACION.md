# Ejecucion del GP con Windows Task Scheduler

## Objetivo

`EjecutarGPConsolidacionScheduler.py` llama al GP Service publicado, obtiene el
`jobId`, consulta su estado hasta finalizar y escribe un log de texto.

No requiere ArcGIS Pro, `arcpy`, ArcGIS API for Python, `requests`, `rich`,
`pandas`, credenciales JSON ni modulos propios. Utiliza solamente la biblioteca
estandar de Python y no esta sujeto a CORS porque no se ejecuta en un navegador.

## Archivo requerido

Copiar al servidor unicamente:

```text
EjecutarGPConsolidacionScheduler.py
```

El GP Service contiene la configuracion de Portal, Survey y destino. El script
programado no recibe ni almacena esas credenciales.

## Configuracion interna

Revisar el bloque `CONFIG` al inicio del archivo:

```python
CONFIG = {
    "submit_job_url": "URL_DEL_GP/submitJob",
    "poll_seconds": 5,
    "timeout_minutes": 30,
    "request_timeout_seconds": 60,
    "log_directory": "RUTA_DE_LOGS"
}
```

Por defecto, el log se crea en la subcarpeta `Logs` ubicada junto al script.
TI puede reemplazar `log_directory` por una ruta institucional con permisos de
escritura para la cuenta que ejecuta la tarea.

## Prueba controlada

El script ejecuta una consolidacion real. Antes de probarlo:

1. confirmar que el GP Service esta disponible;
2. revisar que la Python Toolbox publicada contiene los Item ID correctos;
3. confirmar que `id_unique` esta operativo;
4. ejecutar la prueba con la misma cuenta de Windows de la tarea.

No necesita `propy.bat`. Puede utilizar cualquier Python 3 con acceso HTTPS al
servidor:

```bat
"C:\Python311\python.exe" "C:\CIREN\Automatizacion\EjecutarGPConsolidacionScheduler.py"
```

Tambien puede usarse el Python de ArcGIS Pro, pero no es un requisito.

## Crear la tarea

En **Programador de tareas > Crear tarea**:

- **General:** ejecutar con una cuenta de servicio, aunque el usuario no haya
  iniciado sesion.
- **Desencadenador:** repetir cada 5 minutos de forma indefinida.
- **Programa:** ruta de `python.exe`.
- **Argumentos:** ruta completa de `EjecutarGPConsolidacionScheduler.py` entre
  comillas.
- **Iniciar en:** carpeta donde se encuentra el script.
- **Si la tarea ya esta en ejecucion:** seleccionar **No iniciar una nueva
  instancia**.
- **Reintento:** aplicar la politica de TI para errores transitorios de red.

## Funcionamiento

1. Envia `POST f=json` a `submitJob` con formato
   `application/x-www-form-urlencoded`.
2. Obtiene el `jobId` devuelto por ArcGIS Server.
3. Consulta `/jobs/<jobId>?f=json` cada cinco segundos.
4. Registra cambios de estado y mensajes del trabajo.
5. Termina cuando el trabajo finaliza o supera el tiempo maximo.

## Codigos de salida

| Codigo | Resultado |
|---:|---|
| 0 | El GP termino con `esriJobSucceeded`. |
| 1 | Error HTTP, red, respuesta REST invalida u otro error general. |
| 2 | El GP termino como fallido, cancelado o expirado. |
| 3 | Se supero el tiempo maximo mientras el trabajo seguia activo. |

## Log

El archivo se llama:

```text
EjecutarGPConsolidacionScheduler.log
```

Ejemplo:

```text
2026-08-07 17:00:00 | INFO  | Inicio de consolidacion mediante GP Service
2026-08-07 17:00:01 | INFO  | Trabajo enviado: j123456789
2026-08-07 17:00:01 | INFO  | Estado j123456789: esriJobSubmitted
2026-08-07 17:00:06 | INFO  | Estado j123456789: esriJobExecuting
2026-08-07 17:00:16 | INFO  | Estado j123456789: esriJobSucceeded
2026-08-07 17:00:16 | INFO  | Consolidacion finalizada en 16 segundos
```

El log no contiene credenciales. Los mensajes internos de consolidacion son los
que devuelve el trabajo publicado en ArcGIS Server.

## Convivencia con Survey123 Field App

El webhook de Field App puede permanecer habilitado. Si procesa primero un
registro, la ejecucion programada no lo duplica porque el GP usa `id_unique`.

La tarea programada permite recuperar las validaciones enviadas desde
Survey123 Web App mientras no pueda corregirse CORS.
