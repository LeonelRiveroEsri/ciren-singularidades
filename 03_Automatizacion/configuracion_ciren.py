"""Carga y validación de la configuración compartida de la solución CIREN."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

from arcgis.gis import GIS


DEFAULT_CONFIG_PATH = Path(__file__).resolve().with_name("configuracion_ciren.json")
CONFIG_PATH_ENV = "CIREN_CONFIG_PATH"


def load_config_sections(
    path: Optional[str], required_sections: Iterable[str]
) -> Dict[str, Any]:
    """Carga el JSON y valida solo las secciones usadas por un ejecutor."""
    config_path = Path(
        path or os.environ.get(CONFIG_PATH_ENV, str(DEFAULT_CONFIG_PATH))
    ).expanduser().resolve()
    if not config_path.exists():
        raise FileNotFoundError(f"No existe la configuracion: {config_path}")
    config = json.loads(config_path.read_text(encoding="utf-8"))

    required = set(required_sections)
    missing_sections = required - set(config)
    if missing_sections:
        raise ValueError(
            f"Faltan secciones de configuracion: {sorted(missing_sections)}"
        )
    scoped_config = {section: config[section] for section in required}
    placeholders = sorted(
        set(re.findall(r"<[^<>]+>", json.dumps(scoped_config)))
    )
    if placeholders:
        raise ValueError(
            "Configuracion incompleta. Reemplace los marcadores: "
            + ", ".join(placeholders)
        )
    return config


def load_solution_config(path: Optional[str] = None) -> Dict[str, Any]:
    config_path = Path(
        path or os.environ.get(CONFIG_PATH_ENV, str(DEFAULT_CONFIG_PATH))
    ).expanduser().resolve()
    if not config_path.exists():
        raise FileNotFoundError(f"No existe la configuración: {config_path}")
    config = json.loads(config_path.read_text(encoding="utf-8"))

    required_sections = {"arcgis", "items", "consolidation", "arcade_tokens"}
    missing_sections = required_sections - set(config)
    if missing_sections:
        raise ValueError(
            f"Faltan secciones de configuración: {sorted(missing_sections)}"
        )
    placeholders = sorted(set(re.findall(r"<[^<>]+>", json.dumps(config))))
    if placeholders:
        raise ValueError(
            "Configuraci?n incompleta. Reemplace los marcadores: "
            + ", ".join(placeholders)
        )
    return config


def load_credentials(config: Dict[str, Any]) -> Dict[str, str]:
    arcgis_config = config["arcgis"]
    credentials_path = Path(arcgis_config["credentials_file"]).expanduser()
    if not credentials_path.exists():
        raise FileNotFoundError(
            f"No existe el archivo de credenciales: {credentials_path}"
        )
    profiles = json.loads(credentials_path.read_text(encoding="utf-8"))
    profile_name = arcgis_config.get("credentials_profile", "PORTAL")
    if profile_name not in profiles:
        raise KeyError(f"No existe el perfil de credenciales {profile_name}.")
    credentials = profiles[profile_name]
    for key in ("url", "username", "password"):
        if not credentials.get(key):
            raise ValueError(f"La credencial no contiene {key}.")
    return credentials


def connect_gis_from_config(config: Dict[str, Any]) -> GIS:
    credentials = load_credentials(config)
    return GIS(
        credentials["url"],
        credentials["username"],
        credentials["password"],
    )
