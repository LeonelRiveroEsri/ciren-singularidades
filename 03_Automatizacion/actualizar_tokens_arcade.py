"""Renovación segura de variables token en Arcade de Web Maps/Dashboards."""

from __future__ import annotations

import copy
import json
import re
from dataclasses import dataclass, asdict
from typing import Any, Dict, Iterable, List
from urllib import error, parse, request

from arcgis.gis import GIS


# Admite comillas simples/dobles, espacios, saltos de línea y punto y coma opcional.
TOKEN_ASSIGNMENT_PATTERN = re.compile(
    r"(?P<prefix>\bvar\s+token\s*=\s*)"
    r"(?P<quote>['\"])"
    r"(?P<value>.*?)"
    r"(?P=quote)"
    r"(?P<suffix>\s*;?)",
    flags=re.IGNORECASE | re.DOTALL,
)


@dataclass
class ItemTokenReport:
    item_id: str
    title: str
    item_type: str
    matches: int
    updated: bool
    paths: List[str]


def replace_token_in_text(text: str, new_token: str):
    """Reemplaza solo el valor; preserva formato, comillas y delimitadores."""
    count = 0

    def replacement(match):
        nonlocal count
        count += 1
        return (
            match.group("prefix")
            + match.group("quote")
            + new_token
            + match.group("quote")
            + match.group("suffix")
        )

    return TOKEN_ASSIGNMENT_PATTERN.sub(replacement, text), count


def _replace_mutable(value: Any, new_token: str, path: str = "$"):
    matches = 0
    paths: List[str] = []
    if isinstance(value, dict):
        for key, child in list(value.items()):
            child_path = f"{path}.{key}"
            if isinstance(child, str):
                replaced, count = replace_token_in_text(child, new_token)
                if count:
                    value[key] = replaced
                    matches += count
                    paths.append(child_path)
            else:
                count, found_paths = _replace_mutable(child, new_token, child_path)
                matches += count
                paths.extend(found_paths)
    elif isinstance(value, list):
        for index, child in enumerate(list(value)):
            child_path = f"{path}[{index}]"
            if isinstance(child, str):
                replaced, count = replace_token_in_text(child, new_token)
                if count:
                    value[index] = replaced
                    matches += count
                    paths.append(child_path)
            else:
                count, found_paths = _replace_mutable(child, new_token, child_path)
                matches += count
                paths.extend(found_paths)
    return matches, paths


def generate_portal_token(
    portal_url: str,
    username: str,
    password: str,
    referer: str,
    expiration_minutes: int = 21600,
    timeout_seconds: int = 60,
) -> str:
    """Solicita a Portal un token ligado a referer mediante generateToken.

    ArcGIS interpreta ``expiration`` en minutos. El Portal puede aplicar una
    vigencia menor si su política de seguridad limita el valor solicitado.
    """
    portal_root = portal_url.rstrip("/")
    if portal_root.endswith("/sharing/rest"):
        portal_root = portal_root[: -len("/sharing/rest")]
    if not portal_root.lower().startswith("https://"):
        raise ValueError("portal_url debe utilizar HTTPS.")
    if not referer or not referer.lower().startswith("https://"):
        raise ValueError("referer debe ser una URL HTTPS.")
    if int(expiration_minutes) <= 0:
        raise ValueError("expiration_minutes debe ser mayor que cero.")

    token_url = f"{portal_root}/sharing/rest/generateToken"
    payload = parse.urlencode(
        {
            "username": username,
            "password": password,
            "client": "referer",
            "referer": referer,
            "expiration": int(expiration_minutes),
            "f": "json",
        }
    ).encode("utf-8")
    token_request = request.Request(
        token_url,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with request.urlopen(token_request, timeout=int(timeout_seconds)) as response:
            result = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        raise RuntimeError(f"generateToken respondió HTTP {exc.code}.") from exc
    except error.URLError as exc:
        raise RuntimeError(f"No fue posible conectar con generateToken: {exc.reason}") from exc

    if "error" in result:
        rest_error = result["error"]
        message = rest_error.get("message", "Error REST sin descripción")
        details = "; ".join(rest_error.get("details") or [])
        raise RuntimeError(
            f"generateToken rechazó la solicitud: {message}"
            + (f" ({details})" if details else "")
        )
    token = result.get("token")
    if not token:
        raise RuntimeError("generateToken no devolvió un token.")
    return token


def refresh_item_tokens(
    gis: GIS,
    item_ids: Iterable[str],
    new_token: str,
    dry_run: bool = True,
    logs=None,
) -> List[Dict[str, Any]]:
    """Actualiza tokens en los JSON de los ítems indicados."""
    if not new_token:
        raise ValueError("new_token es obligatorio.")
    reports = []

    for item_id in item_ids:
        item = gis.content.get(item_id)
        if logs is not None:
            logs.info(f"Revisando item Arcade: {item_id}")
        if item is None:
            raise ValueError(f"No se encontró el ítem {item_id}.")
        if item.type not in {"Web Map", "Dashboard"}:
            raise ValueError(
                f"El ítem {item_id} es {item.type}; solo se admiten Web Map/Dashboard."
            )

        original = item.get_data()
        if not isinstance(original, (dict, list)):
            raise ValueError(f"El ítem {item_id} no contiene JSON actualizable.")
        updated_data = copy.deepcopy(original)
        matches, paths = _replace_mutable(updated_data, new_token)
        updated = False

        if logs is not None:
            logs.info(f"Coincidencias var token en {item.title}: {matches}")

        if matches and not dry_run:
            updated = bool(item.update(data=updated_data))
            if not updated:
                raise RuntimeError(f"ArcGIS rechazó la actualización de {item_id}.")

        if logs is not None and updated:
            logs.info(f"Token Arcade actualizado en: {item.title}")
        elif logs is not None and not matches:
            logs.warning(f"No se encontraron variables var token en: {item.title}")

        reports.append(
            asdict(
                ItemTokenReport(
                    item_id=item.id,
                    title=item.title,
                    item_type=item.type,
                    matches=matches,
                    updated=updated,
                    paths=paths,
                )
            )
        )
    return reports
