// LARK datamodell – basert på SOSI Park og grøntanlegg / NS 3420

export const SERVICE_NAME = "LARK_Landskapsplan";

// ─── Felles domenelister ─────────────────────────────────────────────────────

const D_STATUS = {
  type: "codedValue",
  name: "D_Status",
  codedValues: [
    { code: "PLAN",  name: "Planlagt" },
    { code: "UNDER", name: "Under utbygging" },
    { code: "EKSIS", name: "Eksisterende" },
    { code: "FJER",  name: "Skal fjernes" },
  ],
};

const D_FORVALTNING = {
  type: "codedValue",
  name: "D_Forvaltning",
  codedValues: [
    { code: "KOM",    name: "Kommunal" },
    { code: "PRIV",   name: "Privat" },
    { code: "STAT",   name: "Statlig" },
    { code: "BORETT", name: "Borettslag/Sameie" },
    { code: "ANNET",  name: "Annet" },
  ],
};

const D_MATERIAL = {
  type: "codedValue",
  name: "D_Material",
  codedValues: [
    { code: "TRE",    name: "Tre" },
    { code: "METALL", name: "Metall/stål" },
    { code: "BETONG", name: "Betong" },
    { code: "STEIN",  name: "Stein/naturstein" },
    { code: "PLAST",  name: "Plast/kompositt" },
    { code: "ANNET",  name: "Annet" },
  ],
};

const D_DEKKE = {
  type: "codedValue",
  name: "D_Dekke",
  codedValues: [
    { code: "ASFALT", name: "Asfalt" },
    { code: "GRUS",   name: "Grus" },
    { code: "HELLER", name: "Heller/fliser" },
    { code: "BSTEIN", name: "Brostein/naturstein" },
    { code: "TRE",    name: "Tredekke" },
    { code: "GUMMI",  name: "Gummidekke/fallunderlag" },
    { code: "GRESS",  name: "Gress" },
    { code: "BARK",   name: "Bark/flis" },
    { code: "NAT",    name: "Naturlig/ubefestet" },
    { code: "ANNET",  name: "Annet" },
  ],
};

const D_JA_NEI = {
  type: "codedValue",
  name: "D_JaNei",
  codedValues: [
    { code: "JA",  name: "Ja" },
    { code: "NEI", name: "Nei" },
  ],
};

// ─── Lagspesifikke domenelister ───────────────────────────────────────────────

const D_GRØNTAREAL_TYPE = {
  type: "codedValue",
  name: "D_GrontarealType",
  codedValues: [
    { code: "PARK",   name: "Park" },
    { code: "NATUR",  name: "Naturområde" },
    { code: "LEIK",   name: "Lekeplass" },
    { code: "IDRETT", name: "Idrettsanlegg" },
    { code: "KIRKEG", name: "Kirkegård" },
    { code: "KOLON",  name: "Kolonihage" },
    { code: "SKOLE",  name: "Skolegård" },
    { code: "HUNDE",  name: "Hundegård" },
    { code: "BUFFER", name: "Buffersone/Grøntdrag" },
    { code: "ANNET",  name: "Annet grøntareal" },
  ],
};

const D_VEGETASJON_TYPE = {
  type: "codedValue",
  name: "D_VegetasjonType",
  codedValues: [
    { code: "PLEN",  name: "Plen" },
    { code: "ENG",   name: "Eng/blomstereng" },
    { code: "BLOM",  name: "Blomsterbed/staudebed" },
    { code: "BUSK",  name: "Buskfelt" },
    { code: "HEKK",  name: "Hekk" },
    { code: "TREG",  name: "Tregruppe/lund" },
    { code: "SKOG",  name: "Skog/trevegetasjon" },
    { code: "BAMB",  name: "Bambus" },
    { code: "KLATR", name: "Klatreplanter" },
    { code: "ANNET", name: "Annet" },
  ],
};

