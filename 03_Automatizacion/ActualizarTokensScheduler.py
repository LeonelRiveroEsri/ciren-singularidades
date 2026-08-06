"""Ejecuci?n no interactiva para Windows Task Scheduler.

Actualiza los tokens de las expresiones Arcade configuradas. Antes de escribir,
realiza una simulaci?n y exige la cantidad exacta de coincidencias esperadas.
"""

import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
os.chdir(SCRIPT_DIR)
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from Lib.esrilogs import Logfile, capturaError
from actualizar_tokens_arcade import refresh_item_tokens
from configuracion_ciren import connect_gis_from_config, load_solution_config


def main() -> int:
    logs = None
    try:
        config = load_solution_config(str(SCRIPT_DIR / "configuracion_ciren.json"))
        log_config = config["logs"]
        logs = Logfile(
            "ActualizarTokensScheduler",
            log_path=Path(log_config["path"]),
            max_age_days=log_config.get("max_age_days", 30),
            rotate_mode=log_config.get("rotate_mode", "archive"),
        )
        logs.start_script("Inicio tarea programada de tokens Arcade")

        token_config = config["arcade_tokens"]
        item_ids = token_config["item_ids"]
        expected_matches = int(token_config["expected_matches"])
        gis = connect_gis_from_config(config)
        logs.info("Conexion GIS autenticada")

        simulation = refresh_item_tokens(
            gis, item_ids, dry_run=True, logs=logs
        )
        matches = sum(item["matches"] for item in simulation)
        logs.info(
            f"Simulacion completada: {matches} coincidencias; "
            f"esperadas: {expected_matches}"
        )
        if matches != expected_matches:
            logs.error(
                "Actualizacion cancelada por diferencia en expected_matches"
            )
            return 2

        items_without_matches = [
            item["item_id"] for item in simulation if item["matches"] == 0
        ]
        if items_without_matches:
            logs.error(
                "Actualizacion cancelada: hay items sin coincidencias Arcade: "
                + ", ".join(items_without_matches)
            )
            return 2

        result = refresh_item_tokens(
            gis, item_ids, dry_run=False, logs=logs
        )
        updated_items = sum(1 for item in result if item["updated"])
        if updated_items != len(item_ids):
            logs.error(
                f"Solo se actualizaron {updated_items} de {len(item_ids)} items"
            )
            return 3

        logs.end(
            f"Renovacion correcta: {updated_items} items, "
            f"{matches} expresiones"
        )
        return 0
    except Exception as error:
        if logs is not None:
            capturaError(error, "Error en tarea programada de tokens", logs)
        else:
            # El logger puede no existir si la configuraci?n a?n es inv?lida.
            print(f"ERROR DE CONFIGURACION: {error}", file=sys.stderr)
        return 1
    finally:
        if logs is not None:
            logs.close("Tarea programada finalizada")


if __name__ == "__main__":
    sys.exit(main())
