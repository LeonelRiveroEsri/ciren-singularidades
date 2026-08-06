// =====================================================
// 1) CONFIGURACIÓN DE LA RELACIÓN
// =====================================================

// Debe coincidir exactamente con el nombre de la relación
// registrado en el Feature Service.
var relationshipName =
  "<RELATIONSHIP_NAME_POINT>";

// =====================================================
// 2) OBTENER EL REGISTRO PADRE DESDE EL HIJO
// =====================================================

// $feature corresponde al registro hijo.
// Al consultar la relación desde el hijo, se recupera el padre.
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
    text: "No se encontró el registro padre relacionado.",
  };
}

// =====================================================
// 3) CAMPOS DEL PADRE PARA MOSTRAR EN EL POPUP DEL HIJO
// =====================================================

var mapFields = [
  // ---- Identificación de la inspección ----
  {
    alias: "ID de inspección",
    name: "identificador",
    type: "esriFieldTypeString",
  },
  { alias: "N.º de obra", name: "n_obra", type: "esriFieldTypeInteger" },
  {
    alias: "Nombre del canal",
    name: "nombre_canal",
    type: "esriFieldTypeString",
  },
  {
    alias: "Tipo de infraestructura",
    name: "canal_derivado",
    type: "esriFieldTypeString",
  },
  { alias: "Unidad", name: "unidad", type: "esriFieldTypeString" },

  // ---- Fechas ----
  {
    alias: "Fecha de inspección",
    name: "fecha_manual",
    type: "esriFieldTypeDate",
  },
  {
    alias: "Fecha de registro automático",
    name: "fecha_automatica",
    type: "esriFieldTypeDate",
  },

  // ---- Responsables ----
  { alias: "Encuestador/a", name: "encuestador", type: "esriFieldTypeString" },
  {
    alias: "Usuario de registro",
    name: "usuario_login",
    type: "esriFieldTypeString",
  },
  {
    alias: "Revisor responsable",
    name: "revisor_responsable",
    type: "esriFieldTypeString",
  },
  {
    alias: "Nombre del revisor",
    name: "nombre_revisor",
    type: "esriFieldTypeString",
  },
  {
    alias: "Estado de validación",
    name: "validacion",
    type: "esriFieldTypeString",
  },

  // ---- Iniciativa y antecedentes ----
  {
    alias: "Nombre de la iniciativa",
    name: "iniciativas",
    type: "esriFieldTypeString",
  },
  { alias: "Código BIP", name: "codigo_bip_", type: "esriFieldTypeString" },
  { alias: "Consultora", name: "consultora_", type: "esriFieldTypeString" },
  {
    alias: "Características de la obra",
    name: "caract_obra",
    type: "esriFieldTypeString",
  },
  {
    alias: "Singularidad",
    name: "singularidades",
    type: "esriFieldTypeString",
  },
  { alias: "Nota importante", name: "nota_1", type: "esriFieldTypeString" },

  // ---- Ubicación administrativa ----
  { alias: "Región", name: "region", type: "esriFieldTypeString" },
  { alias: "Provincia", name: "provincia", type: "esriFieldTypeString" },
  { alias: "Comuna", name: "comuna", type: "esriFieldTypeString" },
  { alias: "Cuenca", name: "cuenca", type: "esriFieldTypeString" },
  { alias: "Subcuenca", name: "subcuenca", type: "esriFieldTypeString" },
  { alias: "Sector", name: "sector", type: "esriFieldTypeString" },
  { alias: "Kilómetro o tramo", name: "km_tramo", type: "esriFieldTypeDouble" },

  // ---- Coordenadas y elevación ----
  {
    alias: "Longitud geográfica",
    name: "longitud",
    type: "esriFieldTypeDouble",
  },
  { alias: "Latitud geográfica", name: "latitud", type: "esriFieldTypeDouble" },
  { alias: "Coordenada UTM Este", name: "este", type: "esriFieldTypeDouble" },
  { alias: "Coordenada UTM Norte", name: "norte", type: "esriFieldTypeDouble" },
  {
    alias: "Cota Inicial (m s. n. m.)",
    name: "cota",
    type: "esriFieldTypeDouble",
  },
  {
    alias: "Cota Final (m s. n. m.)",
    name: "cota_manual",
    type: "esriFieldTypeDouble",
  },

  // ---- Características generales ----
  {
    alias: "Canal automatizado",
    name: "automatizada",
    type: "esriFieldTypeString",
  },
  {
    alias: "Grado de mantención",
    name: "grado_mantencion",
    type: "esriFieldTypeString",
  },
  { alias: "Materialidad", name: "materialidad", type: "esriFieldTypeString" },
  {
    alias: "Caudal máximo de porteo (l/s)",
    name: "caudal",
    type: "esriFieldTypeDouble",
  },
  {
    alias: "Presencia de vegetación",
    name: "presencia_vegetacion",
    type: "esriFieldTypeString",
  },
  {
    alias: "Dificultad de acceso",
    name: "dificultad_acceso",
    type: "esriFieldTypeString",
  },

  // ---- Cruces ----
  {
    alias: "Tipo de cruce en cauce natural",
    name: "tipo_cruce_cauce",
    type: "esriFieldTypeString",
  },
  {
    alias: "Tipo de cruce en camino o ferrocarril",
    name: "tipo_cruce_camino",
    type: "esriFieldTypeString",
  },

  // ---- Dimensiones ----
  {
    alias: "Longitud del tramo (m)",
    name: "longitud_tramo",
    type: "esriFieldTypeDouble",
  },
  { alias: "Largo de la obra (m)", name: "largo", type: "esriFieldTypeDouble" },
  { alias: "Ancho de la obra (m)", name: "ancho", type: "esriFieldTypeDouble" },
  { alias: "Altura de la obra (m)", name: "alto", type: "esriFieldTypeDouble" },
  {
    alias: "Diámetro de la obra (m)",
    name: "diametro",
    type: "esriFieldTypeDouble",
  },

  // ---- Evaluación técnica ----
  {
    alias: "Funcionamiento hidráulico",
    name: "fun_hidraulico",
    type: "esriFieldTypeString",
  },
  {
    alias: "N(Pi) Funcionamiento hidráulico",
    name: "npi_fun_hidraulico",
    type: "esriFieldTypeDouble",
  },
  {
    alias: "Estado estructural",
    name: "est_estructural",
    type: "esriFieldTypeString",
  },
  {
    alias: "N(Pi) Estado estructural",
    name: "npi_est_estructural",
    type: "esriFieldTypeDouble",
  },
  {
    alias: "Puntaje de factores técnicos",
    name: "puntaje_tec",
    type: "esriFieldTypeDouble",
  },
  {
    alias: "Estado de factores técnicos",
    name: "estado_factores_tec",
    type: "esriFieldTypeString",
  },

  // ---- Evaluación de gestión y riesgo ----
  {
    alias: "Factores de riesgo",
    name: "factor_riesgo",
    type: "esriFieldTypeString",
  },
  {
    alias: "N(Pi) Factores de riesgo",
    name: "npi_factor_riesgo",
    type: "esriFieldTypeDouble",
  },
  {
    alias: "Facilidad de operación",
    name: "facilidad_operacion",
    type: "esriFieldTypeString",
  },
  {
    alias: "N(Pi) Facilidad de operación",
    name: "npi_facilidad_oper",
    type: "esriFieldTypeDouble",
  },
  {
    alias: "Puntaje de factores de gestión",
    name: "puntaje_gestion",
    type: "esriFieldTypeDouble",
  },
  {
    alias: "Estado de factores de gestión",
    name: "estado_factores_gest",
    type: "esriFieldTypeString",
  },

  // ---- Rehabilitación ----
  {
    alias: "¿Requiere rehabilitación?",
    name: "requiere_rehabilitacion",
    type: "esriFieldTypeString",
  },
  {
    alias: "Tipo de rehabilitación requerida",
    name: "tipo_rehabilitacion",
    type: "esriFieldTypeString",
  },

  // ---- Evidencias ----
  {
    alias: "Agregar segunda fotografía",
    name: "si_no_fotografia",
    type: "esriFieldTypeString",
  },
  {
    alias: "Agregar tercera fotografía",
    name: "si_no_fotografia2",
    type: "esriFieldTypeString",
  },
  {
    alias: "Agregar cuarta fotografía",
    name: "si_no_fotografia3",
    type: "esriFieldTypeString",
  },
  {
    alias: "Agregar segundo croquis",
    name: "si_no_croquis",
    type: "esriFieldTypeString",
  },
  {
    alias: "Agregar tercer croquis",
    name: "si_no_croquis2",
    type: "esriFieldTypeString",
  },

  // ---- Observaciones ----
  {
    alias: "Observaciones",
    name: "observaciones",
    type: "esriFieldTypeString",
  },

  // ---- Auditoría ----
  {
    alias: "Fecha de creación",
    name: "CreationDate",
    type: "esriFieldTypeDate",
  },
  { alias: "Creado por", name: "Creator", type: "esriFieldTypeString" },
  {
    alias: "Fecha de última edición",
    name: "EditDate",
    type: "esriFieldTypeDate",
  },
  { alias: "Editado por", name: "Editor", type: "esriFieldTypeString" },
];

