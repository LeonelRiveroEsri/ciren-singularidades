"""Entrada no interactiva para renovar tokens Arcade mediante un programador."""

import sys
from pathlib import Path

from Lib.esrilogs import Logfile, capturaError
from actualizar_tokens_arcade import refresh_item_tokens
from configuracion_ciren import connect_gis_from_config, load_solution_config


def main() -> int:
    config = load_solution_config()
    log_config = config["logs"]
    logs = Logfile(
        "ActualizarTokensArcade",
        log_path=Path(log_config["path"]),
        max_age_days=log_config.get("max_age_days", 30),
        rotate_mode=log_config.get("rotate_mode", "archive"),
    )
    logs.start_script("Inicio de renovacion de tokens Arcade")

    try:
        token_config = config["arcade_tokens"]
        item_ids = token_config["item_ids"]
        expected_matches = token_config["expected_matches"]
        gis = connect_gis_from_config(config)
        logs.info("Conexion GIS autenticada")

        simulation = refresh_item_tokens(gis, item_ids, dry_run=True, logs=logs)
        matches = sum(item["matches"] for item in simulation)
        logs.info(f"Simulacion: {matches} asignaciones localizadas")
        if matches != expected_matches:
            logs.error(
                f"Actualizacion cancelada: se esperaban {expected_matches} "
                f"coincidencias y se hallaron {matches}"
            )
            return 2

        result = refresh_item_tokens(gis, item_ids, dry_run=False, logs=logs)
        updated_items = sum(1 for item in result if item["updated"])
        logs.end(
            f"Renovacion completada: {updated_items} items y {matches} expresiones"
        )
        return 0 if updated_items == len(item_ids) else 1
    except Exception as error:
        capturaError(error, "Error general actualizando tokens Arcade", logs)
        return 1
    finally:
        logs.close("Proceso de tokens finalizado")


if __name__ == "__main__":
    sys.exit(main())
