// Expresión de datos Arcade para ArcGIS Dashboards.
// Genera una AOI poligonal por registro padre y conserva su esquema completo.

// =====================================================
// 1. CONFIGURACIÓN DEL AMBIENTE DESTINO
// =====================================================
var portal = Portal("https://esri.ciren.cl/portal/");
var surveyItemId = "3f283dcb6d0f42dead81fc9059509550";

// IDs REST del servicio Survey: confirmar después de publicar.
var parentTableId = 0;
var pointLayerId = 1;
var lineLayerId = 2;

var pointBufferMeters = 50;
var lineBufferMeters = 25;

// Ejemplo para mostrar solo aprobados: "validacion = 'si'".
var parentWhere = "1=1";

// =====================================================
// 2. FUNCIONES DE APOYO
// =====================================================
function safeText(value, fallback) {
  if (IsEmpty(value)) {
    return fallback;
  }
  return Text(value);
}

function htmlEncode(value, fallback) {
  var result = safeText(value, fallback);
  result = Replace(result, "&", "&amp;");
  result = Replace(result, "<", "&lt;");
  result = Replace(result, ">", "&gt;");
  result = Replace(result, '"', "&quot;");
  return Replace(result, "'", "&#39;");
}

// Text(JSON) no conserva Date como milisegundos. Esta conversión mantiene
// los campos de fecha utilizables en filtros, selectores y acciones.
function outputValue(value, fieldType) {
  if (IsEmpty(value)) {
    return null;
  }
  if (fieldType == "esriFieldTypeDate") {
    return Number(value);
  }
  if (
    fieldType == "esriFieldTypeGlobalID" ||
    fieldType == "esriFieldTypeGUID"
  ) {
    return Text(value);
  }
  return value;
}

function detailValue(value, valueType) {
  if (IsEmpty(value)) return "";
  if (valueType == "date") return Text(value, "DD-MM-YYYY");
  if (valueType == "datetime") return Text(value, "DD-MM-YYYY HH:mm");
  if (valueType == "integer") return Text(Number(value), "#,###");
  if (valueType == "decimal") return Text(Number(value), "#,###.00");
  if (valueType == "coordinate") return Text(Number(value), "0.000000");
  return htmlEncode(value, "");
}