const D_TETTHET = {
  type: "codedValue",
  name: "D_Tetthet",
  codedValues: [
    { code: "TETT",  name: "Tett" },
    { code: "APEN",  name: "Åpen" },
    { code: "SPED",  name: "Spredt" },
  ],
};

const D_TRE_TILSTAND = {
  type: "codedValue",
  name: "D_TreTilstand",
  codedValues: [
    { code: "GOD",    name: "God" },
    { code: "MIDD",   name: "Middels" },
    { code: "DARLIG", name: "Dårlig" },
    { code: "KRIT",   name: "Kritisk" },
  ],
};

const D_STI_TYPE = {
  type: "codedValue",
  name: "D_StiType",
  codedValues: [
    { code: "GANG",  name: "Gangvei" },
    { code: "SYKK",  name: "Sykkelvei" },
    { code: "GS",    name: "Gang- og sykkelvei" },
    { code: "TUR",   name: "Tursti" },
    { code: "NAT",   name: "Natursti" },
    { code: "KJORE", name: "Kjørevei/adkomst" },
    { code: "ANNET", name: "Annet" },
  ],
};

const D_HARD_FLATE_TYPE = {
  type: "codedValue",
  name: "D_HardFlateType",
  codedValues: [
    { code: "PLASS",  name: "Torg/plass" },
    { code: "PARK",   name: "Parkeringsplass" },
    { code: "TERR",   name: "Terrasse/uteplass" },
    { code: "SKATE",  name: "Skateanlegg" },
    { code: "BALL",   name: "Ballbane/sportsplass" },
    { code: "SCEN",   name: "Scene/amfiteater" },
    { code: "ANNET",  name: "Annet" },
  ],
};

const D_VANN_TYPE = {
  type: "codedValue",
  name: "D_VannType",
  codedValues: [
    { code: "DAM",   name: "Dam/tjern" },
    { code: "BASS",  name: "Basseng/speildam" },
    { code: "FONT",  name: "Fontene" },
    { code: "BEKK",  name: "Bekk/elv" },
    { code: "REGNB", name: "Regnbed/fordrøyning" },
    { code: "ANNET", name: "Annet" },
  ],
};

const D_MØBLERING_TYPE = {
  type: "codedValue",
  name: "D_MobleringType",
  codedValues: [
    { code: "BENK",  name: "Benk" },
    { code: "BORD",  name: "Bord/benkegruppe" },
    { code: "SOPP",  name: "Søppelkasse/avfallsbeholder" },
    { code: "BEL",   name: "Belysning/lyktepost" },
    { code: "SYKK",  name: "Sykkelstativ" },
    { code: "FLAGG", name: "Flaggstang" },
    { code: "SKILT", name: "Skilt/informasjonstavle" },
    { code: "DRIKK", name: "Drikkefontene" },
    { code: "GRILL", name: "Grillplass/bålplass" },
    { code: "STEIN", name: "Stein/skulptur" },
    { code: "LEIK",  name: "Lekeutstyr" },
    { code: "ANNET", name: "Annet" },
  ],
};

const D_KONSTRUKSJON_TYPE = {
  type: "codedValue",
  name: "D_KonstruksjonsType",
  codedValues: [
    { code: "MUR",    name: "Mur/støttemur" },
    { code: "GJERDE", name: "Gjerde/rekkverk" },
    { code: "PERG",   name: "Pergola/hvelv" },
    { code: "PAVI",   name: "Paviljong/svalgang" },
    { code: "LESKUR", name: "Leskur/overbygg" },
    { code: "TRAPP",  name: "Trapp/rampe" },
    { code: "BRO",    name: "Bro/gangbro" },
    { code: "PLATT",  name: "Platting/dekke" },
    { code: "ANNET",  name: "Annet" },
  ],
};

// ─── Felles felt brukt i flere lag ───────────────────────────────────────────