// =====================================================
// 4) HELPERS DE FORMATO
// =====================================================

function fmtValue(nameField, fieldType, value) {
  if (IsEmpty(value)) {
    return null;
  }

  if (fieldType == "esriFieldTypeDate") {
    return Text(value, "DD-MM-YYYY");
  }

  if (fieldType == "esriFieldTypeDouble") {
    return Text(Number(value), "#,###.00");
  }

  if (fieldType == "esriFieldTypeInteger") {
    return Text(Number(value), "#,###");
  }

  return Text(value);
}

// =====================================================
// 5) CONSTRUIR LA TABLA CON LOS ATRIBUTOS DEL PADRE
// =====================================================

var attributes = {};
var fieldInfos = [];

for (var i = 0; i < Count(mapFields); i++) {
  var fieldDefinition = mapFields[i];
  var fieldName = fieldDefinition.name;
  var alias = fieldDefinition.alias;
  var fieldType = fieldDefinition.type;

  // Aquí se lee parentFeature, no $feature.
  var rawValue = parentFeature[fieldName];
  var formattedValue = fmtValue(fieldName, fieldType, rawValue);

  if (!IsEmpty(formattedValue)) {
    // El nombre interno debe ser único.
    var outputFieldName = "parent_" + fieldName;

    attributes[outputFieldName] = formattedValue;

    Push(fieldInfos, {
      fieldName: outputFieldName,
      label: alias,
    });
  }
}

// =====================================================
// 6) VALIDACIÓN
// =====================================================

if (Count(fieldInfos) == 0) {
  return {
    type: "text",
    text: "El registro padre relacionado no contiene información.",
  };
}

// =====================================================
// 7) RETORNAR POPUP DEL HIJO CON INFORMACIÓN DEL PADRE
// =====================================================

return {
  type: "fields",
  fieldInfos: fieldInfos,
  attributes: attributes,
};
