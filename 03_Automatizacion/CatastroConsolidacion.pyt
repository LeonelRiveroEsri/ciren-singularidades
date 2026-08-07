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
TOOLBOX_DIR = Path(__file__).resolve().parent
if str(TOOLBOX_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLBOX_DIR))

from consolidar_survey import resolve_relationship_fields, run_consolidation  # noqa: E402


# CONFIGURACIÓN EMBEBIDA PARA PUBLICACIÓN.
# El técnico debe editar únicamente este bloque antes de publicar la PYT.
# Para el GP publicado no se depende de un archivo externo de credenciales.
# Complete usuario y contraseña inmediatamente antes de publicar. Distribuya en
# Git solamente esta plantilla con marcadores, nunca una copia configurada.
CONFIG_JSON = r'''
{
  "arcgis": {
    "url": "https://esri.ciren.cl/portal/",
    "username": "<USUARIO_PORTAL>",
    "password": "<CONTRASENA_PORTAL>"
  },
  "items": {
    "survey_feature_service": "3f283dcb6d0f42dead81fc9059509550",
    "target_feature_service": "1a2d5e2632524b709b0007c4c53841c4"
  },
  "consolidation": {
    "unique_field": "id_unique",
    "parent_where": "validacion = 'si'",
    "update_existing": false,
    "sync_attachments": true
  }
}
'''


def load_embedded_config():
    config = json.loads(CONFIG_JSON)
    required = {"arcgis", "items", "consolidation"}
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
    for key in ("url", "username", "password"):
        if not arcgis_config.get(key):
            raise RuntimeError("La credencial no contiene {}.".format(key))
    return GIS(
        arcgis_config["url"],
        arcgis_config["username"],
        arcgis_config["password"],
    )


def report_messages(report):
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
        arcpy.AddMessage(message)


def report_relationship_fields(gis, source_item_id):
    """Valida e informa el contrato relacional antes de consolidar."""
    source_item = gis.content.get(source_item_id)
    if source_item is None:
        raise ValueError("No se encontró el ítem Survey de origen.")
    tables = list(getattr(source_item, "tables", []) or [])
    layers = list(getattr(source_item, "layers", []) or [])
    if not tables:
        raise ValueError("El Survey de origen no contiene una tabla padre.")
    source_table = tables[0]
    for layer in layers:
        geometry_type = layer.properties.get("geometryType")
        if geometry_type not in ("esriGeometryPoint", "esriGeometryPolyline"):
            continue
        parent_key, child_key = resolve_relationship_fields(source_table, layer)
        arcpy.AddMessage(
            "Relación validada para {}: padre.{} -> hijo.{}".format(
                layer.properties.name, parent_key, child_key
            )
        )


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
        arcpy.SetProgressor("default", "Consolidando encuestas validadas...")
        arcpy.AddMessage("Inicio de consolidación incremental.")

        try:
            config = load_embedded_config()
            items = config["items"]
            consolidation = config["consolidation"]
            arcpy.AddMessage("Configuración JSON cargada correctamente.")
            arcpy.AddMessage("Filtro: {}".format(consolidation["parent_where"]))
            gis = connect_gis(config)
            report_relationship_fields(gis, items["survey_feature_service"])
            report = run_consolidation(
                gis=gis,
                source_item_id=items["survey_feature_service"],
                target_item_id=items["target_feature_service"],
                unique_field=consolidation["unique_field"],
                parent_where=consolidation["parent_where"],
                dry_run=False,
                update_existing=consolidation["update_existing"],
                sync_attachments=consolidation["sync_attachments"],
            )
            report_messages(report)

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

            arcpy.AddMessage("Consolidación finalizada correctamente.")
            arcpy.SetProgressorLabel("Proceso completado")
        except Exception as error:
            arcpy.AddError(str(error))
            raise arcpy.ExecuteError
        finally:
            arcpy.ResetProgressor()

