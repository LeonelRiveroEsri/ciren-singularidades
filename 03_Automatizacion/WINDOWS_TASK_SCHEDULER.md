# Renovación de tokens con Windows Task Scheduler

Esta tarea ejecuta `ActualizarTokensScheduler.py` sin interacción. El script carga la configuración y las credenciales desde las rutas definidas en `configuracion_ciren.json`, solicita un token nuevo mediante `POST /sharing/rest/generateToken`, simula primero la modificación de Arcade y solo escribe si encuentra exactamente `expected_matches` coincidencias.

## 1. Preparación

1. Copiar la carpeta completa `03_Automatizacion` al servidor o equipo de automatización.
2. Completar `configuracion_ciren.json` con la URL del portal, los IDs, `referer`, `expiration_minutes`, `expected_matches`, la ruta de credenciales y la carpeta de logs. Para 15 días usar `21600` minutos.
3. Crear el archivo de credenciales a partir de `credenciales.example.json`. Restringir sus permisos a la cuenta que ejecutará la tarea.
4. Confirmar que esa cuenta puede iniciar sesión en el portal y actualizar los Web Maps configurados.
5. Localizar `propy.bat`. La instalación estándar de ArcGIS Pro suele incluirlo en:

   ```text
   C:\Program Files\ArcGIS\Pro\bin\Python\Scripts\propy.bat
   ```

   Si la ruta es diferente, abrir **Python Command Prompt** de ArcGIS Pro y ejecutar `where propy.bat`.

## 2. Prueba controlada

Primero ejecutar `Actualizar_token_Arcade_CIREN.ipynb` con simulación y confirmar el valor real de `expected_matches`. Después probar la misma cuenta de Windows que usará la tarea:

```bat
"C:\Program Files\ArcGIS\Pro\bin\Python\Scripts\propy.bat" "C:\CIREN\Catastro\03_Automatizacion\ActualizarTokensScheduler.py"
```

Esta última orden realiza la actualización efectiva cuando la simulación coincide. No ejecutarla hasta completar y validar la configuración.

## 3. Crear la tarea

En **Programador de tareas > Crear tarea**:

- **General:** usar una cuenta técnica; seleccionar *Ejecutar tanto si el usuario inició sesión como si no*. Usar privilegios elevados únicamente si la política del servidor lo exige.
- **Desencadenador:** cada 10 días, antes del horario operativo, para renovar con margen un token solicitado por 15 días. Ajustar el intervalo si Portal aplica una vigencia efectiva menor.
- **Acción > Programa o script:** `C:\Program Files\ArcGIS\Pro\bin\Python\Scripts\propy.bat`
- **Agregar argumentos:** `"C:\CIREN\Catastro\03_Automatizacion\ActualizarTokensScheduler.py"`
- **Iniciar en:** `C:\CIREN\Catastro\03_Automatizacion`
- **Configuración:** si la tarea ya está en ejecución, no iniciar una instancia nueva; permitir reintento después de un fallo según la política operativa.

Las rutas anteriores son ejemplos de instalación, no rutas del ambiente de desarrollo. Reemplazarlas por la ubicación definitiva.

## 4. Resultado y monitoreo

| Código | Significado |
|---:|---|
| 0 | Renovación completada correctamente. |
| 1 | Configuración, credenciales, conexión u otro error general. |
| 2 | La cantidad encontrada no coincide con `expected_matches`; no se escribe ningún cambio. |
| 3 | No se actualizaron todos los ítems configurados. |

El detalle queda en `<logs.path>\Logs\ActualizarTokensScheduler.log`, usando exclusivamente el módulo `Lib/esrilogs.py`. El token y la contraseña nunca se registran.

Después de la primera ejecución programada, comprobar el **Último resultado** de la tarea, revisar el log y abrir los popups de punto y línea para confirmar que las fotografías se muestran correctamente.
