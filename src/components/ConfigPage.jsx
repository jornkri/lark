import { useState } from "react";
import { LAYER_DEFINITIONS } from "../config/dataModel.js";
import { COORD_SYSTEMS, GEOM_LABELS, saveConfig, isCustomLayerId, makeCustomLayerId } from "../services/appConfig.js";

const DEFS_BY_ID = Object.fromEntries(LAYER_DEFINITIONS.map((d) => [d.id, d]));

const LeafSVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.85 }} aria-hidden="true">
    <path
      d="M12 3 C7 3 3 7 3 12 C3 17 7 21 12 21 C12 21 12 14 12 12 C12 14 12 21 12 21 C17 21 21 17 21 12 C21 7 17 3 12 3Z"
      fill="rgba(200,240,174,0.15)" stroke="#c8f0ae" strokeWidth="1.2"
    />
    <line x1="12" y1="3" x2="12" y2="21.5" stroke="rgba(200,240,174,0.3)" strokeWidth="0.8"/>
    <path d="M12 8 Q8 10 7 13"  stroke="rgba(200,240,174,0.2)" strokeWidth="0.7" fill="none"/>
    <path d="M12 8 Q16 10 17 13" stroke="rgba(200,240,174,0.2)" strokeWidth="0.7" fill="none"/>
  </svg>
);

const DEFAULT_CUSTOM_ICON = "https://img.icons8.com/color/48/add-layer.png";

const NAV_ITEMS = [
  { id: "general",   label: "Generelt",   icon: "⚙" },
  { id: "datamodel", label: "Datamodell", icon: "◫" },
  { id: "symbology", label: "Symbolikk",  icon: "◎", future: true },
  { id: "export",    label: "Eksport",    icon: "⤓", future: true },
  { id: "sharing",   label: "Deling",     icon: "↗", future: true },
];

// ── Icon renderer (handles both icons8 URL and emoji) ─────────────────────────

