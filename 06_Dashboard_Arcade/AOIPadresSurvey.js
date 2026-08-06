// Expresión de datos Arcade para ArcGIS Dashboards.
// Genera una AOI poligonal por registro padre y conserva su esquema completo.

// =====================================================
// 1. CONFIGURACIÓN DEL AMBIENTE DESTINO
// =====================================================
var portal = Portal("<URL_PORTAL>");
var surveyItemId = "<ITEM_ID_SERVICIO_SURVEY>";

// URL REST exacta de la tabla padre, sin barra final. El token se renueva con
// 03_Automatizacion/ActualizarTokensScheduler.py.
var parentLayerUrl = "<URL_REST_TABLA_PADRE_FEATURESERVER_0>";
var token = "<TOKEN_GESTIONADO_AUTOMATICAMENTE>";
var maxAttachmentsPerReport = 8;

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

function formatReportValue(value, valueType) {
  if (IsEmpty(value)) {
    return "";
  }
  if (valueType == "date") {
    return Text(value, "DD-MM-YYYY");
  }
  if (valueType == "datetime") {
    return Text(value, "DD-MM-YYYY HH:mm");
  }
  if (valueType == "integer") {
    return Text(Number(value), "#,###");
  }
  if (valueType == "decimal") {
    return Text(Number(value), "#,###.##");
  }
  if (valueType == "coordinate") {
    return Text(Number(value), "0.000000");
  }
  return htmlEncode(value, "");
}

function reportSection(parentFeature, title, fields) {
  var rows = "";
  var visibleRows = 0;
  for (var fieldIndex in fields) {
    var reportField = fields[fieldIndex];
    var value = formatReportValue(
      parentFeature[reportField[1]],
      reportField[2],
    );
    if (!IsEmpty(value)) {
      var background = IIf(visibleRows % 2 == 0, "#f4f7f9", "#ffffff");
      rows +=
        "<tr style='background:" + background + ";'>" +
        "<td style='width:44%;padding:7px 9px;border-bottom:1px solid #dfe7ec;" +
        "font-weight:600;color:#29465b;vertical-align:top;'>" +
        htmlEncode(reportField[0], "") +
        "</td><td style='padding:7px 9px;border-bottom:1px solid #dfe7ec;" +
        "color:#263746;vertical-align:top;'>" + value + "</td></tr>";
      visibleRows += 1;
    }
  }
  if (visibleRows == 0) {
    return "";
  }
  return "<div style='margin-top:12px;padding:8px 10px;background:#287d8e;" +
    "color:#ffffff;font-size:13px;font-weight:700;'>" +
    htmlEncode(title, "") + "</div>" +
    "<table style='width:100%;border-collapse:collapse;font-size:12px;'>" +
    rows + "</table>";
}

var reportSections = [
  ["Identificación", [
    ["ID de inspección", "identificador", "text"],
    ["N.º de obra", "n_obra", "integer"],
    ["Nombre del canal", "nombre_canal", "text"],
    ["Tipo de infraestructura", "canal_derivado", "text"],
    ["Unidad", "unidad", "text"],
  ]],
  ["Fechas y responsables", [
    ["Fecha de inspección", "fecha_manual", "date"],
    ["Fecha de registro", "fecha_automatica", "datetime"],
    ["Encuestador/a", "encuestador", "text"],
    ["Usuario de registro", "usuario_login", "text"],
    ["Revisor responsable", "revisor_responsable", "text"],
    ["Nombre del revisor", "nombre_revisor", "text"],
    ["Estado de validación", "validacion", "text"],
  ]],
  ["Iniciativa y antecedentes", [
    ["Nombre de la iniciativa", "iniciativas", "text"],
    ["Código BIP", "codigo_bip_", "text"],
    ["Consultora", "consultora_", "text"],
    ["Características de la obra", "caract_obra", "text"],
    ["Singularidad", "singularidades", "text"],
    ["Nota importante", "nota_1", "text"],
  ]],
  ["Ubicación", [
    ["Región", "region", "text"],
    ["Provincia", "provincia", "text"],
    ["Comuna", "comuna", "text"],
    ["Cuenca", "cuenca", "text"],
    ["Subcuenca", "subcuenca", "text"],
    ["Sector", "sector", "text"],
    ["Kilómetro o tramo", "km_tramo", "decimal"],
  ]],
  ["Coordenadas y elevación", [
    ["Longitud geográfica", "longitud", "coordinate"],
    ["Latitud geográfica", "latitud", "coordinate"],
    ["UTM Este", "este", "decimal"],
    ["UTM Norte", "norte", "decimal"],
    ["Cota inicial", "cota", "decimal"],
    ["Cota final", "cota_manual", "decimal"],
  ]],
  ["Características y dimensiones", [
    ["Canal automatizado", "automatizada", "text"],
    ["Grado de mantención", "grado_mantencion", "text"],
    ["Materialidad", "materialidad", "text"],
    ["Caudal máximo (l/s)", "caudal", "decimal"],
    ["Presencia de vegetación", "presencia_vegetacion", "text"],
    ["Dificultad de acceso", "dificultad_acceso", "text"],
    ["Longitud del tramo (m)", "longitud_tramo", "decimal"],
    ["Largo (m)", "largo", "decimal"],
    ["Ancho (m)", "ancho", "decimal"],
    ["Alto (m)", "alto", "decimal"],
    ["Diámetro (m)", "diametro", "decimal"],
  ]],
  ["Evaluación técnica y gestión", [
    ["Funcionamiento hidráulico", "fun_hidraulico", "text"],
    ["Estado estructural", "est_estructural", "text"],
    ["Puntaje técnico", "puntaje_tec", "decimal"],
    ["Estado técnico", "estado_factores_tec", "text"],
    ["Factores de riesgo", "factor_riesgo", "text"],
    ["Facilidad de operación", "facilidad_operacion", "text"],
    ["Puntaje de gestión", "puntaje_gestion", "decimal"],
    ["Estado de gestión", "estado_factores_gest", "text"],
  ]],
  ["Rehabilitación y observaciones", [
    ["Requiere rehabilitación", "requiere_rehabilitacion", "text"],
    ["Tipo de rehabilitación", "tipo_rehabilitacion", "text"],
    ["Observaciones", "observaciones", "text"],
  ]],
];

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
  return FeatureSet(Text({
    fields: [
      { name: "error", alias: "Error de relación", type: "esriFieldTypeString" },
    ],
    geometryType: "esriGeometryPolygon",
    features: [
      {
        attributes: {
          error: "No se encontró una relación compatible. Se esperaba " +
            "uniquerowid/parentrowid o globalid/parentglobalid.",
        },
        geometry: null,
      },
    ],
  }));
}