// Mismo mapeo de arcadePopupProfesionalLineas.js.
var popupSections = [
  ["Identificación", [
    ["ID de inspección", "identificador", "text"], ["N.º de obra", "n_obra", "integer"],
    ["Nombre del canal", "nombre_canal", "text"], ["Tipo de infraestructura", "canal_derivado", "text"],
    ["Unidad", "unidad", "text"]]],
  ["Fechas y responsables", [
    ["Fecha de inspección", "fecha_manual", "date"], ["Fecha de registro automático", "fecha_automatica", "datetime"],
    ["Encuestador/a", "encuestador", "text"], ["Usuario de registro", "usuario_login", "text"],
    ["Revisor responsable", "revisor_responsable", "text"], ["Nombre del revisor", "nombre_revisor", "text"],
    ["Estado de validación", "validacion", "text"]]],
  ["Iniciativa y antecedentes", [
    ["Nombre de la iniciativa", "iniciativas", "text"], ["Código BIP", "codigo_bip_", "text"],
    ["Consultora", "consultora_", "text"], ["Características de la obra", "caract_obra", "text"],
    ["Singularidad", "singularidades", "text"], ["Nota importante", "nota_1", "text"]]],
  ["Ubicación", [
    ["Región", "region", "text"], ["Provincia", "provincia", "text"], ["Comuna", "comuna", "text"],
    ["Cuenca", "cuenca", "text"], ["Subcuenca", "subcuenca", "text"], ["Sector", "sector", "text"],
    ["Kilómetro o tramo", "km_tramo", "decimal"]]],
  ["Coordenadas y elevación", [
    ["Longitud geográfica", "longitud", "coordinate"], ["Latitud geográfica", "latitud", "coordinate"],
    ["Coordenada UTM Este", "este", "decimal"], ["Coordenada UTM Norte", "norte", "decimal"],
    ["Cota inicial (m s. n. m.)", "cota", "decimal"], ["Cota final (m s. n. m.)", "cota_manual", "decimal"]]],
  ["Características generales", [
    ["Canal automatizado", "automatizada", "text"], ["Grado de mantención", "grado_mantencion", "text"],
    ["Materialidad", "materialidad", "text"], ["Caudal máximo de porteo (l/s)", "caudal", "decimal"],
    ["Presencia de vegetación", "presencia_vegetacion", "text"], ["Dificultad de acceso", "dificultad_acceso", "text"],
    ["Cruce en cauce natural", "tipo_cruce_cauce", "text"], ["Cruce en camino o ferrocarril", "tipo_cruce_camino", "text"]]],
  ["Dimensiones", [
    ["Longitud del tramo (m)", "longitud_tramo", "decimal"], ["Largo de la obra (m)", "largo", "decimal"],
    ["Ancho de la obra (m)", "ancho", "decimal"], ["Altura de la obra (m)", "alto", "decimal"],
    ["Diámetro de la obra (m)", "diametro", "decimal"]]],
  ["Evaluación técnica", [
    ["Funcionamiento hidráulico", "fun_hidraulico", "text"], ["N(Pi) Funcionamiento hidráulico", "npi_fun_hidraulico", "decimal"],
    ["Estado estructural", "est_estructural", "text"], ["N(Pi) Estado estructural", "npi_est_estructural", "decimal"],
    ["Puntaje de factores técnicos", "puntaje_tec", "decimal"], ["Estado de factores técnicos", "estado_factores_tec", "text"]]],
  ["Gestión y riesgo", [
    ["Factores de riesgo", "factor_riesgo", "text"], ["N(Pi) Factores de riesgo", "npi_factor_riesgo", "decimal"],
    ["Facilidad de operación", "facilidad_operacion", "text"], ["N(Pi) Facilidad de operación", "npi_facilidad_oper", "decimal"],
    ["Puntaje de factores de gestión", "puntaje_gestion", "decimal"], ["Estado de factores de gestión", "estado_factores_gest", "text"]]],
  ["Rehabilitación y observaciones", [
    ["Requiere rehabilitación", "requiere_rehabilitacion", "text"],
    ["Tipo de rehabilitación requerida", "tipo_rehabilitacion", "text"], ["Observaciones", "observaciones", "text"]]],
  ["Auditoría", [
    ["Fecha de creación", "CreationDate", "datetime"], ["Creado por", "Creator", "text"],
    ["Fecha de última edición", "EditDate", "datetime"], ["Editado por", "Editor", "text"]]],
];

function hasField(fields, expectedName) {
  var expected = Lower(expectedName);
  for (var fieldIndex in fields) {
    var candidate = fields[fieldIndex];
    if (Lower(candidate.name) == expected) {
      return true;
    }
  }
  return false;
}

function relationshipFields(parentFieldList, childFieldList) {
  if (
    hasField(parentFieldList, "uniquerowid") &&
    hasField(childFieldList, "parentrowid")
  ) {
    return { parent: "uniquerowid", child: "parentrowid" };
  }
  if (
    hasField(parentFieldList, "globalid") &&
    hasField(childFieldList, "parentglobalid")
  ) {
    return { parent: "globalid", child: "parentglobalid" };
  }
  return null;
}

// =====================================================
// 3. CONSULTAR PADRE E HIJOS DEL SURVEY
// =====================================================
// ["*"] es intencional: las acciones del Dashboard reciben todo el padre.
var parents = FeatureSetByPortalItem(
  portal,
  surveyItemId,
  parentTableId,
  ["*"],
  false,
);
parents = Filter(parents, parentWhere);

var points = FeatureSetByPortalItem(
  portal,
  surveyItemId,
  pointLayerId,
  ["*"],
  true,
);

var lines = FeatureSetByPortalItem(
  portal,
  surveyItemId,
  lineLayerId,
  ["*"],
  true,
);