function LayerIcon({ icon, className }) {
  if (!icon) return null;
  if (icon.startsWith("http"))
    return <img className={className} src={icon} alt="" onError={(e) => { e.target.style.display = "none"; }} />;
  return <span className={className}>{icon}</span>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBuiltinDomain(def, typeFieldName) {
  if (!typeFieldName) return [];
  return def?.fields?.find((f) => f.name === typeFieldName)?.domain?.codedValues ?? [];
}

function getTypeFieldName(def) {
  const candidates = [
    "GrontarealType", "VegetasjonType", "StiType",
    "HardFlateType",  "VannType",       "MobleringType", "KonstruksjonsType",
  ];
  for (const name of candidates) {
    if (def.fields?.some((f) => f.name === name)) return name;
  }
  return null;
}

// ── GeomBadge ─────────────────────────────────────────────────────────────────

function GeomBadge({ geometryType }) {
  const suffix =
    geometryType === "esriGeometryPolygon"  ? "polygon"  :
    geometryType === "esriGeometryPolyline" ? "polyline" : "point";
  return (
    <span className={`cfg-badge cfg-badge-${suffix}`}>
      {GEOM_LABELS[geometryType] ?? geometryType}
    </span>
  );
}

// ── DomainEditor – shows built-in + custom values, allows rename/add/remove ──

function DomainEditor({ layerId, layerCfg, isCustom, def, onUpdate }) {
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  const typeFieldName  = isCustom ? layerCfg.typeField  : getTypeFieldName(def);
  const builtinValues  = isCustom ? []                  : getBuiltinDomain(def, typeFieldName);
  const customValues   = layerCfg.customDomainValues ?? [];
  const renames        = layerCfg.domainRenames      ?? {};
  const enabled        = layerCfg.enabledSubtypes    ?? builtinValues.map((cv) => cv.code);

  if (!typeFieldName && !isCustom) return null;
  if (!typeFieldName && isCustom && customValues.length === 0 && !layerCfg.typeField) return null;

  function toggleCode(code) {
    const next = enabled.includes(code)
      ? enabled.filter((c) => c !== code)
      : [...enabled, code];
    onUpdate({ ...layerCfg, enabledSubtypes: next });
  }

  function renameValue(code, name, isCustomVal) {
    if (isCustomVal) {
      const newCustom = customValues.map((cv) =>
        cv.code === code ? { ...cv, name } : cv
      );
      onUpdate({ ...layerCfg, customDomainValues: newCustom });
    } else {
      const orig = builtinValues.find((cv) => cv.code === code)?.name ?? "";
      const newRenames = { ...renames };
      if (name && name !== orig) newRenames[code] = name;
      else delete newRenames[code];
      onUpdate({ ...layerCfg, domainRenames: newRenames });
    }
  }

  function addValue() {
    const code = newCode.trim().toUpperCase().replace(/\s+/g, "_");
    const name = newName.trim();
    if (!code || !name) return;
    if ([...builtinValues, ...customValues].some((cv) => cv.code === code)) return;
    onUpdate({
      ...layerCfg,
      customDomainValues: [...customValues, { code, name }],
      enabledSubtypes:    [...enabled, code],
    });
    setNewCode(""); setNewName("");
  }

  function removeCustomValue(code) {
    onUpdate({
      ...layerCfg,
      customDomainValues: customValues.filter((cv) => cv.code !== code),
      enabledSubtypes:    enabled.filter((c) => c !== code),
    });
  }

  function toggleAll() {
    const allCodes = [...builtinValues, ...customValues].map((cv) => cv.code);
    const allOn    = allCodes.every((c) => enabled.includes(c));
    onUpdate({ ...layerCfg, enabledSubtypes: allOn ? [] : allCodes });
  }

  const allCodes = [...builtinValues, ...customValues].map((cv) => cv.code);
  const allOn    = allCodes.length > 0 && allCodes.every((c) => enabled.includes(c));

  return (
    <div className="cfg-domain-editor">
      <div className="cfg-domain-toolbar">
        <span className="cfg-domain-header">Typeverdier</span>
        {allCodes.length > 0 && (
          <button type="button" className="cfg-domain-toggle-all" onClick={toggleAll}>
            {allOn ? "Fjern alle" : "Velg alle"}
          </button>
        )}
      </div>

      {builtinValues.map((cv) => {
        const displayName = renames[cv.code] ?? cv.name;
        const isOn = enabled.includes(cv.code);
        return (
          <div key={cv.code} className={"cfg-domain-row" + (isOn ? "" : " cfg-domain-row-off")}>
            <label className="cfg-toggle cfg-toggle-sm">
              <input type="checkbox" className="cfg-toggle-input" checked={isOn} onChange={() => toggleCode(cv.code)} />
              <span className="cfg-toggle-slider" />
            </label>
            <input
              className="cfg-domain-name"
              value={displayName}
              placeholder={cv.name}
              onChange={(e) => renameValue(cv.code, e.target.value, false)}
            />
            <span className="cfg-domain-code">{cv.code}</span>
          </div>
        );
      })}

      {customValues.map((cv) => {
        const isOn = enabled.includes(cv.code);
        return (
          <div key={cv.code} className={"cfg-domain-row cfg-domain-row-custom" + (isOn ? "" : " cfg-domain-row-off")}>
            <label className="cfg-toggle cfg-toggle-sm">
              <input type="checkbox" className="cfg-toggle-input" checked={isOn} onChange={() => toggleCode(cv.code)} />
              <span className="cfg-toggle-slider" />
            </label>
            <input
              className="cfg-domain-name"
              value={cv.name}
              onChange={(e) => renameValue(cv.code, e.target.value, true)}
            />
            <span className="cfg-domain-code">{cv.code}</span>
            <button type="button" className="cfg-domain-del" onClick={() => removeCustomValue(cv.code)} title="Slett verdi">✕</button>
          </div>
        );
      })}

      <div className="cfg-domain-add">
        <input
          className="cfg-domain-add-code"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value.toUpperCase())}
          placeholder="KODE"
          maxLength={30}
        />
        <input
          className="cfg-domain-add-name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Navn på verdi"
        />
        <button type="button" className="cfg-domain-add-btn" onClick={addValue} disabled={!newCode.trim() || !newName.trim()}>
          + Legg til
        </button>
      </div>
    </div>
  );
}

// ── LayerRow ──────────────────────────────────────────────────────────────────

