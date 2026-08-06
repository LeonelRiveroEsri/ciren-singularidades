// Popup profesional para la capa hija de LINEAS.
// Perfil: Popup de ArcGIS Arcade. Devuelve un elemento de contenido tipo "text".

var relationshipName =
  "<RELATIONSHIP_NAME_LINE>";

// Complete la URL de la tabla padre. El token se renueva automaticamente.
var parentLayerUrl =
  "<URL_TABLA_PADRE_SURVEY>";

var token =
  "<TOKEN_GESTIONADO_AUTOMATICAMENTE>";

var parentFS = FeatureSetByRelationshipName(
  $feature,
  relationshipName,
  ["*"],
  false,
);
var parentFeature = First(parentFS);

if (IsEmpty(parentFeature)) {
  return {
    type: "text",
    text: "<div style='padding:12px;background:#fff4e5;border-left:4px solid #e67e22;color:#633b00;'>No se encontro el registro padre relacionado.</div>",
  };
}

// Cada bloque contiene: titulo y campos [alias, nombre, tipo].
var sections = [
  [
    "Identificacion",
    [
      ["ID de inspeccion", "identificador", "text"],
      ["N.º de obra", "n_obra", "integer"],
      ["Nombre del canal", "nombre_canal", "text"],
      ["Tipo de infraestructura", "canal_derivado", "text"],
      ["Unidad", "unidad", "text"],
    ],
  ],
  [
    "Fechas y responsables",
    [
      ["Fecha de inspeccion", "fecha_manual", "date"],
      ["Fecha de registro automatico", "fecha_automatica", "datetime"],
      ["Encuestador/a", "encuestador", "text"],
      ["Usuario de registro", "usuario_login", "text"],
      ["Revisor responsable", "revisor_responsable", "text"],
      ["Nombre del revisor", "nombre_revisor", "text"],
      ["Estado de validacion", "validacion", "text"],
    ],
  ],
  [
    "Iniciativa y antecedentes",
    [
      ["Nombre de la iniciativa", "iniciativas", "text"],
      ["Codigo BIP", "codigo_bip_", "text"],
      ["Consultora", "consultora_", "text"],
      ["Caracteristicas de la obra", "caract_obra", "text"],
      ["Singularidad", "singularidades", "text"],
      ["Nota importante", "nota_1", "text"],
    ],
  ],
  [
    "Ubicacion",
    [
      ["Region", "region", "text"],
      ["Provincia", "provincia", "text"],
      ["Comuna", "comuna", "text"],
      ["Cuenca", "cuenca", "text"],
      ["Subcuenca", "subcuenca", "text"],
      ["Sector", "sector", "text"],
      ["Kilometro o tramo", "km_tramo", "decimal"],
    ],
  ],
  [
    "Coordenadas y elevacion",
    [
      ["Longitud geografica", "longitud", "coordinate"],
      ["Latitud geografica", "latitud", "coordinate"],
      ["Coordenada UTM Este", "este", "decimal"],
      ["Coordenada UTM Norte", "norte", "decimal"],
      ["Cota inicial (m s. n. m.)", "cota", "decimal"],
      ["Cota final (m s. n. m.)", "cota_manual", "decimal"],
    ],
  ],
  [
    "Caracteristicas generales",
    [
      ["Canal automatizado", "automatizada", "text"],
      ["Grado de mantencion", "grado_mantencion", "text"],
      ["Materialidad", "materialidad", "text"],
      ["Caudal maximo de porteo (l/s)", "caudal", "decimal"],
      ["Presencia de vegetacion", "presencia_vegetacion", "text"],
      ["Dificultad de acceso", "dificultad_acceso", "text"],
      ["Cruce en cauce natural", "tipo_cruce_cauce", "text"],
      ["Cruce en camino o ferrocarril", "tipo_cruce_camino", "text"],
    ],
  ],
  [
    "Dimensiones",
    [
      ["Longitud del tramo (m)", "longitud_tramo", "decimal"],
      ["Largo de la obra (m)", "largo", "decimal"],
      ["Ancho de la obra (m)", "ancho", "decimal"],
      ["Altura de la obra (m)", "alto", "decimal"],
      ["Diametro de la obra (m)", "diametro", "decimal"],
    ],
  ],
  [
    "Evaluacion tecnica",
    [
      ["Funcionamiento hidraulico", "fun_hidraulico", "text"],
      ["N(Pi) Funcionamiento hidraulico", "npi_fun_hidraulico", "decimal"],
      ["Estado estructural", "est_estructural", "text"],
      ["N(Pi) Estado estructural", "npi_est_estructural", "decimal"],
      ["Puntaje de factores tecnicos", "puntaje_tec", "decimal"],
      ["Estado de factores tecnicos", "estado_factores_tec", "text"],
    ],
  ],
  [
    "Gestion y riesgo",
    [
      ["Factores de riesgo", "factor_riesgo", "text"],
      ["N(Pi) Factores de riesgo", "npi_factor_riesgo", "decimal"],
      ["Facilidad de operacion", "facilidad_operacion", "text"],
      ["N(Pi) Facilidad de operacion", "npi_facilidad_oper", "decimal"],
      ["Puntaje de factores de gestion", "puntaje_gestion", "decimal"],
      ["Estado de factores de gestion", "estado_factores_gest", "text"],
    ],
  ],
  [
    "Rehabilitacion y observaciones",
    [
      ["Requiere rehabilitacion", "requiere_rehabilitacion", "text"],
      ["Tipo de rehabilitacion requerida", "tipo_rehabilitacion", "text"],
      ["Observaciones", "observaciones", "text"],
    ],
  ],
  [
    "Auditoria",
    [
      ["Fecha de creacion", "CreationDate", "datetime"],
      ["Creado por", "Creator", "text"],
      ["Fecha de ultima edicion", "EditDate", "datetime"],
      ["Editado por", "Editor", "text"],
    ],
  ],
];

