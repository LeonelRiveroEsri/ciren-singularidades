# -*- coding: utf-8 -*-
"""Python Toolbox publicable para consolidar el Catastro de singularidades.

La herramienta no expone parámetros. Toda la selección es incremental:
validacion='si' + GlobalID hijo ausente en id_unique del destino.
"""

import json
import re
import sys
from pathlib import Path

import arcpy
from arcgis.gis import GIS
from Lib.esrilogs import Logfile, capturaError
TOOLBOX_DIR = Path(__file__).resolve().parent
if str(TOOLBOX_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLBOX_DIR))

from consolidar_survey import run_consolidation  # noqa: E402


# CONFIGURACIÓN EMBEBIDA PARA PUBLICACIÓN.
# El técnico debe editar únicamente este bloque antes de publicar la PYT.
# La contraseña permanece en un archivo externo protegido, nunca en la toolbox.
CONFIG_JSON = r'''
{
  "arcgis": {
    "credentials_file": "C:/CIREN/Seguridad/credenciales.json",
    "credentials_profile": "AGOL"
  },
  "items": {
    "survey_feature_service": "<ITEM_ID_SERVICIO_SURVEY>",
    "target_feature_service": "<ITEM_ID_SERVICIO_DESTINO>",
    "validation_dashboard": "<ITEM_ID_DASHBOARD_VALIDACION>",
    "review_webmap": "<ITEM_ID_WEBMAP_REVISION>",
    "edition_webmap": "<ITEM_ID_WEBMAP_EDICION>",
    "edition_form": "<ITEM_ID_FORM_EDICION>"
  },
  "consolidation": {
    "unique_field": "id_unique",
    "parent_where": "validacion = 'si'",
    "update_existing": false,
    "sync_attachments": true
  },
  "logs": {
    "path": "C:/CIREN/Logs",
    "max_age_days": 30,
    "rotate_mode": "archive"
  }
}
'''


def load_embedded_config():
    config = json.loads(CONFIG_JSON)
    required = {"arcgis", "items", "consolidation", "logs"}
    missing = required - set(config)
    if missing:
        raise ValueError("Faltan secciones en CONFIG_JSON: {}".format(sorted(missing)))
    placeholders = sorted(set(re.findall(r"<[^<>]+>", json.dumps(config))))
    if placeholders:
        raise ValueError(
            "CONFIG_JSON incompleto. Reemplace: {}".format(", ".join(placeholders))
        )
    return config


def connect_gis(config):
    arcgis_config = config["arcgis"]
    credentials_path = Path(arcgis_config["credentials_file"])
    if not credentials_path.exists():
        raise RuntimeError(
            "No existe el archivo de credenciales configurado: {}".format(
                credentials_path
            )
        )
    profiles = json.loads(credentials_path.read_text(encoding="utf-8"))
    profile_name = arcgis_config.get("credentials_profile", "AGOL")
    if profile_name not in profiles:
        raise RuntimeError("No existe el perfil de credenciales {}.".format(profile_name))
    credentials = profiles[profile_name]
    for key in ("url", "username", "password"):
        if not credentials.get(key):
            raise RuntimeError("La credencial no contiene {}.".format(key))
    return GIS(credentials["url"], credentials["username"], credentials["password"])


def report_messages(report, logs):
    for geometry_name, metrics in report.items():
        message = (
            "{} | origen={} | insertados={} | ya_cargados={} | filtrados={} | "
            "huerfanos={} | adjuntos={} | errores={}"
        ).format(
            geometry_name.upper(),
            metrics.get("source", 0),
            metrics.get("inserted", 0),
            metrics.get("already_loaded", 0),
            metrics.get("filtered", 0),
            metrics.get("orphaned", 0),
            metrics.get("attachments_copied", 0),
            metrics.get("failed", 0) + metrics.get("attachments_failed", 0),
        )
        logs.info(message)
        arcpy.AddMessage(message)


class Toolbox(object):
    def __init__(self):
        self.label = "Catastro de singularidades"
        self.alias = "catastro_singularidades"
        self.tools = [ConsolidarEncuestasValidadas]


class ConsolidarEncuestasValidadas(object):
    def __init__(self):
        self.label = "Consolidar encuestas validadas"
        self.description = (
            "Consolida atributos, punto/línea y adjuntos de registros validados, "
            "evitando duplicados mediante id_unique."
        )
        self.canRunInBackground = False

    def getParameterInfo(self):
        # Requisito de publicación: herramienta sin parámetros de entrada o salida.
        return []

    def isLicensed(self):
        return True

    def updateParameters(self, parameters):
        return

    def updateMessages(self, parameters):
        return

    def execute(self, parameters, messages):
        logs = None
        arcpy.SetProgressor("default", "Consolidando encuestas validadas...")
        arcpy.AddMessage("Inicio de consolidación incremental.")

        try:
            config = load_embedded_config()
            items = config["items"]
            consolidation = config["consolidation"]
            log_config = config["logs"]
            logs = Logfile(
                "CatastroConsolidacionGP",
                log_path=Path(log_config["path"]),
                max_age_days=log_config.get("max_age_days", 30),
                rotate_mode=log_config.get("rotate_mode", "archive"),
            )
            logs.start_script("Inicio de consolidacion GP")
            logs.info("Configuracion JSON embebida cargada correctamente")
            arcpy.AddMessage("Configuración JSON cargada correctamente.")
            arcpy.AddMessage("Filtro: {}".format(consolidation["parent_where"]))
            gis = connect_gis(config)
            report = run_consolidation(
                gis=gis,
                source_item_id=items["survey_feature_service"],
                target_item_id=items["target_feature_service"],
                unique_field=consolidation["unique_field"],
                parent_where=consolidation["parent_where"],
                dry_run=False,
                update_existing=consolidation["update_existing"],
                sync_attachments=consolidation["sync_attachments"],
                logs=logs,
            )
            report_messages(report, logs)

            failures = sum(
                values.get("failed", 0) + values.get("attachments_failed", 0)
                for values in report.values()
            )
            orphans = sum(values.get("orphaned", 0) for values in report.values())
            if failures or orphans:
                raise RuntimeError(
                    "La consolidación terminó con {} errores y {} huérfanos.".format(
                        failures, orphans
                    )
                )

            logs.end("Consolidacion finalizada correctamente")
            arcpy.AddMessage("Consolidación finalizada correctamente.")
            arcpy.SetProgressorLabel("Proceso completado")
        except Exception as error:
            if logs is not None:
                capturaError(error, "Error general de consolidacion GP", logs)
            arcpy.AddError(str(error))
            raise arcpy.ExecuteError
        finally:
            if logs is not None:
                logs.close("Proceso GP finalizado")
            arcpy.ResetProgressor()