function LayerRow({ layerId, layerCfg, isCustom, onUpdate, onDelete,
                    dragging, dragOver, onDragStart, onDragEnter, onDragOver, onDrop, onDragEnd }) {
  const [expanded, setExpanded] = useState(false);
  const [iconEdit, setIconEdit] = useState(false);
  const def          = isCustom ? null : DEFS_BY_ID[layerId];
  const geometryType = isCustom ? layerCfg.geometryType : def?.geometryType;
  const hasTypeField = isCustom ? !!layerCfg.typeField   : !!getTypeFieldName(def);

  return (
    <div
      className={
        "cfg-layer" +
        (layerCfg.enabled ? "" : " cfg-layer-off") +
        (dragging  ? " cfg-layer-dragging"  : "") +
        (dragOver  ? " cfg-layer-drag-over" : "")
      }
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="cfg-layer-hd">
        <span className="cfg-drag-handle" title="Dra for å endre rekkefølge">⠿</span>

        <label className="cfg-toggle">
          <input
            className="cfg-toggle-input"
            type="checkbox"
            checked={layerCfg.enabled}
            onChange={(e) => onUpdate({ ...layerCfg, enabled: e.target.checked })}
          />
          <span className="cfg-toggle-slider" />
        </label>

        <button
          type="button"
          className={"cfg-icon-btn" + (iconEdit ? " cfg-icon-btn-open" : "")}
          onClick={() => setIconEdit((v) => !v)}
          title="Klikk for å endre ikon"
        >
          <LayerIcon icon={layerCfg.icon || DEFAULT_CUSTOM_ICON} className="cfg-layer-icon" />
        </button>

        <input
          className="cfg-layer-name"
          type="text"
          value={layerCfg.displayName}
          onChange={(e) => onUpdate({ ...layerCfg, displayName: e.target.value })}
        />

        <GeomBadge geometryType={geometryType} />

        {hasTypeField && (
          <button type="button" className={"cfg-expand-btn" + (expanded ? " cfg-expand-btn-open" : "")} onClick={() => setExpanded((v) => !v)}>
            {expanded ? "− Typer" : "+ Typer"}
          </button>
        )}

        {isCustom && (
          <button type="button" className="cfg-del-btn" onClick={onDelete} title="Slett lag">✕</button>
        )}
      </div>

      {iconEdit && (
        <div className="cfg-icon-edit-row">
          <LayerIcon icon={layerCfg.icon || DEFAULT_CUSTOM_ICON} className="cfg-icon-preview-lg" />
          <input
            className="cfg-icon-url-input"
            value={layerCfg.icon ?? ""}
            onChange={(e) => onUpdate({ ...layerCfg, icon: e.target.value })}
            placeholder="icons8.com URL eller emoji"
            autoFocus
          />
          <button type="button" className="cfg-btn-ghost cfg-icon-close" onClick={() => setIconEdit(false)}>✕</button>
        </div>
      )}

      {expanded && hasTypeField && (
        <DomainEditor
          layerId={layerId}
          layerCfg={layerCfg}
          isCustom={isCustom}
          def={def}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

// ── AddCustomLayerForm ────────────────────────────────────────────────────────

function AddCustomLayerForm({ onAdd }) {
  const [open,     setOpen]     = useState(false);
  const [name,     setName]     = useState("");
  const [icon,     setIcon]     = useState(DEFAULT_CUSTOM_ICON);
  const [geomType, setGeomType] = useState("esriGeometryPoint");
  const [typeField, setTypeField] = useState("");
  const [values,   setValues]   = useState([]); // [{code, name}]
  const [valCode,  setValCode]  = useState("");
  const [valName,  setValName]  = useState("");

  function addValue() {
    const code = valCode.trim().toUpperCase().replace(/\s+/g, "_");
    const nm   = valName.trim();
    if (!code || !nm || values.some((v) => v.code === code)) return;
    setValues((v) => [...v, { code, name: nm }]);
    setValCode(""); setValName("");
  }

  function removeValue(code) {
    setValues((v) => v.filter((x) => x.code !== code));
  }

  function handleAdd() {
    if (!name.trim()) return;
    const clientId = makeCustomLayerId();
    onAdd({
      clientId,
      [clientId]: {
        enabled:            true,
        displayName:        name.trim(),
        icon:               icon || DEFAULT_CUSTOM_ICON,
        geometryType:       geomType,
        typeField:          typeField.trim() || null,
        agolLayerId:        null,
        enabledSubtypes:    values.map((v) => v.code),
        domainRenames:      {},
        customDomainValues: [...values],
      },
    });
    setOpen(false); setName(""); setIcon(DEFAULT_CUSTOM_ICON); setGeomType("esriGeometryPoint");
    setTypeField(""); setValues([]); setValCode(""); setValName("");
  }

  if (!open) {
    return (
      <button type="button" className="cfg-add-layer-btn" onClick={() => setOpen(true)}>
        + Legg til tilpasset lag
      </button>
    );
  }

  return (
    <div className="cfg-add-layer-form">
      <p className="cfg-add-layer-title">Nytt tilpasset lag</p>

      <div className="cfg-add-row">
        <LayerIcon icon={icon || DEFAULT_CUSTOM_ICON} className="cfg-layer-icon" />
        <input
          className="cfg-icon-url-input cfg-add-icon-url"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="ikon-URL"
          title="icons8.com URL eller emoji"
        />
        <input
          className="cfg-add-name"
          placeholder="Navn på lag"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="cfg-field" style={{ marginBottom: "0.6rem" }}>
        <label className="cfg-field-label">Geometritype</label>
        <select value={geomType} onChange={(e) => setGeomType(e.target.value)}>
          <option value="esriGeometryPoint">Punkt</option>
          <option value="esriGeometryPolyline">Linje</option>
          <option value="esriGeometryPolygon">Polygon</option>
        </select>
      </div>

      <div className="cfg-field" style={{ marginBottom: "0.6rem" }}>
        <label className="cfg-field-label">Typefelt (valgfritt)</label>
        <input
          type="text"
          placeholder="F.eks. BelysningType"
          value={typeField}
          onChange={(e) => setTypeField(e.target.value.replace(/\s+/g, ""))}
        />
        <span className="cfg-field-note">Brukes til å klassifisere objekter med undertyper</span>
      </div>

      {typeField.trim() && (
        <div style={{ marginBottom: "0.6rem" }}>
          <p className="cfg-domain-header" style={{ marginBottom: "0.35rem" }}>Typeverdier</p>
          {values.map((v) => (
            <div key={v.code} className="cfg-domain-row cfg-domain-row-custom">
              <span className="cfg-domain-code" style={{ minWidth: 60 }}>{v.code}</span>
              <span style={{ flex: 1, fontSize: "0.8rem" }}>{v.name}</span>
              <button type="button" className="cfg-domain-del" onClick={() => removeValue(v.code)}>✕</button>
            </div>
          ))}
          <div className="cfg-domain-add">
            <input
              className="cfg-domain-add-code"
              value={valCode}
              onChange={(e) => setValCode(e.target.value.toUpperCase())}
              placeholder="KODE"
              maxLength={30}
            />
            <input
              className="cfg-domain-add-name"
              value={valName}
              onChange={(e) => setValName(e.target.value)}
              placeholder="Navn"
            />
            <button type="button" className="cfg-domain-add-btn" onClick={addValue} disabled={!valCode.trim() || !valName.trim()}>
              +
            </button>
          </div>
        </div>
      )}

      <div className="cfg-add-layer-actions">
        <button type="button" className="cfg-save-btn" onClick={handleAdd} disabled={!name.trim()}>
          Legg til lag
        </button>
        <button type="button" className="cfg-btn-ghost" onClick={() => setOpen(false)}>Avbryt</button>
      </div>
    </div>
  );
}

// ── DataModelGraph ────────────────────────────────────────────────────────────

function DataModelGraph({ layers }) {
  const [expandedId, setExpandedId] = useState(null);

  const SVG_W   = 700, SVG_H = 500;
  const cx      = 350, cy    = 250;
  const ORBIT_R = 135;
  const NODE_R  = 21;
  const CTR_R   = 29;
  const LBL_OFF = 38;
  const SUB_D   = 68; // distance from parent center to sub-node center
  const SUB_R   = 9;
  const SUB_LBL = 23;
  const ASTEP   = 20; // degrees between sub-nodes

  const COLORS = {
    esriGeometryPolygon:  "#4ade80",
    esriGeometryPolyline: "#fb923c",
    esriGeometryPoint:    "#38bdf8",
  };

  const nodes = LAYER_DEFINITIONS.map((def, i) => {
    const deg = (360 / 8) * i - 90;
    const rad = (deg * Math.PI) / 180;
    const nx  = cx + ORBIT_R * Math.cos(rad);
    const ny  = cy + ORBIT_R * Math.sin(rad);
    const dx  = Math.cos(rad);
    const dy  = Math.sin(rad);
    return {
      id:          def.id,
      nx:          Math.round(nx),
      ny:          Math.round(ny),
      lx:          Math.round(nx + dx * LBL_OFF),
      ly:          Math.round(ny + dy * LBL_OFF),
      anchor:      dx > 0.35 ? "start" : dx < -0.35 ? "end" : "middle",
      baseline:    dy > 0.35 ? "hanging" : dy < -0.35 ? "auto" : "middle",
      color:       COLORS[def.geometryType] ?? "#c8f0ae",
      displayName: layers?.[def.id]?.displayName ?? String(def.id),
      deg,
    };
  });

  function getEnabledSubtypes(layerId) {
    const def = LAYER_DEFINITIONS.find((d) => d.id === layerId);
    if (!def) return [];
    const tfn     = getTypeFieldName(def);
    if (!tfn) return [];
    const cfg     = layers?.[layerId];
    const builtin = getBuiltinDomain(def, tfn);
    const custom  = cfg?.customDomainValues ?? [];
    const enabled = cfg?.enabledSubtypes ?? builtin.map((cv) => cv.code);
    const renames = cfg?.domainRenames ?? {};
    return [
      ...builtin.map((cv) => ({ code: cv.code, name: renames[cv.code] ?? cv.name })),
      ...custom.map((cv)  => ({ code: cv.code, name: cv.name, isCustom: true })),
    ].filter((v) => enabled.includes(v.code));
  }

  function handleNodeClick(node) {
    if (getEnabledSubtypes(node.id).length === 0) return;
    setExpandedId((prev) => (prev === node.id ? null : node.id));
  }

  const expandedNode = expandedId !== null ? nodes.find((n) => n.id === expandedId) : null;
  const subtypes     = expandedNode ? getEnabledSubtypes(expandedId) : [];

  const subNodes = (() => {
    if (!expandedNode || subtypes.length === 0) return [];
    const N      = subtypes.length;
    const spread = (N - 1) * ASTEP;
    return subtypes.map((st, k) => {
      const offset = N > 1 ? -spread / 2 + k * ASTEP : 0;
      const subDeg = expandedNode.deg + offset;
      const subRad = (subDeg * Math.PI) / 180;
      const sx     = Math.round(expandedNode.nx + SUB_D * Math.cos(subRad));
      const sy     = Math.round(expandedNode.ny + SUB_D * Math.sin(subRad));
      const ldx    = Math.cos(subRad);
      const ldy    = Math.sin(subRad);
      return {
        code:     st.code,
        name:     st.name,
        isCustom: !!st.isCustom,
        sx, sy,
        lx:       Math.round(sx + ldx * SUB_LBL),
        ly:       Math.round(sy + ldy * SUB_LBL),
        anchor:   ldx > 0.35 ? "start" : ldx < -0.35 ? "end" : "middle",
        baseline: ldy > 0.35 ? "hanging" : ldy < -0.35 ? "auto" : "middle",
      };
    });
  })();

  return (
    <div className="cfg-graph">
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%"
        style={{ display: "block" }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="cfg-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="cfg-glow-sm" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="cfg-bg-grad" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#1e3d1a" />
            <stop offset="100%" stopColor="#0d1a0c" />
          </radialGradient>
        </defs>

        <rect width={SVG_W} height={SVG_H} fill="url(#cfg-bg-grad)" />
        <circle cx={cx} cy={cy} r={ORBIT_R} fill="none"
          stroke="rgba(200,240,174,0.06)" strokeWidth="1" />

        {/* ── Main edges ── */}
        {nodes.map((n) => (
          <path key={`e${n.id}`}
            d={`M ${cx},${cy} L ${n.nx},${n.ny}`}
            stroke={n.color} strokeWidth="1.5" strokeDasharray="5,7" fill="none"
            opacity={expandedId !== null && expandedId !== n.id ? 0.10 : 0.4}
            style={{
              animation: `cfg-dash ${2.0 + n.id * 0.28}s linear infinite`,
              transition: "opacity 0.3s",
            }}
          />
        ))}

        {/* ── Moving dots on main edges ── */}
        {nodes.map((n) => (
          <circle key={`d${n.id}`} r="3" fill={n.color} filter="url(#cfg-glow)"
            style={{
              opacity: expandedId !== null && expandedId !== n.id ? 0 : 1,
              transition: "opacity 0.3s",
            }}>
            <animateMotion dur={`${1.8 + n.id * 0.22}s`} repeatCount="indefinite"
              path={`M ${cx},${cy} L ${n.nx},${n.ny}`} />
          </circle>
        ))}

        {/* ── Sub-node edges ── */}
        {subNodes.map((sn) => (
          <line key={`se${sn.code}`}
            x1={expandedNode.nx} y1={expandedNode.ny}
            x2={sn.sx} y2={sn.sy}
            stroke={expandedNode.color} strokeWidth="1"
            strokeDasharray="3,4" opacity="0.5" />
        ))}

        {/* ── Sub-nodes ── */}
        {subNodes.map((sn) => (
          <g key={`sn${sn.code}`}>
            <circle cx={sn.sx} cy={sn.sy} r={SUB_R + 5} fill="none"
              stroke={expandedNode.color} strokeWidth="1" opacity="0.10" />
            <circle cx={sn.sx} cy={sn.sy} r={SUB_R}
              fill={expandedNode.color + "1a"} stroke={expandedNode.color}
              strokeWidth={sn.isCustom ? "1" : "1.5"}
              strokeDasharray={sn.isCustom ? "2,2" : undefined}
              filter="url(#cfg-glow-sm)" />
            <text x={sn.lx} y={sn.ly}
              textAnchor={sn.anchor} dominantBaseline={sn.baseline}
              fill={sn.isCustom ? expandedNode.color : "#9abf88"}
              fontSize="8" fontWeight={sn.isCustom ? "700" : "400"}
              fontFamily="Inter,sans-serif">{sn.name}</text>
          </g>
        ))}

        {/* ── Layer nodes ── */}
        {nodes.map((n) => {
          const nSubs      = getEnabledSubtypes(n.id);
          const isExpanded = expandedId === n.id;
          const hasTypes   = nSubs.length > 0;
          const dimmed     = expandedId !== null && !isExpanded;
          return (
            <g key={`n${n.id}`}
              style={{ cursor: hasTypes ? "pointer" : "default" }}
              onClick={() => handleNodeClick(n)}>
              <circle cx={n.nx} cy={n.ny} r={NODE_R + 6} fill="none"
                stroke={n.color}
                strokeWidth={isExpanded ? "1.5" : "1"}
                opacity={dimmed ? 0.04 : isExpanded ? 0.35 : 0.12} />
              <circle cx={n.nx} cy={n.ny} r={NODE_R}
                fill={n.color + (isExpanded ? "44" : "22")}
                stroke={n.color} strokeWidth={isExpanded ? "2" : "1.5"}
                filter="url(#cfg-glow)"
                opacity={dimmed ? 0.25 : 1} />
              <text x={n.nx} y={n.ny} textAnchor="middle" dominantBaseline="middle"
                fill={n.color} fontSize="11" fontWeight="700"
                fontFamily="'SF Mono','Fira Code',monospace"
                opacity={dimmed ? 0.25 : 1}>{n.id}</text>
              {/* Subtype count badge */}
              {hasTypes && !dimmed && (
                <g>
                  <circle cx={n.nx + NODE_R - 3} cy={n.ny - NODE_R + 3} r="7.5"
                    fill={isExpanded ? n.color : "#0d1a0c"}
                    stroke={n.color} strokeWidth="1" />
                  <text x={n.nx + NODE_R - 3} y={n.ny - NODE_R + 3}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={isExpanded ? "#0d1a0c" : n.color}
                    fontSize="7" fontWeight="700"
                    fontFamily="'SF Mono',monospace">{nSubs.length}</text>
                </g>
              )}
              <text x={n.lx} y={n.ly}
                textAnchor={n.anchor} dominantBaseline={n.baseline}
                fill={dimmed ? "#3a5830" : "#9abf88"}
                fontSize="9" fontWeight="500" fontFamily="Inter,sans-serif"
                opacity={dimmed ? 0.4 : 1}>{n.displayName}</text>
            </g>
          );
        })}

        {/* ── Center node ── */}
        <circle cx={cx} cy={cy} r={CTR_R + 7} fill="none" stroke="#c8f0ae"
          strokeWidth="1" opacity="0.12" />
        <circle cx={cx} cy={cy} r={CTR_R} fill="#0f2210" stroke="#c8f0ae"
          strokeWidth="2" filter="url(#cfg-glow)" />
        <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle"
          fill="#c8f0ae" fontSize="9" fontWeight="800"
          fontFamily="Inter,sans-serif" letterSpacing="0.12em">LARK</text>
        <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle"
          fill="#4a7040" fontSize="7.5" fontFamily="Inter,sans-serif"
          letterSpacing="0.04em">Feature Service</text>
      </svg>

      <div className="cfg-graph-legend">
        <span className="cfg-graph-legend-item" style={{ color: "#4ade80" }}>▣ Polygon</span>
        <span className="cfg-graph-legend-item" style={{ color: "#fb923c" }}>╱ Linje</span>
        <span className="cfg-graph-legend-item" style={{ color: "#38bdf8" }}>● Punkt</span>
        <span className="cfg-graph-legend-hint">Klikk et lag for å se undertyper</span>
      </div>
    </div>
  );
}

// ── Main ConfigPage ───────────────────────────────────────────────────────────

export default function ConfigPage({ config, onSave, onBack }) {
  const [appName,     setAppName]     = useState(config.appName);
  const [projectName, setProjectName] = useState(config.projectName);
  const [coordSystem, setCoordSystem] = useState(config.coordSystem);
  const [layerOrder,  setLayerOrder]  = useState(config.layerOrder);
  const [layers,      setLayers]      = useState(config.layers);

  const [savedGeneral, setSavedGeneral] = useState(false);
  const [savedModel,   setSavedModel]   = useState(false);
  const [dragIdx,      setDragIdx]      = useState(null);
  const [dragOverIdx,  setDragOverIdx]  = useState(null);

  const [activeSection, setActiveSection] = useState("general");

  function flash(which) {
    if (which === "general") {
      setSavedGeneral(true);
      setTimeout(() => setSavedGeneral(false), 2500);
    } else {
      setSavedModel(true);
      setTimeout(() => setSavedModel(false), 2500);
    }
  }

  function currentConfig() {
    return { appName, projectName, coordSystem, layerOrder, layers };
  }

  function handleSaveGeneral() {
    const cfg = currentConfig();
    saveConfig(cfg); onSave(cfg); flash("general");
  }

  function handleSaveModel() {
    const cfg = currentConfig();
    saveConfig(cfg); onSave(cfg); flash("model");
  }

  function updateLayer(id, newCfg) {
    setLayers((prev) => ({ ...prev, [id]: newCfg }));
  }

  function handleDragStart(idx) {
    setDragIdx(idx);
  }

  function handleDragEnter(e, idx) {
    e.preventDefault();
    if (dragIdx !== null && idx !== dragIdx) setDragOverIdx(idx);
  }

  function handleDragOver(e) {
    e.preventDefault(); // required to allow drop
  }

  function handleDrop(idx) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    setLayerOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    setDragIdx(null);
    setDragOverIdx(null);
  }

  function deleteCustomLayer(clientId) {
    setLayerOrder((prev) => prev.filter((id) => id !== clientId));
    setLayers((prev) => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
  }

  function addCustomLayer({ clientId, ...layerData }) {
    setLayers((prev) => ({ ...prev, [clientId]: layerData[clientId] }));
    setLayerOrder((prev) => [...prev, clientId]);
  }

  return (
    <div className="cfg-page">
      {/* Topbar */}
      <div className="top-bar">
        <div className="top-bar-left">
          {LeafSVG}
          <span className="app-logo">{appName || "LARK"}</span>
          <div className="top-bar-sep" />
          <span className="app-subtitle">Innstillinger</span>
        </div>
        <div className="top-bar-right">
          <button className="top-bar-btn" onClick={onBack}>← Tilbake til kart</button>
        </div>
      </div>

      {/* Layout */}
      <div className="cfg-layout">

        {/* Left nav */}
        <nav className="cfg-sidebar">
          <div className="cfg-sidebar-label">Innstillinger</div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={"cfg-nav-item" + (activeSection === item.id ? " active" : "") + (item.future ? " future" : "")}
              onClick={() => !item.future && setActiveSection(item.id)}
            >
              <span className="cfg-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="cfg-content-area">

          {/* ── Generelt ── */}
          {activeSection === "general" && (
            <>
              <div className="cfg-section-header">
                <h1>Generelle innstillinger</h1>
                <p>Grunnleggende konfigurasjon for applikasjon og prosjekt.</p>
              </div>

              <div className="cfg-card">
                <h3 className="cfg-card-title">Applikasjon</h3>
                <div className="cfg-grid-2">
                  <div className="cfg-field">
                    <label className="cfg-field-label">Applikasjonsnavn</label>
                    <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} />
                  </div>
                  <div className="cfg-field">
                    <label className="cfg-field-label">Prosjektnavn</label>
                    <input type="text" value={projectName} placeholder="F.eks. Bjørneparken 2026" onChange={(e) => setProjectName(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="cfg-card">
                <h3 className="cfg-card-title">Koordinatsystem</h3>
                <div className="cfg-field">
                  <select value={coordSystem} onChange={(e) => setCoordSystem(e.target.value)}>
                    {COORD_SYSTEMS.map((cs) => (
                      <option key={cs.id} value={cs.id}>{cs.label}</option>
                    ))}
                  </select>
                  <span className="cfg-field-note">Brukes til visning av koordinater og målinger</span>
                </div>
              </div>

              <div className="cfg-save-area">
                <button className="cfg-save-btn" onClick={handleSaveGeneral}>Lagre</button>
                {savedGeneral && <span className="cfg-saved">✓ Lagret</span>}
              </div>
            </>
          )}

          {/* ── Datamodell ── */}
          {activeSection === "datamodel" && (
            <>
              <div className="cfg-section-header">
                <h1>Datamodell</h1>
                <p>Aktiver/deaktiver lag, endre navn og ikon, og rediger domeneverdier. Dra i håndtaket (⠿) for å endre rekkefølgen.</p>
              </div>

              <div className="cfg-card cfg-card-wide">
                <DataModelGraph layers={layers} />
                <div className="cfg-layers">
                  {layerOrder.map((id, idx) => {
                    const isCustom = isCustomLayerId(id);
                    const layerCfg = layers[id];
                    if (!layerCfg) return null;
                    return (
                      <LayerRow
                        key={String(id)}
                        layerId={id}
                        layerCfg={layerCfg}
                        isCustom={isCustom}
                        onUpdate={(cfg) => updateLayer(id, cfg)}
                        onDelete={() => deleteCustomLayer(id)}
                        dragging={dragIdx === idx}
                        dragOver={dragOverIdx === idx && dragIdx !== idx}
                        onDragStart={() => handleDragStart(idx)}
                        onDragEnter={(e) => handleDragEnter(e, idx)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(idx)}
                        onDragEnd={handleDragEnd}
                      />
                    );
                  })}
                </div>
                <AddCustomLayerForm onAdd={addCustomLayer} />
                {layerOrder.some((id) => isCustomLayerId(id) && layers[id]?.agolLayerId == null) && (
                  <p className="cfg-provision-note">
                    ⚠ Nye tilpassede lag klargjøres automatisk neste gang du åpner kartet.
                  </p>
                )}
              </div>

              <div className="cfg-save-area">
                <button className="cfg-save-btn" onClick={handleSaveModel}>Lagre datamodell</button>
                {savedModel && <span className="cfg-saved">✓ Lagret</span>}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
