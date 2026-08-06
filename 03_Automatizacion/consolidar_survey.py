"""Consolidación Survey123: tabla padre + geometrías hijas + adjuntos.

El módulo no se ejecuta por sí solo. Está diseñado para ser llamado desde
001.ipynb y mantener la lógica comprobable y reutilizable.
"""

from __future__ import annotations

import tempfile
import traceback
from collections import Counter
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from arcgis.features import Feature, FeatureLayer
from arcgis.gis import GIS


def _log(logs, level: str, message: str):
    """Registra mediante Lib.esrilogs cuando el proceso principal entrega un log."""
    if logs is not None:
        getattr(logs, level)(message)

SYSTEM_FIELD_TYPES = {
    "esriFieldTypeOID",
    "esriFieldTypeGlobalID",
    "esriFieldTypeGeometry",
}

SYSTEM_FIELD_NAMES = {
    "shape",
    "shape__area",
    "shape__length",
    "creationdate",
    "creator",
    "editdate",
    "editor",
    "created_user",
    "created_date",
    "last_edited_user",
    "last_edited_date",
}


def normalize_guid(value: Any) -> str:
    """Normaliza un GUID para comparaciones estables."""
    if value is None:
        return ""
    return str(value).strip().strip("{}").lower()


def service_parts(item) -> Tuple[List[FeatureLayer], FeatureLayer]:
    """Valida y devuelve capas de geometría y tabla del Survey."""
    layers = list(getattr(item, "layers", []) or [])
    tables = list(getattr(item, "tables", []) or [])
    if not layers or not tables:
        raise ValueError("El ítem Survey debe contener capas y al menos una tabla.")
    return layers, tables[0]


def layer_by_geometry(layers: Iterable[FeatureLayer]) -> Dict[str, FeatureLayer]:
    result = {}
    for layer in layers:
        geometry_type = layer.properties.get("geometryType")
        if geometry_type:
            result[geometry_type] = layer
    return result


def validate_schema(source_item, target_item, unique_field: str) -> Dict[str, Any]:
    """Comprueba la topología de servicios requerida, sin editar datos."""
    source_layers, source_table = service_parts(source_item)
    target_layers = list(getattr(target_item, "layers", []) or [])
    source_by_type = layer_by_geometry(source_layers)
    target_by_type = layer_by_geometry(target_layers)
    required = {"esriGeometryPoint", "esriGeometryPolyline"}

    missing_source = required - set(source_by_type)
    missing_target = required - set(target_by_type)
    if missing_source or missing_target:
        raise ValueError(
            f"Geometrías faltantes. Origen={sorted(missing_source)}, "
            f"destino={sorted(missing_target)}"
        )
    if not source_table.properties.get("hasAttachments"):
        raise ValueError("La tabla padre no tiene adjuntos habilitados.")

    for geometry_type, layer in target_by_type.items():
        names = {f["name"].lower() for f in layer.properties.fields}
        if unique_field.lower() not in names:
            raise ValueError(
                f"{layer.properties.name} no contiene la clave {unique_field}."
            )
        if not layer.properties.get("hasAttachments"):
            raise ValueError(
                f"{layer.properties.name} no tiene adjuntos habilitados."
            )

    return {
        "source_table": source_table,
        "source_by_type": source_by_type,
        "target_by_type": target_by_type,
    }


def query_features(
    layer: FeatureLayer,
    where: str = "1=1",
    return_geometry: bool = True,
) -> List[Feature]:
    return layer.query(
        where=where,
        out_fields="*",
        return_geometry=return_geometry,
        return_all_records=True,
    ).features


def casefold_attributes(attributes: Dict[str, Any]) -> Dict[str, Any]:
    return {str(key).lower(): value for key, value in attributes.items()}


def editable_target_fields(layer: FeatureLayer, unique_field: str) -> Dict[str, str]:
    """Mapa nombre-en-minúscula -> nombre real para campos editables."""
    result = {}
    for field in layer.properties.fields:
        name = field["name"]
        lowered = name.lower()
        if field["type"] in SYSTEM_FIELD_TYPES:
            continue
        if lowered in SYSTEM_FIELD_NAMES:
            continue
        if lowered == unique_field.lower():
            continue
        result[lowered] = name
    return result


