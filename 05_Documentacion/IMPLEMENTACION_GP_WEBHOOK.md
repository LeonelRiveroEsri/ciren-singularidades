# Integracion Survey123 Field App con GP Service

**Proyecto:** Catastro de singularidades CIREN

**Destinatario:** Equipo de Tecnologias de Informacion CIREN

**Estado:** Flujo validado en ambiente CIREN

**Fecha de validacion:** 7 de agosto de 2026

## 1. Objetivo

Documentar la integracion que ejecuta la consolidacion de singularidades luego
de editar y validar una encuesta desde Survey123 Field App.

La solucion consolida en capas de puntos y lineas los registros de la tabla
padre cuyo campo `validacion` tiene el valor `si`. La carga es incremental y
utiliza `id_unique` para impedir duplicados.

## 2. Arquitectura validada

```text
Dashboard o bandeja de trabajo
        |
        v
Survey123 Field App con Inbox
        |
        | Edicion del registro y validacion = si
        v
Webhook Survey123
        |
        | POST directo
        v
GP Service asincrono de ArcGIS Enterprise
        |
        v
Consulta de padres validados y consolidacion incremental
        |
        v
Feature Service referenciado a la geodatabase SDE
```

La prueba funcional confirmo que una edicion enviada desde el Inbox de
Survey123 Field App activa correctamente el GP Service. Para este flujo no fue
necesario un receptor intermedio.

## 3. Endpoint operativo

El webhook utiliza la operacion `submitJob` del task asincrono:

```text
https://esri.ciren.cl/server/rest/services/PROYECTOS_EXTERNOS_CNR/ConsolidadorSingularidades/GPServer/Consolidar%20encuestas%20validadas/submitJob?f=json
```

El task publicado es:

```text
Consolidar encuestas validadas
```

La herramienta no expone parametros. Cada ejecucion vuelve a consultar el
Survey, selecciona los registros aprobados y procesa solamente los que aun no
existen en el destino segun `id_unique`.

## 4. Configuracion de Survey123 Field App

1. Configurar y habilitar el Inbox en la encuesta de edicion.
2. Configurar el webhook de Survey123 con el endpoint `submitJob` indicado.
3. Habilitar el evento de edicion de registros existentes.
4. Publicar o actualizar la encuesta.
5. En cada dispositivo, actualizar o volver a descargar la encuesta para
   incorporar la configuracion vigente del webhook.
6. Abrir el registro desde Inbox, cambiar `validacion` a `si` y enviarlo.

El disparador debe estar asociado a la encuesta utilizada para revisar y editar
el registro padre. La encuesta inicial de captura no necesita ejecutar la
consolidacion mientras el registro no haya sido aprobado.

## 5. Comportamiento de la consolidacion

Al recibir el evento, el GP Service:

1. se conecta al Portal con la cuenta tecnica configurada en la herramienta;
2. obtiene la tabla padre y las capas hijas de punto y linea;
3. detecta la relacion `uniquerowid -> parentrowid` o, cuando corresponda,
   `globalid -> parentglobalid`;
4. selecciona padres con `validacion = 'si'`;
5. copia los atributos del padre a la geometria correspondiente;
6. completa con `Z=1` las geometrias destino que exigen valores Z;
7. evita repeticiones guardando el GlobalID del hijo en `id_unique`;
8. copia adjuntos cuando el origen y el destino los tienen habilitados;
9. informa resultados mediante mensajes de geoprocesamiento `arcpy`.

No existe una tarea programada de reconciliacion. La consolidacion se activa
por evento. La ejecucion repetida es segura respecto de duplicados gracias a
`id_unique`.

## 6. Diferencia entre Field App y aplicacion web

### Survey123 Field App

El flujo fue probado correctamente desde la aplicacion nativa con Inbox. La
aplicacion no esta sujeta a las restricciones CORS propias de un navegador.

### Survey123 Web App

La aplicacion web mostro el mensaje `Failed to fetch`. La inspeccion de la
solicitud `OPTIONS` confirmo:

```text
HTTP 200
Allow: GET, HEAD, POST, OPTIONS
Access-Control-Allow-Origin: https://survey123.arcgis.com
Access-Control-Allow-Credentials: true
```

Sin embargo, la respuesta no incluyo:

```text
Access-Control-Allow-Methods: GET, HEAD, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

El encabezado HTTP `Allow` no sustituye a `Access-Control-Allow-Methods` en una
validacion CORS. Por esta razon el navegador puede bloquear el POST antes de
que la solicitud alcance el GP Service.

La operacion desde Field App queda validada. El uso desde Survey123 Web App
queda pendiente de correccion CORS en IIS, Web Adaptor, proxy inverso o
balanceador.

## 7. Ajuste requerido para habilitar la aplicacion web

El componente que publica `/server` debe conservar el encabezado de origen que
genera ArcGIS Server y agregar a las respuestas, incluidas las solicitudes
`OPTIONS`:

```text
Access-Control-Allow-Methods: GET, HEAD, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

No se debe duplicar `Access-Control-Allow-Origin`, porque ArcGIS Server ya
responde correctamente para `https://survey123.arcgis.com`.

Despues del ajuste, TI debe comprobar desde las herramientas de desarrollo del
navegador que el preflight `OPTIONS` contiene los tres encabezados CORS antes
de volver a probar una edicion real.

## 8. Prueba de aceptacion

1. Abrir Survey123 Field App con un usuario autorizado.
2. Actualizar la encuesta desde el dispositivo.
3. Sincronizar el Inbox.
4. Abrir un padre cuya validacion no sea `si`.
5. Cambiar la validacion a `si` y enviar la edicion.
6. Confirmar la creacion de un trabajo GP asincrono.
7. Confirmar que el trabajo termina con estado satisfactorio.
8. Revisar que la entidad aparece en la capa destino correspondiente.
9. Confirmar que `id_unique` contiene el GlobalID de la geometria hija.
10. Repetir el evento y verificar que no se crea una entidad duplicada.

## 9. Monitoreo y soporte

Ante una incidencia, revisar en este orden:

1. estado de sincronizacion de Survey123 Field App;
2. version descargada de la encuesta y configuracion del webhook;
3. disponibilidad publica del recurso REST del task;
4. trabajos y mensajes del GP Service;
5. logs de ArcGIS Server;
6. conectividad del GP con Portal, Survey y servicio destino;
7. permisos de edicion y adjuntos en el Feature Service destino;
8. existencia de `id_unique` y compatibilidad de relaciones.

La herramienta no crea archivos de log en ArcGIS Server. Todos los mensajes de
ejecucion se consultan en el trabajo GP y en los logs administrados por ArcGIS
Server.

## 10. Seguridad y operacion

El endpoint no recibe parametros y ejecuta una consulta global de pendientes
validados. `id_unique` protege contra duplicados, pero no evita que un tercero
invoque repetidamente el servicio si permanece anonimo.

TI CIREN debe evaluar:

- limitar el acceso de red al endpoint;
- aplicar controles en Web Adaptor, proxy o firewall de aplicaciones;
- monitorear frecuencia y origen de las llamadas;
- usar una cuenta tecnica con permisos minimos;
- rotar la contrasena segun la politica institucional;
- no guardar credenciales reales en Git ni en carpetas compartidas.

Si en el futuro se requiere validar el contenido del evento, aplicar una firma,
limitar el formulario de origen o controlar reintentos, se debe incorporar un
receptor institucional entre Survey123 y `submitJob`.

## 11. Resultado

El flujo operativo aprobado para la etapa actual es:

```text
Survey123 Field App + Inbox -> webhook directo -> GP Service -> SDE
```

La ejecucion desde Field App fue comprobada exitosamente. La habilitacion del
mismo flujo desde navegador es una mejora independiente y requiere completar
la configuracion CORS de la infraestructura web.