var outputFields = [];
var parentObjectIdField = "";

for (var f in parentFields) {
  var field = parentFields[f];
  var fieldName = field.name;
  var fieldType = field.type;

  // Un FeatureSet calculado no necesita el ObjectID original. GlobalID y GUID
  // se publican como texto para evitar restricciones de campos de sistema.
  if (fieldType == "esriFieldTypeOID") {
    parentObjectIdField = fieldName;
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
  name: "cantidad_adjuntos",
  alias: "Adjuntos",
  type: "esriFieldTypeInteger",
});
Push(outputFields, {
  name: "html",
  alias: "Tarjeta HTML",
  type: "esriFieldTypeString",
  length: 32767,
});

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
    parentLines = Filter(
      lines,
      lineRelationship.child + " = @lineParentId",
    );
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
    "</div>" +
    "</div>";

  // Reporte detallado del padre. Solo se agregan filas con información.
  html +=
    "<div style='margin-top:10px;font-family:Avenir Next,Segoe UI,Arial,sans-serif;" +
    "background:#ffffff;border:1px solid #d8e1e8;border-radius:10px;" +
    "padding:12px 14px;color:#263746;'>" +
    "<div style='font-size:16px;font-weight:700;color:#145c70;'>" +
    "Ficha detallada de la inspección</div>";

  for (var sectionIndex in reportSections) {
    var section = reportSections[sectionIndex];
    html += reportSection(parent, section[0], section[1]);
  }

  var attachments = Attachments(parent);
  var attachmentCount = Count(attachments);
  if (attachmentCount > 0 && !IsEmpty(parentObjectIdField)) {
    var parentObjectId = parent[parentObjectIdField];
    html +=
      "<div style='margin-top:12px;padding:8px 10px;background:#287d8e;" +
      "color:#ffffff;font-size:13px;font-weight:700;'>Evidencias y adjuntos (" +
      Text(attachmentCount) + ")</div>" +
      "<div style='padding:10px 4px 0 4px;'>";

    var visibleAttachmentCount = Min(
      attachmentCount,
      maxAttachmentsPerReport,
    );
    for (var attachmentIndex = 0; attachmentIndex < visibleAttachmentCount; attachmentIndex++) {
      var attachment = attachments[attachmentIndex];
      var attachmentUrl =
        parentLayerUrl + "/" + Text(parentObjectId) + "/attachments/" +
        Text(attachment.id) + "?token=" + token;
      var contentType = Lower(DefaultValue(attachment.contentType, ""));
      var fileName = htmlEncode(attachment.name, "Archivo adjunto");

      if (Find("image/", contentType) == 0) {
        html +=
          "<div style='display:inline-block;box-sizing:border-box;width:49%;" +
          "padding:5px;vertical-align:top;'>" +
          "<a href='" + attachmentUrl + "' target='_blank' style='text-decoration:none;'>" +
          "<img src='" + attachmentUrl + "' alt='" + fileName + "' " +
          "style='display:block;width:100%;height:150px;object-fit:cover;" +
          "border:1px solid #c8d4da;border-radius:7px;'>" +
          "</a><div style='padding:4px 2px;font-size:10px;color:#526b78;" +
          "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>" +
          fileName + "</div></div>";
      } else {
        html +=
          "<div style='margin:5px;padding:8px;background:#f4f7f9;border-radius:5px;'>" +
          "<a href='" + attachmentUrl + "' target='_blank' " +
          "style='color:#145c70;font-size:12px;font-weight:700;text-decoration:none;'>" +
          "&#128206; " + fileName + "</a></div>";
      }
    }

    if (attachmentCount > visibleAttachmentCount) {
      html +=
        "<div style='padding:7px;font-size:11px;color:#526b78;text-align:center;'>" +
        "Se muestran " + Text(visibleAttachmentCount) + " de " +
        Text(attachmentCount) + " adjuntos.</div>";
    }
    html += "</div>";
  } else {
    html +=
      "<div style='margin-top:12px;padding:10px;background:#f4f7f9;" +
      "border-left:4px solid #8aa4b3;font-size:12px;color:#526b78;'>" +
      "Sin evidencias adjuntas.</div>";
  }
  html += "</div>";

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

  attributes.cantidad_puntos = pointCount;
  attributes.cantidad_lineas = lineCount;
  attributes.cantidad_geometrias = totalCount;
  attributes.area_ha = areaHectares;
  attributes.cantidad_adjuntos = attachmentCount;
  attributes.html = html;

  Push(output.features, {
    attributes: attributes,
    geometry: aoiGeometry,
  });
}

return FeatureSet(Text(output));
