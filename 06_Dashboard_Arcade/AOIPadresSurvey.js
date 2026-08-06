// Expresión de datos Arcade para ArcGIS Dashboards.
// Genera una AOI poligonal por registro padre y conserva su esquema completo.

// =====================================================
// 1. CONFIGURACIÓN DEL AMBIENTE DESTINO
// =====================================================
var portal = Portal("<URL_PORTAL>");
var surveyItemId = "<ITEM_ID_SERVICIO_SURVEY>";

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
    if (fieldType == "esriFieldTypeGlobalID" || fieldType == "esriFieldTypeGUID") {
        return Text(value);
    }
    return value;
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
    false
);
parents = Filter(parents, parentWhere);

var points = FeatureSetByPortalItem(
    portal,
    surveyItemId,
    pointLayerId,
    ["globalid", "parentglobalid"],
    true
);

var lines = FeatureSetByPortalItem(
    portal,
    surveyItemId,
    lineLayerId,
    ["globalid", "parentglobalid"],
    true
);

// =====================================================
// 4. REPLICAR EL ESQUEMA COMPLETO DEL PADRE
// =====================================================
var parentSchema = Schema(parents);
var parentFields = parentSchema.fields;
var outputFields = [];

for (var field in parentFields) {
    var fieldName = field.name;
    var fieldType = field.type;

    // Un FeatureSet calculado no necesita el ObjectID original. GlobalID y GUID
    // se publican como texto para evitar restricciones de campos de sistema.
    if (fieldType == "esriFieldTypeOID") {
        continue;
    }
    if (fieldType == "esriFieldTypeGlobalID" || fieldType == "esriFieldTypeGUID") {
        fieldType = "esriFieldTypeString";
    }

    Push(outputFields, {
        name: fieldName,
        alias: DefaultValue(field.alias, fieldName),
        type: fieldType
    });
}

Push(outputFields, { name: "cantidad_puntos", alias: "Puntos", type: "esriFieldTypeInteger" });
Push(outputFields, { name: "cantidad_lineas", alias: "Líneas", type: "esriFieldTypeInteger" });
Push(outputFields, { name: "cantidad_geometrias", alias: "Geometrías", type: "esriFieldTypeInteger" });
Push(outputFields, { name: "area_ha", alias: "Área AOI (ha)", type: "esriFieldTypeDouble" });
Push(outputFields, { name: "html", alias: "Tarjeta HTML", type: "esriFieldTypeString" });

var output = {
    fields: outputFields,
    geometryType: "esriGeometryPolygon",
    features: []
};

// =====================================================
// 5. CREAR UNA AOI Y UNA TARJETA POR PADRE
// =====================================================
for (var parent in parents) {
    var parentId = parent.globalid;
    if (IsEmpty(parentId)) {
        continue;
    }

    var parentPoints = Filter(points, "parentglobalid = @parentId");
    var parentLines = Filter(lines, "parentglobalid = @parentId");
    var aoiParts = [];

    for (var pointFeature in parentPoints) {
        var pointGeometry = Geometry(pointFeature);
        if (!IsEmpty(pointGeometry)) {
            Push(aoiParts, BufferGeodetic(pointGeometry, pointBufferMeters, "meters"));
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
    var statusLabel = IIf(validation == "si", "VALIDADO", Upper(htmlEncode(validation, "PENDIENTE")));
    var statusBackground = IIf(validation == "si", "#e5f5ea", "#fff4d6");
    var statusColor = IIf(validation == "si", "#236b3b", "#7a5310");

    var html =
        "<div style='box-sizing:border-box;width:100%;font-family:Avenir Next,Segoe UI,Arial,sans-serif;" +
        "background:#ffffff;border:1px solid #d8e1e8;border-left:6px solid #007ac2;" +
        "border-radius:10px;padding:14px 16px;box-shadow:0 2px 7px rgba(31,45,61,.10);'>" +
          "<div style='display:flex;justify-content:space-between;align-items:flex-start;gap:10px;'>" +
            "<div style='min-width:0;'>" +
              "<div style='font-size:16px;line-height:1.25;font-weight:700;color:#172b4d;'>" + inspectionId + "</div>" +
              "<div style='margin-top:4px;font-size:13px;line-height:1.35;color:#506176;'>" + canal + " &middot; " + singularity + "</div>" +
            "</div>" +
            "<span style='white-space:nowrap;border-radius:12px;padding:4px 8px;background:" + statusBackground +
              ";color:" + statusColor + ";font-size:10px;font-weight:700;letter-spacing:.35px;'>" + statusLabel + "</span>" +
          "</div>" +
          "<div style='margin-top:11px;padding-top:10px;border-top:1px solid #edf1f4;" +
            "display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#52606d;'>" +
            "<span>&#128205; " + comuna + "</span>" +
            "<span><b style='color:#172b4d;'>" + Text(totalCount) + "</b> geometría" + IIf(totalCount == 1, "", "s") + "</span>" +
            "<span><b style='color:#172b4d;'>" + Text(areaHectares, "#,###.####") + "</b> ha</span>" +
          "</div>" +
        "</div>";

    var attributes = {};
    for (var sourceField in parentFields) {
        if (sourceField.type == "esriFieldTypeOID") {
            continue;
        }
        attributes[sourceField.name] = outputValue(parent[sourceField.name], sourceField.type);
    }

    attributes.cantidad_puntos = pointCount;
    attributes.cantidad_lineas = lineCount;
    attributes.cantidad_geometrias = totalCount;
    attributes.area_ha = areaHectares;
    attributes.html = html;

    Push(output.features, {
        attributes: attributes,
        geometry: aoiGeometry
    });
}

return FeatureSet(Text(output));