def build_attributes(
    parent_attributes: Dict[str, Any],
    child_globalid: str,
    target_layer: FeatureLayer,
    unique_field: str,
    field_overrides: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Adapta campos del padre al esquema del destino."""
    source = casefold_attributes(parent_attributes)
    editable = editable_target_fields(target_layer, unique_field)
    attributes: Dict[str, Any] = {}

    for source_name, value in source.items():
        target_name = editable.get(source_name)
        if target_name:
            attributes[target_name] = value

    for source_name, target_name in (field_overrides or {}).items():
        value = source.get(source_name.lower())
        real_target = editable.get(target_name.lower())
        if real_target and value is not None:
            attributes[real_target] = value

    unique_real_name = next(
        f["name"]
        for f in target_layer.properties.fields
        if f["name"].lower() == unique_field.lower()
    )
    attributes[unique_real_name] = "{" + normalize_guid(child_globalid) + "}"
    return attributes


def field_names(layer: FeatureLayer) -> Dict[str, str]:
    """Devuelve nombre normalizado -> nombre real para una capa o tabla."""
    return {
        str(field["name"]).lower(): str(field["name"])
        for field in layer.properties.fields
    }


def resolve_relationship_fields(
    source_table: FeatureLayer,
    source_layer: FeatureLayer,
) -> Tuple[str, str]:
    """Detecta la clave relacional usada por la publicación de Survey123."""
    parent_names = field_names(source_table)
    child_names = field_names(source_layer)
    supported_pairs = (
        ("uniquerowid", "parentrowid"),
        ("globalid", "parentglobalid"),
    )

    for parent_key, child_key in supported_pairs:
        if parent_key in parent_names and child_key in child_names:
            return parent_names[parent_key], child_names[child_key]

    raise ValueError(
        "No se encontró una relación compatible entre la tabla padre '{}' y "
        "la capa hija '{}'. Se esperaba uniquerowid→parentrowid o "
        "globalid→parentglobalid. Campos padre: {}; campos hijo: {}.".format(
            source_table.properties.name,
            source_layer.properties.name,
            sorted(parent_names.values()),
            sorted(child_names.values()),
        )
    )


def build_parent_index(
    parent_features: Iterable[Feature],
    parent_key_field: str = "globalid",
) -> Dict[str, Feature]:
    index = {}
    for feature in parent_features:
        attributes = casefold_attributes(feature.attributes)
        key = normalize_guid(attributes.get(parent_key_field.lower()))
        if key:
            index[key] = feature
    return index


def build_target_index(
    target_features: Iterable[Feature], unique_field: str
) -> Dict[str, Feature]:
    index = {}
    for feature in target_features:
        attributes = casefold_attributes(feature.attributes)
        key = normalize_guid(attributes.get(unique_field.lower()))
        if key:
            if key in index:
                raise ValueError(f"Clave duplicada en destino: {key}")
            index[key] = feature
    return index


def result_success(result: Dict[str, Any]) -> bool:
    return bool(result and result.get("success"))


def geometry_for_target_z(
    geometry: Optional[Dict[str, Any]], target_layer: FeatureLayer
) -> Optional[Dict[str, Any]]:
    """Completa Z=1 cuando el servicio destino exige geometrías con Z.

    Survey123 puede entregar puntos o líneas 2D aunque la capa publicada desde
    SDE tenga ``hasZ=true``. La API REST rechaza esos vértices; por eso se
    agrega la tercera coordenada sin modificar XY, M ni la referencia espacial.
    """
    if geometry is None or not target_layer.properties.get("hasZ", False):
        return geometry

    output = dict(geometry)
    source_has_z = bool(output.get("hasZ", False))
    source_has_m = bool(output.get("hasM", False))

    if "x" in output and "y" in output:
        if output.get("z") is None:
            output["z"] = 1
        output["hasZ"] = True
        return output

    def vertex_with_z(vertex):
        if not isinstance(vertex, (list, tuple)) or len(vertex) < 2:
            return vertex
        coordinates = list(vertex)
        if source_has_z:
            if len(coordinates) < 3:
                coordinates.append(1)
            elif coordinates[2] is None:
                coordinates[2] = 1
        else:
            # En una geometría con M pero sin Z, M ocupa la tercera posición.
            # Insertar preserva el orden REST esperado: X, Y, Z, M.
            coordinates.insert(2, 1)
        return coordinates

    for collection_name in ("paths", "rings", "points"):
        collections = output.get(collection_name)
        if collections is None:
            continue
        if collection_name == "points":
            output[collection_name] = [vertex_with_z(vertex) for vertex in collections]
        else:
            output[collection_name] = [
                [vertex_with_z(vertex) for vertex in part] for part in collections
            ]

    output["hasZ"] = True
    if source_has_m:
        output["hasM"] = True
    return output


def edit_one(
    target_layer: FeatureLayer,
    payload: Feature,
    operation: str,
) -> Tuple[bool, Optional[int], Dict[str, Any]]:
    if operation == "add":
        response = target_layer.edit_features(adds=[payload])
        result = (response.get("addResults") or [{}])[0]
    else:
        response = target_layer.edit_features(updates=[payload])
        result = (response.get("updateResults") or [{}])[0]
    object_id = result.get("objectId")
    return result_success(result), object_id, result


def attachment_signature(info: Dict[str, Any]) -> Tuple[str, Optional[int]]:
    return (str(info.get("name", "")).casefold(), info.get("size"))


def copy_missing_attachments(
    source_table: FeatureLayer,
    source_oid: int,
    target_layer: FeatureLayer,
    target_oid: int,
    dry_run: bool,
    logs=None,
) -> Dict[str, int]:
    """Copia adjuntos faltantes comparando nombre y tamaño; nunca elimina."""
    source_infos = source_table.attachments.get_list(source_oid)
    target_infos = (
        target_layer.attachments.get_list(target_oid) if target_oid >= 0 else []
    )
    existing = {attachment_signature(info) for info in target_infos}
    summary = Counter(found=len(source_infos), copied=0, skipped=0, failed=0)

    with tempfile.TemporaryDirectory(prefix="survey_attachments_") as temp_dir:
        for info in source_infos:
            signature = attachment_signature(info)
            if signature in existing:
                summary["skipped"] += 1
                continue
            if dry_run:
                summary["copied"] += 1
                continue

            try:
                downloaded = source_table.attachments.download(
                    oid=source_oid,
                    attachment_id=info["id"],
                    save_path=temp_dir,
                )
                if isinstance(downloaded, (list, tuple)):
                    downloaded = downloaded[0]
                response = target_layer.attachments.add(target_oid, str(downloaded))
                add_result = response.get("addAttachmentResult", response)
                if result_success(add_result):
                    summary["copied"] += 1
                    existing.add(signature)
                else:
                    summary["failed"] += 1
                    _log(logs, "error", f"Error agregando adjunto: {response}")
            except Exception as error:
                summary["failed"] += 1
                if logs is not None:
                    logs.error(
                        f"Error copiando adjunto {info.get('name')} del OID {source_oid}"
                    )
                    logs.error(str(error))
                    logs.error(traceback.format_exc())
    return dict(summary)


def consolidate_geometry_type(
    source_table: FeatureLayer,
    source_layer: FeatureLayer,
    target_layer: FeatureLayer,
    parent_index: Dict[str, Feature],
    selected_parent_ids: set,
    unique_field: str,
    dry_run: bool,
    update_existing: bool,
    sync_attachments: bool,
    field_overrides: Optional[Dict[str, str]] = None,
    child_parent_field: str = "parentglobalid",
    logs=None,
) -> Dict[str, int]:
    """Consolida un tipo geométrico y devuelve métricas del proceso."""
    summary = Counter(
        source=0,
        inserted=0,
        updated=0,
        already_loaded=0,
        orphaned=0,
        filtered=0,
        failed=0,
        attachments_copied=0,
        attachments_skipped=0,
        attachments_failed=0,
    )
    children = query_features(source_layer, return_geometry=True)
    existing_features = query_features(target_layer, return_geometry=False)
    target_index = build_target_index(existing_features, unique_field)
    target_oid_name = target_layer.properties.objectIdField
    parent_oid_name = source_table.properties.objectIdField

    for child in children:
        summary["source"] += 1
        child_attributes = casefold_attributes(child.attributes)
        child_globalid = normalize_guid(child_attributes.get("globalid"))
        parent_row_key = normalize_guid(child_attributes.get(child_parent_field.lower()))
        parent = parent_index.get(parent_row_key)
        if not child_globalid or parent is None:
            summary["orphaned"] += 1
            _log(
                logs,
                "warning",
                f"Geometría sin padre o GlobalID usando {child_parent_field}: "
                f"{child.attributes}",
            )
            continue
        if parent_row_key not in selected_parent_ids:
            summary["filtered"] += 1
            continue

        attributes = build_attributes(
            parent.attributes,
            child_globalid,
            target_layer,
            unique_field,
            field_overrides,
        )
        existing = target_index.get(child_globalid)
        operation = "update" if existing else "add"

        if existing and not update_existing:
            # id_unique conserva el GlobalID del hijo: ya fue consolidado.
            summary["already_loaded"] += 1
            continue

        if existing:
            existing_attrs = casefold_attributes(existing.attributes)
            target_oid = existing_attrs[target_oid_name.lower()]
            attributes[target_oid_name] = target_oid
        else:
            target_oid = None

        target_geometry = geometry_for_target_z(child.geometry, target_layer)
        payload = Feature(geometry=target_geometry, attributes=attributes)
        if dry_run:
            success = True
            if operation == "add":
                summary["inserted"] += 1
            else:
                summary["updated"] += 1
        else:
            success, result_oid, result = edit_one(target_layer, payload, operation)
            if not success:
                summary["failed"] += 1
                _log(logs, "error", f"Fallo {operation} de {child_globalid}: {result}")
                continue
            target_oid = result_oid if operation == "add" else target_oid
            summary["inserted" if operation == "add" else "updated"] += 1

        if sync_attachments and (dry_run or target_oid is not None):
            parent_attrs = casefold_attributes(parent.attributes)
            parent_oid = parent_attrs[parent_oid_name.lower()]
            attachment_summary = copy_missing_attachments(
                source_table,
                parent_oid,
                target_layer,
                target_oid or -1,
                dry_run,
                logs,
            )
            summary["attachments_copied"] += attachment_summary["copied"]
            summary["attachments_skipped"] += attachment_summary["skipped"]
            summary["attachments_failed"] += attachment_summary["failed"]

    return dict(summary)


def run_consolidation(
    gis: GIS,
    source_item_id: str,
    target_item_id: str,
    unique_field: str = "id_unique",
    parent_where: str = "validacion = 'si'",
    dry_run: bool = True,
    update_existing: bool = False,
    sync_attachments: bool = True,
    logs=None,
) -> Dict[str, Dict[str, int]]:
    """Ejecuta la consolidación completa de puntos y líneas."""
    source_item = gis.content.get(source_item_id)
    target_item = gis.content.get(target_item_id)
    if source_item is None or target_item is None:
        raise ValueError("No se encontró el ítem de origen o destino.")

    schema = validate_schema(source_item, target_item, unique_field)
    source_table = schema["source_table"]
    all_parents = query_features(source_table, where="1=1", return_geometry=False)
    selected_parents = query_features(
        source_table, where=parent_where, return_geometry=False
    )
    relationship_fields = {}
    for geometry_type in ("esriGeometryPoint", "esriGeometryPolyline"):
        relationship_fields[geometry_type] = resolve_relationship_fields(
            source_table,
            schema["source_by_type"][geometry_type],
        )

    parent_indexes = {}
    selected_parent_ids = {}
    for geometry_type, (parent_key, child_key) in relationship_fields.items():
        parent_indexes[geometry_type] = build_parent_index(all_parents, parent_key)
        selected_parent_ids[geometry_type] = set(
            build_parent_index(selected_parents, parent_key)
        )
        _log(
            logs,
            "info",
            f"Relación {geometry_type}: {parent_key} -> {child_key}; "
            f"padres seleccionados: {len(selected_parent_ids[geometry_type])}",
        )

    # Mapeo explícito de cotas según la geometría y la lógica del XLSForm:
    # - Punto: cota = GPS automática; cota_manual = captura manual.
    # - Línea: cota = inicial manual; cota_manual = final manual.
    overrides_by_type = {
        "esriGeometryPoint": {
            "cota": "cota",
            "cota_manual": "cota_manual",
        },
        "esriGeometryPolyline": {
            "cota": "cota_inicial",
            "cota_manual": "cota_final",
        },
    }

    # Bloquea la ejecución si el servicio destino aún no refleja el contrato final.
    for geometry_type, mapping in overrides_by_type.items():
        target_names = {
            field["name"].lower()
            for field in schema["target_by_type"][geometry_type].properties.fields
        }
        missing = {
            target_name for target_name in mapping.values()
            if target_name.lower() not in target_names
        }
        if missing:
            layer_name = schema["target_by_type"][geometry_type].properties.name
            raise ValueError(
                f"El destino {layer_name} no cumple el mapeo de cotas. "
                f"Faltan: {sorted(missing)}"
            )
    report = {}
    for geometry_type, report_name in (
        ("esriGeometryPoint", "puntos"),
        ("esriGeometryPolyline", "lineas"),
    ):
        report[report_name] = consolidate_geometry_type(
            source_table=source_table,
            source_layer=schema["source_by_type"][geometry_type],
            target_layer=schema["target_by_type"][geometry_type],
            parent_index=parent_indexes[geometry_type],
            selected_parent_ids=selected_parent_ids[geometry_type],
            unique_field=unique_field,
            dry_run=dry_run,
            update_existing=update_existing,
            sync_attachments=sync_attachments,
            field_overrides=overrides_by_type[geometry_type],
            child_parent_field=relationship_fields[geometry_type][1],
            logs=logs,
        )
    return report

