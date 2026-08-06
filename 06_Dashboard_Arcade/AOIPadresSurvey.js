// Expresión de datos Arcade para ArcGIS Dashboards.
// Devuelve un FeatureSet poligonal con una AOI por registro padre del Survey.

// =====================================================
// 1. CONFIGURACIÓN DEL AMBIENTE DESTINO
// =====================================================
var portal = Portal("<URL_PORTAL>");
var surveyItemId = "<ITEM_ID_SERVICIO_SURVEY>";

// IDs REST del servicio Survey: confirmar después de publicar.
var parentTableId = 0;
var pointLayerId = 1;
var lineLayerId = 2;

// Tamaño de influencia usado para convertir puntos y líneas en polígonos.
var pointBufferMeters = 50;
var lineBufferMeters = 25;

// Usar "validacion = 'si'" si el Dashboard debe mostrar solo aprobados.
var parentWhere = "1=1";

// =====================================================
// 2. CONSULTAR PADRE E HIJOS DEL SURVEY
// =====================================================
var parents = FeatureSetByPortalItem(
    portal,
    surveyItemId,
    parentTableId,
    [
        "globalid",
        "identificador",
        "nombre_canal",
        "singularidades",
        "validacion",
        "sector",
        "region",
        "provincia",
        "comuna"
    ],
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
// 3. DEFINIR EL FEATURESET POLIGONAL DE SALIDA
// =====================================================
var output = {
    fields: [
        { name: "aoi_id", alias: "GlobalID padre", type: "esriFieldTypeString" },
        { name: "identificador", alias: "ID inspección", type: "esriFieldTypeString" },
        { name: "nombre_canal", alias: "Canal", type: "esriFieldTypeString" },
        { name: "singularidad", alias: "Singularidad", type: "esriFieldTypeString" },
        { name: "validacion", alias: "Validación", type: "esriFieldTypeString" },
        { name: "sector", alias: "Sector", type: "esriFieldTypeString" },
        { name: "region", alias: "Región", type: "esriFieldTypeString" },
        { name: "provincia", alias: "Provincia", type: "esriFieldTypeString" },
        { name: "comuna", alias: "Comuna", type: "esriFieldTypeString" },
        { name: "cantidad_puntos", alias: "Puntos", type: "esriFieldTypeInteger" },
        { name: "cantidad_lineas", alias: "Líneas", type: "esriFieldTypeInteger" },
        { name: "cantidad_geometrias", alias: "Geometrías", type: "esriFieldTypeInteger" },
        { name: "area_ha", alias: "Área AOI (ha)", type: "esriFieldTypeDouble" },
        { name: "html", alias: "Resumen HTML", type: "esriFieldTypeString" }
    ],
    geometryType: "esriGeometryPolygon",
    features: []
};

// =====================================================
// 4. CREAR UNA AOI POR PADRE
// =====================================================
for (var parent in parents) {
    var parentId = parent.globalid;
    if (IsEmpty(parentId)) {
        continue;
    }

    // @parentId usa sustitución segura de variables Arcade en el SQL.
    var parentPoints = Filter(points, "parentglobalid = @parentId");
    var parentLines = Filter(lines, "parentglobalid = @parentId");
    var aoiParts = [];

    for (var pointFeature in parentPoints) {
        var pointGeometry = Geometry(pointFeature);
        if (!IsEmpty(pointGeometry)) {
            Push(
                aoiParts,
                BufferGeodetic(pointGeometry, pointBufferMeters, "meters")
            );
        }
    }

    for (var lineFeature in parentLines) {
        var lineGeometry = Geometry(lineFeature);
        if (!IsEmpty(lineGeometry)) {
            Push(
                aoiParts,
                BufferGeodetic(lineGeometry, lineBufferMeters, "meters")
            );
        }
    }

    // Un padre sin geometría relacionada no puede generar una AOI.
    if (Count(aoiParts) == 0) {
        continue;
    }

    // Todos los elementos de aoiParts ya son polígonos compatibles.
    var mergedGeometry = Union(aoiParts);
    var aoiGeometry = ConvexHull(mergedGeometry);
    var pointCount = Count(parentPoints);
    var lineCount = Count(parentLines);
    var totalCount = pointCount + lineCount;
    var areaHectares = Round(AreaGeodetic(aoiGeometry, "hectares"), 4);

    var inspectionId = DefaultValue(parent.identificador, "Sin identificador");
    var canal = DefaultValue(parent.nombre_canal, "Sin canal");
    var singularity = DefaultValue(parent.singularidades, "Sin singularidad");
    var validation = DefaultValue(parent.validacion, "Sin estado");

    var html =
        "<div style='font-family:Avenir Next,Segoe UI,Arial,sans-serif;" +
        "background:#fff;border:1px solid #d9e2ec;border-left:5px solid #007ac2;" +
        "border-radius:8px;padding:12px 14px;'>" +
        "<div style='font-size:15px;font-weight:700;color:#1f2d3d;'>" +
        inspectionId +
        "</div><div style='font-size:12px;color:#5f6b76;margin-top:3px;'>" +
        canal +
        " · " +
        singularity +
        "</div><div style='margin-top:8px;font-size:12px;color:#1f2d3d;'>" +
        "Geometrías: <b>" +
        Text(totalCount) +
        "</b> · Área AOI: <b>" +
        Text(areaHectares, "#,###.####") +
        " ha</b></div></div>";

    Push(output.features, {
        attributes: {
            aoi_id: Text(parentId),
            identificador: inspectionId,
            nombre_canal: canal,
            singularidad: singularity,
            validacion: validation,
            sector: DefaultValue(parent.sector, "Sin sector"),
            region: DefaultValue(parent.region, ""),
            provincia: DefaultValue(parent.provincia, ""),
            comuna: DefaultValue(parent.comuna, ""),
            cantidad_puntos: pointCount,
            cantidad_lineas: lineCount,
            cantidad_geometrias: totalCount,
            area_ha: areaHectares,
            html: html
        },
        geometry: aoiGeometry
    });
}

return FeatureSet(Text(output));