// =====================================================
// 4. REPLICAR EL ESQUEMA COMPLETO DEL PADRE
// =====================================================
var parentSchema = Schema(parents);
var parentFields = parentSchema.fields;
var pointFields = Schema(points).fields;
var lineFields = Schema(lines).fields;
var pointRelationship = relationshipFields(parentFields, pointFields);
var lineRelationship = relationshipFields(parentFields, lineFields);

if (IsEmpty(pointRelationship) || IsEmpty(lineRelationship)) {
  return FeatureSet(
    Text({
      fields: [
        {
          name: "error",
          alias: "Error de relación",
          type: "esriFieldTypeString",
        },
      ],
      geometryType: "esriGeometryPolygon",
      features: [
        {
          attributes: {
            error:
              "No se encontró una relación compatible. Se esperaba " +
              "uniquerowid/parentrowid o globalid/parentglobalid.",
          },
          geometry: null,
        },
      ],
    }),
  );
}

var outputFields = [];

for (var f in parentFields) {
  var field = parentFields[f];
  var fieldName = field.name;
  var fieldType = field.type;

  // Un FeatureSet calculado no necesita el ObjectID original. GlobalID y GUID
  // se publican como texto para evitar restricciones de campos de sistema.
  if (fieldType == "esriFieldTypeOID") {
    continue;
  }
  if (
    fieldType == "esriFieldTypeGlobalID" ||
    fieldType == "esriFieldTypeGUID"
  ) {
    fieldType = "esriFieldTypeString";
  }

  Push(outputFields, {
    name: fieldName,
    alias: DefaultValue(field.alias, fieldName),
    type: fieldType,
  });
}

Push(outputFields, {
  name: "cantidad_puntos",
  alias: "Puntos",
  type: "esriFieldTypeInteger",
});
Push(outputFields, {
  name: "cantidad_lineas",
  alias: "Líneas",
  type: "esriFieldTypeInteger",
});
Push(outputFields, {
  name: "cantidad_geometrias",
  alias: "Geometrías",
  type: "esriFieldTypeInteger",
});
Push(outputFields, {
  name: "area_ha",
  alias: "Área AOI (ha)",
  type: "esriFieldTypeDouble",
});
Push(outputFields, {
  name: "html",
  alias: "Tarjeta HTML",
  type: "esriFieldTypeString",
});
Push(outputFields, {
  name: "html_popup",
  alias: "Detalle HTML",
  type: "esriFieldTypeString",
});
if (!hasField(parentFields, "globalid_padre")) {
  Push(outputFields, {
    name: "globalid_padre",
    alias: "GlobalID del padre",
    type: "esriFieldTypeString",
  });
}

var output = {
  fields: outputFields,
  geometryType: "esriGeometryPolygon",
  features: [],
};