function escapeHtml(value) {
  var result = Text(value);
  result = Replace(result, "&", "&amp;");
  result = Replace(result, "<", "&lt;");
  result = Replace(result, ">", "&gt;");
  result = Replace(result, '"', "&quot;");
  result = Replace(result, "'", "&#39;");
  return result;
}

function formatValue(value, valueType) {
  if (IsEmpty(value)) return "";
  if (valueType == "date") return Text(value, "DD-MM-YYYY");
  if (valueType == "datetime") return Text(value, "DD-MM-YYYY HH:mm");
  if (valueType == "integer") return Text(Number(value), "#,###");
  if (valueType == "decimal") return Text(Number(value), "#,###.00");
  if (valueType == "coordinate") return Text(Number(value), "0.000000");
  return escapeHtml(value);
}

var title = formatValue(parentFeature["nombre_canal"], "text");
if (IsEmpty(title)) title = "Ficha de inspeccion";
var subtitle = formatValue(parentFeature["identificador"], "text");

var html =
  "<div style='font-family:Arial,sans-serif;color:#253746;line-height:1.35;'>";
html +=
  "<div style='padding:14px 16px;background:#145c70;color:#ffffff;border-radius:7px 7px 0 0;'>";
html += "<div style='font-size:18px;font-weight:bold;'>" + title + "</div>";
if (!IsEmpty(subtitle))
  html +=
    "<div style='margin-top:3px;font-size:12px;color:#d9eef3;'>ID: " +
    subtitle +
    "</div>";
html += "</div>";

var totalRows = 0;
for (var sectionIndex = 0; sectionIndex < Count(sections); sectionIndex++) {
  var section = sections[sectionIndex];
  var sectionTitle = section[0];
  var fields = section[1];
  var rows = "";
  var visibleRows = 0;

  for (var fieldIndex = 0; fieldIndex < Count(fields); fieldIndex++) {
    var field = fields[fieldIndex];
    var value = formatValue(parentFeature[field[1]], field[2]);
    if (!IsEmpty(value)) {
      var background = IIf(visibleRows % 2 == 0, "#f5f8fa", "#ffffff");
      rows += "<tr style='background:" + background + ";'>";
      rows +=
        "<td style='width:43%;padding:7px 9px;border-bottom:1px solid #dfe7eb;font-weight:bold;color:#385563;vertical-align:top;'>" +
        escapeHtml(field[0]) +
        "</td>";
      rows +=
        "<td style='padding:7px 9px;border-bottom:1px solid #dfe7eb;color:#1f2933;vertical-align:top;overflow-wrap:anywhere;'>" +
        value +
        "</td></tr>";
      visibleRows++;
      totalRows++;
    }
  }

  if (visibleRows > 0) {
    html +=
      "<div style='margin-top:10px;padding:7px 10px;background:#287d8e;color:#ffffff;font-size:13px;font-weight:bold;'>" +
      sectionTitle +
      "</div>";
    html +=
      "<table style='width:100%;border-collapse:collapse;font-size:12px;'>" +
      rows +
      "</table>";
  }
}

// Evidencias adjuntas del registro padre.
var attachments = Attachments(parentFeature);
if (Count(attachments) > 0) {
  html +=
    "<div style='margin-top:10px;padding:7px 10px;background:#287d8e;color:#ffffff;font-size:13px;font-weight:bold;'>Evidencias fotograficas</div>";
  html += "<div style='padding:10px;background:#f5f8fa;'>";
  var parentObjectId = parentFeature["OBJECTID"];

  for (var attachmentIndex in attachments) {
    var attachment = attachments[attachmentIndex];
    var attachmentUrl =
      parentLayerUrl +
      "/" +
      Text(parentObjectId) +
      "/attachments/" +
      Text(attachment.id) +
      "?token=" +
      token;
    var contentType = Lower(DefaultValue(attachment.contentType, ""));
    var fileName = escapeHtml(DefaultValue(attachment.name, "Archivo adjunto"));

    if (Find("image/", contentType) == 0) {
      html += "<div style='margin-bottom:12px;'>";
      html +=
        "<a href='" +
        attachmentUrl +
        "' target='_blank' style='text-decoration:none;'>";
      html +=
        "<img src='" +
        attachmentUrl +
        "' alt='" +
        fileName +
        "' style='display:block;width:100%;max-width:560px;height:auto;border:1px solid #c8d4da;border-radius:6px;'>";
      html +=
        "</a><div style='padding-top:4px;font-size:11px;color:#526b78;'>" +
        fileName +
        "</div></div>";
    } else {
      html +=
        "<div style='margin-bottom:7px;'><a href='" +
        attachmentUrl +
        "' target='_blank' style='color:#145c70;font-weight:bold;'>Ver archivo: " +
        fileName +
        "</a></div>";
    }
  }
  html += "</div>";
}

if (totalRows == 0 && Count(attachments) == 0) {
  html +=
    "<div style='padding:12px;background:#f5f8fa;'>El registro no contiene informacion visible ni adjuntos.</div>";
}

html += "</div>";
return { type: "text", text: html };
