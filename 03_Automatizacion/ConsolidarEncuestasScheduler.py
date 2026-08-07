"""Consolidacion incremental para Windows Task Scheduler.

Alternativa operativa al webhook para ambientes donde Survey123 Web no puede
invocar el GP Service por restricciones CORS. Reutiliza la misma logica de la
Python Toolbox y registra la ejecucion exclusivamente con Lib.esrilogs.
"""

import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
os.chdir(SCRIPT_DIR)
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

# Una tarea de servidor no debe intentar instalar paquetes durante la ejecucion.
os.environ.setdefault("ESRILOGS_RICH_AUTOINSTALL", "0")

from Lib.esrilogs import Logfile, capturaError
from configuracion_ciren import (
    connect_gis_from_config,
    load_config_sections,
)
from consolidar_survey import run_consolidation


def report_metrics(report, logs):
    """Registra un resumen estable para puntos y lineas."""
    for geometry_name, metrics in report.items():
        errors = metrics.get("failed", 0) + metrics.get("attachments_failed", 0)
        logs.info(
            "{} | origen={} | insertados={} | actualizados={} | "
            "ya_cargados={} | filtrados={} | huerfanos={} | "
            "adjuntos={} | errores={}".format(
                geometry_name.upper(),
                metrics.get("source", 0),
                metrics.get("inserted", 0),
                metrics.get("updated", 0),
                metrics.get("already_loaded", 0),
                metrics.get("filtered", 0),
                metrics.get("orphaned", 0),
                metrics.get("attachments_copied", 0),
                errors,
            )
        )


def main() -> int:
    logs = None
    try:
        config = load_config_sections(
            str(SCRIPT_DIR / "configuracion_ciren.json"),
            ("arcgis", "items", "consolidation", "logs"),
        )
        log_config = config["logs"]
        logs = Logfile(
            "ConsolidarEncuestasScheduler",
            log_path=Path(log_config["path"]),
            max_age_days=log_config.get("max_age_days", 30),
            rotate_mode=log_config.get("rotate_mode", "archive"),
        )
        logs.start_script("Inicio consolidacion programada de singularidades")

        items = config["items"]
        consolidation = config["consolidation"]
        logs.info(
            "Configuracion validada; filtro: {}".format(
                consolidation["parent_where"]
            )
        )
        gis = connect_gis_from_config(config)
        logs.info("Conexion GIS autenticada")

        report = run_consolidation(
            gis=gis,
            source_item_id=items["survey_feature_service"],
            target_item_id=items["target_feature_service"],
            unique_field=consolidation["unique_field"],
            parent_where=consolidation["parent_where"],
            dry_run=False,
            update_existing=bool(consolidation.get("update_existing", False)),
            sync_attachments=bool(consolidation.get("sync_attachments", True)),
            logs=logs,
        )
        report_metrics(report, logs)

        failures = sum(
            values.get("failed", 0) + values.get("attachments_failed", 0)
            for values in report.values()
        )
        orphans = sum(values.get("orphaned", 0) for values in report.values())
        if failures or orphans:
            logs.error(
                "Consolidacion incompleta: {} errores y {} huerfanos".format(
                    failures, orphans
                )
            )
            return 2

        inserted = sum(values.get("inserted", 0) for values in report.values())
        updated = sum(values.get("updated", 0) for values in report.values())
        attachments = sum(
            values.get("attachments_copied", 0) for values in report.values()
        )
        logs.end(
            "Consolidacion correcta: {} insertados, {} actualizados, "
            "{} adjuntos".format(inserted, updated, attachments)
        )
        return 0
    except Exception as error:
        if logs is not None:
            capturaError(error, "Error en consolidacion programada", logs)
        else:
            print(f"ERROR DE CONFIGURACION: {error}", file=sys.stderr)
        return 1
    finally:
        if logs is not None:
            logs.close("Tarea programada de consolidacion finalizada")


if __name__ == "__main__":
    sys.exit(main())