// =====================================================
// 5. CREAR UNA AOI Y UNA TARJETA POR PADRE
// =====================================================
for (var parent in parents) {
  var pointParentId = parent[pointRelationship.parent];
  var lineParentId = parent[lineRelationship.parent];
  if (IsEmpty(pointParentId) && IsEmpty(lineParentId)) {
    continue;
  }

  var parentPoints = Filter(points, "1=0");
  if (!IsEmpty(pointParentId)) {
    parentPoints = Filter(
      points,
      pointRelationship.child + " = @pointParentId",
    );
  }
  var parentLines = Filter(lines, "1=0");
  if (!IsEmpty(lineParentId)) {
    parentLines = Filter(lines, lineRelationship.child + " = @lineParentId");
  }
  var aoiParts = [];

  for (var pointFeature in parentPoints) {
    var pointGeometry = Geometry(pointFeature);
    if (!IsEmpty(pointGeometry)) {
      Push(
        aoiParts,
        BufferGeodetic(pointGeometry, pointBufferMeters, "meters"),
      );
    }
  }

  for (var lineFeature in parentLines) {
    var lineGeometry = Geometry(lineFeature);
    if (!IsEmpty(lineGeometry)) {
      Push(aoiParts, BufferGeodetic(lineGeometry, lineBufferMeters, "meters"));
    }
  }

  if (Count(aoiParts) == 0) {
    continue;
  }

  var aoiGeometry = ConvexHull(Union(aoiParts));
  var pointCount = Count(parentPoints);
  var lineCount = Count(parentLines);
  var totalCount = pointCount + lineCount;
  var areaHectares = Round(AreaGeodetic(aoiGeometry, "hectares"), 4);

  var inspectionId = htmlEncode(parent.identificador, "Sin identificador");
  var canal = htmlEncode(parent.nombre_canal, "Sin canal");
  var singularity = htmlEncode(parent.singularidades, "Sin singularidad");
  var comuna = htmlEncode(parent.comuna, "Sin comuna");
  var validation = Lower(safeText(parent.validacion, "pendiente"));
  var statusLabel = IIf(
    validation == "si",
    "VALIDADO",
    Upper(htmlEncode(validation, "PENDIENTE")),
  );
  var statusBackground = IIf(validation == "si", "#e5f5ea", "#fff4d6");
  var statusColor = IIf(validation == "si", "#236b3b", "#7a5310");

  var html =
    "<div style='box-sizing:border-box;width:100%;font-family:Avenir Next,Segoe UI,Arial,sans-serif;" +
    "background:#ffffff;border:1px solid #d8e1e8;border-left:6px solid #007ac2;" +
    "border-radius:10px;padding:14px 16px;box-shadow:0 2px 7px rgba(31,45,61,.10);'>" +
    "<div style='display:flex;justify-content:space-between;align-items:flex-start;gap:10px;'>" +
    "<div style='min-width:0;'>" +
    "<div style='font-size:16px;line-height:1.25;font-weight:700;color:#172b4d;'>" +
    inspectionId +
    "</div>" +
    "<div style='margin-top:4px;font-size:13px;line-height:1.35;color:#506176;'>" +
    canal +
    " &middot; " +
    singularity +
    "</div>" +
    "</div>" +
    "<span style='white-space:nowrap;border-radius:12px;padding:4px 8px;background:" +
    statusBackground +
    ";color:" +
    statusColor +
    ";font-size:10px;font-weight:700;letter-spacing:.35px;'>" +
    statusLabel +
    "</span>" +
    "</div>" +
    "<div style='margin-top:11px;padding-top:10px;border-top:1px solid #edf1f4;" +
    "display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#52606d;'>" +
    "<span>&#128205; " +
    comuna +
    "</span>" +
    "<span><b style='color:#172b4d;'>" +
    Text(totalCount) +
    "</b> geometría" +
    IIf(totalCount == 1, "", "s") +
    "</span>" +
    "<span><b style='color:#172b4d;'>" +
    Text(areaHectares, "#,###.####") +
    "</b> ha</span>" +
    "</div>";

  // Resumen compacto con el mismo mapeo funcional del popup de líneas.
  var summaryFields = [
    ["N.º de obra", "n_obra"],
    ["Fecha de inspección", "fecha_manual"],
    ["Unidad", "unidad"],
    ["Revisor responsable", "nombre_revisor"],
    ["Cota inicial (m s. n. m.)", "cota"],
    ["Cota final (m s. n. m.)", "cota_manual"],
  ];
  var summaryRows = "";
  var visibleSummaryRows = 0;
  for (var summaryIndex in summaryFields) {
    var summaryField = summaryFields[summaryIndex];
    var summaryValue = parent[summaryField[1]];
    if (!IsEmpty(summaryValue)) {
      if (summaryField[1] == "fecha_manual") {
        summaryValue = Text(summaryValue, "DD-MM-YYYY");
      } else {
        summaryValue = htmlEncode(summaryValue, "");
      }
      var summaryBackground = IIf(
        visibleSummaryRows % 2 == 0,
        "#f5f8fa",
        "#ffffff",
      );
      summaryRows +=
        "<tr style='background:" + summaryBackground + ";'>" +
        "<td style='width:48%;padding:6px 8px;border-bottom:1px solid #e2e8ed;" +
        "font-weight:600;color:#385563;vertical-align:top;'>" +
        summaryField[0] +
        "</td><td style='padding:6px 8px;border-bottom:1px solid #e2e8ed;" +
        "color:#1f2933;vertical-align:top;overflow-wrap:anywhere;'>" +
        summaryValue +
        "</td></tr>";
      visibleSummaryRows++;
    }
  }

  if (visibleSummaryRows > 0) {
    html +=
      "<div style='margin-top:12px;border:1px solid #d8e1e8;border-radius:7px;overflow:hidden;'>" +
      "<div style='padding:7px 9px;background:#287d8e;color:#ffffff;" +
      "font-size:12px;font-weight:700;'>Resumen de la inspección</div>" +
      "<table style='width:100%;border-collapse:collapse;font-size:11px;'>" +
      summaryRows +
      "</table></div>";
  }

  // Cierra la tarjeta resumida. Esta variante no consulta adjuntos.
  html += "</div>";

  // Ficha detallada para el widget de detalle. Conserva las mismas secciones,
  // etiquetas, formatos y evidencias del popup profesional de líneas.
  var detailHtml =
    "<div style='font-family:Arial,sans-serif;color:#253746;line-height:1.35;'>" +
    "<div style='padding:14px 16px;background:#145c70;color:#ffffff;border-radius:7px 7px 0 0;'>" +
    "<div style='font-size:18px;font-weight:bold;'>" + canal + "</div>" +
    "<div style='margin-top:3px;font-size:12px;color:#d9eef3;'>ID: " + inspectionId + "</div></div>";
  var totalDetailRows = 0;

  for (var detailSectionIndex in popupSections) {
    var detailSection = popupSections[detailSectionIndex];
    var detailFields = detailSection[1];
    var detailRows = "";
    var visibleDetailRows = 0;
    for (var detailFieldIndex in detailFields) {
      var detailField = detailFields[detailFieldIndex];
      var formattedDetailValue = detailValue(parent[detailField[1]], detailField[2]);
      if (!IsEmpty(formattedDetailValue)) {
        var detailBackground = IIf(visibleDetailRows % 2 == 0, "#f5f8fa", "#ffffff");
        detailRows +=
          "<tr style='background:" + detailBackground + ";'>" +
          "<td style='width:43%;padding:7px 9px;border-bottom:1px solid #dfe7eb;" +
          "font-weight:bold;color:#385563;vertical-align:top;'>" + detailField[0] + "</td>" +
          "<td style='padding:7px 9px;border-bottom:1px solid #dfe7eb;color:#1f2933;" +
          "vertical-align:top;overflow-wrap:anywhere;'>" + formattedDetailValue + "</td></tr>";
        visibleDetailRows++;
        totalDetailRows++;
      }
    }
    if (visibleDetailRows > 0) {
      detailHtml +=
        "<div style='margin-top:10px;padding:7px 10px;background:#287d8e;color:#ffffff;" +
        "font-size:13px;font-weight:bold;'>" + detailSection[0] + "</div>" +
        "<table style='width:100%;border-collapse:collapse;font-size:12px;'>" +
        detailRows + "</table>";
    }
  }

  if (totalDetailRows == 0) {
    detailHtml +=
      "<div style='padding:12px;background:#f5f8fa;'>El registro no contiene información visible.</div>";
  }
  detailHtml += "</div>";

  var attributes = {};
  for (var sourceFieldIndex in parentFields) {
    var sourceField = parentFields[sourceFieldIndex];
    if (sourceField.type == "esriFieldTypeOID") {
      continue;
    }
    attributes[sourceField.name] = outputValue(
      parent[sourceField.name],
      sourceField.type,
    );
  }

  // La acción hacia la encuesta de edición debe usar el registro padre.
  // Nunca se asigna aquí el GlobalID de las geometrías hijas.
  var parentGlobalId = safeText(parent["globalid"], "");
  attributes["globalid"] = parentGlobalId;
  attributes["globalid_padre"] = parentGlobalId;

  attributes.cantidad_puntos = pointCount;
  attributes.cantidad_lineas = lineCount;
  attributes.cantidad_geometrias = totalCount;
  attributes.area_ha = areaHectares;
  attributes.html = html;
  attributes.html_popup = detailHtml;

  Push(output.features, {
    attributes: attributes,
    geometry: aoiGeometry,
  });
}

return FeatureSet(Text(output));