const F_NAVN =        { name: "Navn",        type: "esriFieldTypeString",  alias: "Navn",          length: 100, nullable: true, editable: true };
const F_BESKRIVELSE = { name: "Beskrivelse", type: "esriFieldTypeString",  alias: "Beskrivelse",   length: 500, nullable: true, editable: true };
const F_PROSJEKT =    { name: "Prosjekt",    type: "esriFieldTypeString",  alias: "Prosjektnavn",  length: 200, nullable: true, editable: true };
const F_REFERANSE =   { name: "Referanse",   type: "esriFieldTypeString",  alias: "Referanse/ID",  length: 100, nullable: true, editable: true };
const F_STATUS =      { name: "Status",      type: "esriFieldTypeString",  alias: "Status",        length: 10,  nullable: true, editable: true, domain: D_STATUS };
const F_FORVALTNING = { name: "Forvaltning", type: "esriFieldTypeString",  alias: "Forvaltningsansvar", length: 10, nullable: true, editable: true, domain: D_FORVALTNING };

// ─── Lagdefinisjoner for addToDefinition ──────────────────────────────────────

export const LAYER_DEFINITIONS = [
  // ── 0: Grøntareal (polygon) ───────────────────────────────────────────────
  {
    id: 0,
    name: "Grontareal",
geometryType: "esriGeometryPolygon",
    description: "Planlagte og eksisterende grøntarealer (NS 3420 / SOSI Park)",
    hasZ: false,
    hasM: false,
    allowGeometryUpdates: true,
fields: [
      { name: "GrontarealType", type: "esriFieldTypeString", alias: "Grøntarealtype",      length: 10,  nullable: true, editable: true, domain: D_GRØNTAREAL_TYPE },
      { name: "Areal_m2",       type: "esriFieldTypeDouble", alias: "Areal (m2)",          nullable: true, editable: true },
      F_FORVALTNING, F_STATUS, F_NAVN, F_PROSJEKT, F_REFERANSE, F_BESKRIVELSE,
    ],
    drawingInfo: {
      renderer: {
        type: "simple",
        symbol: {
          type: "esriSFS",
          style: "esriSFSSolid",
          color: [141, 211, 95, 160],
          outline: { type: "esriSLS", style: "esriSLSSolid", color: [60, 130, 30, 255], width: 1.5 },
        },
      },
    },
  },

  // ── 1: Vegetasjon_flate (polygon) ─────────────────────────────────────────
  {
    id: 1,
    name: "Vegetasjon_flate",
geometryType: "esriGeometryPolygon",
    description: "Vegetasjonsflater og beplantningsområder",
    hasZ: false,
    hasM: false,
    allowGeometryUpdates: true,
fields: [
      { name: "VegetasjonType",   type: "esriFieldTypeString", alias: "Vegetasjonstype",     length: 10,  nullable: true, editable: true, domain: D_VEGETASJON_TYPE },
      { name: "PlanteArt",        type: "esriFieldTypeString", alias: "Planteart (botanisk)", length: 200, nullable: true, editable: true },
      { name: "PlanteArtNorsk",   type: "esriFieldTypeString", alias: "Planteart (norsk)",    length: 200, nullable: true, editable: true },
      { name: "Tetthet",          type: "esriFieldTypeString", alias: "Tetthet",              length: 10,  nullable: true, editable: true, domain: D_TETTHET },
      F_STATUS, F_NAVN, F_PROSJEKT, F_REFERANSE, F_BESKRIVELSE,
    ],
    drawingInfo: {
      renderer: {
        type: "simple",
        symbol: {
          type: "esriSFS",
          style: "esriSFSForwardDiagonal",
          color: [86, 168, 54, 220],
          outline: { type: "esriSLS", style: "esriSLSSolid", color: [40, 120, 20, 255], width: 1 },
        },
      },
    },
  },

  // ── 2: Tre (punkt) ────────────────────────────────────────────────────────
  {
    id: 2,
    name: "Tre",
geometryType: "esriGeometryPoint",
    description: "Enkelttrær",
    hasZ: false,
    hasM: false,
    allowGeometryUpdates: true,
fields: [
      { name: "TreArt",            type: "esriFieldTypeString",  alias: "Treslag (botanisk)",  length: 200, nullable: true, editable: true },
      { name: "TreArtNorsk",       type: "esriFieldTypeString",  alias: "Treslag (norsk)",     length: 200, nullable: true, editable: true },
      { name: "Stammediameter_cm", type: "esriFieldTypeInteger", alias: "Stammediameter (cm)", nullable: true, editable: true },
      { name: "Kronediameter_m",   type: "esriFieldTypeDouble",  alias: "Kronediameter (m)",   nullable: true, editable: true },
      { name: "Hoyde_m",           type: "esriFieldTypeDouble",  alias: "Høyde (m)",           nullable: true, editable: true },
      { name: "Alder_ar",          type: "esriFieldTypeInteger", alias: "Alder (år)",          nullable: true, editable: true },
      { name: "Tilstand",          type: "esriFieldTypeString",  alias: "Tilstand",            length: 10, nullable: true, editable: true, domain: D_TRE_TILSTAND },
      F_STATUS, F_NAVN, F_PROSJEKT, F_REFERANSE, F_BESKRIVELSE,
    ],
    drawingInfo: {
      renderer: {
        type: "simple",
        symbol: {
          type: "esriSMS",
          style: "esriSMSCircle",
          color: [34, 139, 34, 255],
          size: 10,
          outline: { color: [0, 80, 0, 255], width: 1.5 },
        },
      },
    },
  },

  // ── 3: Sti_vei (linje) ────────────────────────────────────────────────────
  {
    id: 3,
    name: "Sti_vei",
geometryType: "esriGeometryPolyline",
    description: "Stier, veier og gangforbindelser",
    hasZ: false,
    hasM: false,
    allowGeometryUpdates: true,
fields: [
      { name: "StiType",   type: "esriFieldTypeString", alias: "Stitype",     length: 10,  nullable: true, editable: true, domain: D_STI_TYPE },
      { name: "Bredde_m",  type: "esriFieldTypeDouble", alias: "Bredde (m)",  nullable: true, editable: true },
      { name: "Dekke",     type: "esriFieldTypeString", alias: "Dekke",       length: 10,  nullable: true, editable: true, domain: D_DEKKE },
      { name: "Belysning", type: "esriFieldTypeString", alias: "Belysning",   length: 3,   nullable: true, editable: true, domain: D_JA_NEI },
      F_STATUS, F_NAVN, F_PROSJEKT, F_REFERANSE, F_BESKRIVELSE,
    ],
    drawingInfo: {
      renderer: {
        type: "simple",
        symbol: { type: "esriSLS", style: "esriSLSSolid", color: [120, 100, 60, 255], width: 2.5 },
      },
    },
  },

  // ── 4: Hard_flate (polygon) ───────────────────────────────────────────────
  {
    id: 4,
    name: "Hard_flate",
geometryType: "esriGeometryPolygon",
    description: "Harde flater, plasser og belegning",
    hasZ: false,
    hasM: false,
    allowGeometryUpdates: true,
fields: [
      { name: "HardFlateType", type: "esriFieldTypeString", alias: "Type hard flate", length: 10, nullable: true, editable: true, domain: D_HARD_FLATE_TYPE },
      { name: "Belegg",        type: "esriFieldTypeString", alias: "Belegg/dekke",    length: 10, nullable: true, editable: true, domain: D_DEKKE },
      { name: "Areal_m2",      type: "esriFieldTypeDouble", alias: "Areal (m2)",      nullable: true, editable: false },
      F_STATUS, F_FORVALTNING, F_NAVN, F_PROSJEKT, F_REFERANSE, F_BESKRIVELSE,
    ],
    drawingInfo: {
      renderer: {
        type: "simple",
        symbol: {
          type: "esriSFS",
          style: "esriSFSSolid",
          color: [200, 190, 170, 160],
          outline: { type: "esriSLS", style: "esriSLSSolid", color: [140, 130, 110, 255], width: 1 },
        },
      },
    },
  },

  // ── 5: Vannflate (polygon) ────────────────────────────────────────────────
  {
    id: 5,
    name: "Vannflate",
geometryType: "esriGeometryPolygon",
    description: "Vann, bekker, dammer og vannspeil",
    hasZ: false,
    hasM: false,
    allowGeometryUpdates: true,
fields: [
      { name: "VannType", type: "esriFieldTypeString", alias: "Vanntype",    length: 10, nullable: true, editable: true, domain: D_VANN_TYPE },
      { name: "Dybde_m",  type: "esriFieldTypeDouble", alias: "Dybde (m)",   nullable: true, editable: true },
      { name: "Areal_m2", type: "esriFieldTypeDouble", alias: "Areal (m2)",  nullable: true, editable: false },
      F_STATUS, F_NAVN, F_PROSJEKT, F_REFERANSE, F_BESKRIVELSE,
    ],
    drawingInfo: {
      renderer: {
        type: "simple",
        symbol: {
          type: "esriSFS",
          style: "esriSFSSolid",
          color: [100, 175, 230, 180],
          outline: { type: "esriSLS", style: "esriSLSSolid", color: [30, 100, 200, 255], width: 1 },
        },
      },
    },
  },

  // ── 6: Møblering (punkt) ──────────────────────────────────────────────────
  {
    id: 6,
    name: "Moblering",
geometryType: "esriGeometryPoint",
    description: "Møblering, utstyr og elementer",
    hasZ: false,
    hasM: false,
    allowGeometryUpdates: true,
fields: [
      { name: "MobleringType", type: "esriFieldTypeString",  alias: "Type møblering",   length: 10,  nullable: true, editable: true, domain: D_MØBLERING_TYPE },
      { name: "Material",      type: "esriFieldTypeString",  alias: "Material",         length: 10,  nullable: true, editable: true, domain: D_MATERIAL },
      { name: "Produsent",     type: "esriFieldTypeString",  alias: "Produsent/modell", length: 200, nullable: true, editable: true },
      { name: "Antall",        type: "esriFieldTypeInteger", alias: "Antall",           nullable: true, editable: true },
      F_STATUS, F_NAVN, F_PROSJEKT, F_REFERANSE, F_BESKRIVELSE,
    ],
    drawingInfo: {
      renderer: {
        type: "simple",
        symbol: {
          type: "esriSMS",
          style: "esriSMSSquare",
          color: [230, 140, 50, 255],
          size: 9,
          outline: { color: [160, 90, 0, 255], width: 1.5 },
        },
      },
    },
  },

  // ── 7: Konstruksjon (polygon) ─────────────────────────────────────────────
  {
    id: 7,
    name: "Konstruksjon",
geometryType: "esriGeometryPolygon",
    description: "Konstruksjoner, bygg og anleggselementer",
    hasZ: false,
    hasM: false,
    allowGeometryUpdates: true,
fields: [
      { name: "KonstruksjonsType", type: "esriFieldTypeString", alias: "Konstruksjonstype", length: 10,  nullable: true, editable: true, domain: D_KONSTRUKSJON_TYPE },
      { name: "Material",          type: "esriFieldTypeString", alias: "Material",          length: 10,  nullable: true, editable: true, domain: D_MATERIAL },
      { name: "Areal_m2",          type: "esriFieldTypeDouble", alias: "Areal (m2)",        nullable: true, editable: false },
      F_STATUS, F_FORVALTNING, F_NAVN, F_PROSJEKT, F_REFERANSE, F_BESKRIVELSE,
    ],
    drawingInfo: {
      renderer: {
        type: "simple",
        symbol: {
          type: "esriSFS",
          style: "esriSFSSolid",
          color: [190, 150, 100, 200],
          outline: { type: "esriSLS", style: "esriSLSSolid", color: [110, 70, 30, 255], width: 2 },
        },
      },
    },
  },
];
