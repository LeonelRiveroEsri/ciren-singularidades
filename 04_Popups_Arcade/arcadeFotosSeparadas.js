// Debe coincidir exactamente con el nombre de la relación
var relationshipName =
  "<RELATIONSHIP_NAME_POINT_OR_LINE>";

// =====================================================
// 1. OBTENER EL PADRE
// =====================================================
var parentFS = FeatureSetByRelationshipName(
  $feature,
  relationshipName,
  ["OBJECTID"],
  false,
);

var parentFeature = First(parentFS);

if (IsEmpty(parentFeature)) {
  return {
    type: "text",
    text: "<i>No se encontró el registro padre.</i>",
  };
}

// =====================================================
// 2. OBTENER ADJUNTOS DEL PADRE
// =====================================================
var attachments = Attachments(parentFeature);

if (Count(attachments) == 0) {
  return {
    type: "text",
    text: "<i>El registro padre no tiene archivos adjuntos.</i>",
  };
}

// =====================================================
// 3. URL DEL LAYER PADRE
// Reemplazar por la URL REST exacta del layer padre
// sin barra final.
// =====================================================
var parentLayerUrl =
  "<URL_REST_TABLA_PADRE_FEATURESERVER_0>";

var parentObjectId = parentFeature.OBJECTID;
var token = "<TOKEN_GENERADO_AUTOMATICAMENTE>";

var html = "<div style='display:flex;flex-direction:column;gap:10px;'>";

for (var att in attachments) {
  var attachment = attachments[att];

  var attachmentUrl =
    parentLayerUrl +
    "/" +
    Text(parentObjectId) +
    "/attachments/" +
    Text(attachment.id) +
    "?token=" +
    token;

  var contentType = Lower(DefaultValue(attachment.contentType, ""));
  var fileName = DefaultValue(attachment.name, "Archivo adjunto");

  // Mostrar miniatura cuando sea una imagen
  if (Find("image/", contentType) == 0) {
    html +=
      "<a href='" +
      attachmentUrl +
      "' target='_blank'>" +
      "<img src='" +
      attachmentUrl +
      "'" +
      " style='width:100%;max-width:420px;" +
      "border-radius:6px;border:1px solid #d4d4d4;'>" +
      "</a>" +
      "<div style='margin-top:-6px;font-size:12px;'>" +
      fileName +
      "</div>";
  } else {
    // Mostrar enlace para PDF, documentos, ZIP, etc.
    html +=
      "<a href='" +
      attachmentUrl +
      "' target='_blank'>" +
      "📎 " +
      fileName +
      "</a>";
  }
}

html += "</div>";

return {
  type: "text",
  text: html,
};
