import React, { useState, useMemo, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "react-query";
import {
  Spin,
  Tabs,
  Typography,
  Space,
  Input,
  Select,
  Button,
  Collapse,
  Table,
  Tag,
  Avatar,
  Tooltip,
  DatePicker,
  Modal,
  Form,
  message,
  Segmented,
} from "antd";
import { MinusSquareOutlined, PlusSquareOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../services/api";
import { ViewMode } from "gantt-task-react";
import {
  TableOutlined,
  ProjectOutlined,
  BarChartOutlined,
  CalendarOutlined,
  OrderedListOutlined,
  UserOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import Highlighter from "react-highlight-words";
import { SearchOutlined } from "@ant-design/icons";
import GanttView from "../components/GanttView.jsx";
import ChartView from "../components/ChartView.jsx";
import CalendarView from "../components/CalendarView.jsx";
import KanbanView from "../components/KanbanView.jsx";
import RecursosView from "../components/RecursosView.jsx";
import FinancieroView from "../components/FinancieroView.jsx";
import "react-quill/dist/quill.snow.css";

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

const prioridadMeta = {
  Baja: "#90BC1F",
  Media: "#EE8D00",
  Alta: "#662480",
  Crítica: "#000",
};

export default function ProyectoDetalle() {
  const { id } = useParams();

  const [filtro, setFiltro] = useState({
    texto: "",
    persona: null,
    estado: null,
  });
  const [nueva, setNueva] = useState({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm] = Form.useForm();
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);
  const [filtroVencimiento, setFiltroVencimiento] = useState(null);

  const [seleccionadas, setSeleccionadas] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const [mensajeRecordatorio, setMensajeRecordatorio] = useState("");
  const [modalRecordatorioVisible, setModalRecordatorioVisible] =
    useState(false);

  const userSGP = JSON.parse(localStorage.getItem("userSGP")) || {};
  const idRol = Number(userSGP.idRol || userSGP.RolID);
  const idUsuario = Number(userSGP.idUsuario || userSGP.UsuarioID);

  const [modalComentariosVisible, setModalComentariosVisible] = useState(false);
  const [comentarioTareaSeleccionada, setComentarioTareaSeleccionada] =
    useState(null);
  const [nuevoComentario, setNuevoComentario] = useState("");

  const [destinatariosSeleccionados, setDestinatariosSeleccionados] = useState(
    []
  );

  const permisosSGP = JSON.parse(localStorage.getItem("permisosSGP")) || [];
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [tableSize, setTableSize] = useState("middle");

  let permisosProyecto = {};
  if (Array.isArray(permisosSGP)) {
    permisosProyecto =
      permisosSGP.find((p) => p.Modulo === "ProyectoDetalle.jsx") || {};
  } else {
    console.warn("permisosSGP no es un array:", permisosSGP);
  }

  const puedeCrear = permisosProyecto.Crear;
  const puedeEditar = permisosProyecto.Editar;
  const puedeEliminar = permisosProyecto.Eliminar;

  const { data: proyecto, isLoading: lp } = useQuery(["proyecto", id], () =>
    api.get(`/proyectos/${id}`).then((r) => r.data)
  );

  const {
    data: tareas = [],
    isLoading: lt,
    refetch,
  } = useQuery(["tareas", id], () =>
    api.get("/tareas/").then((r) => r.data.filter((t) => t.ProyectoID === +id))
  );

  const { data: tareasPorOrden = [] } = useQuery(["tareas-orden", id], () =>
    api
      .get(`/tareas/por-orden/${id}`)
      .then((r) =>
        r.data && Array.isArray(r.data.tareas) ? r.data.tareas : []
      )
  );

  const { data: usuarios = [] } = useQuery("usuarios", () =>
    api.get("/usuarios/").then((r) => r.data)
  );
  const { data: roles = [] } = useQuery("roles", () =>
    api.get("/roles/").then((r) => r.data)
  );

  const { data: estadosTarea = [] } = useQuery("estados-tarea", () =>
    api.get("/estados-tarea/").then((r) => r.data)
  );

  const miRolID = userSGP.RolID;
  const nivelJerarquico = useMemo(
    () => calcularNivelRol(roles, miRolID),
    [roles, miRolID]
  );

  const responsable = usuarios.find(
    (u) => u.UsuarioID === proyecto?.UsuarioResponsableID
  );
  const rolResponsableID = responsable ? responsable.RolID : null;
  const nivelResponsable = useMemo(
    () => (rolResponsableID ? calcularNivelRol(roles, rolResponsableID) : 0),
    [roles, rolResponsableID]
  );

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Buscar ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Buscar
          </Button>
          <Button
            onClick={() => clearFilters()}
            size="small"
            style={{ width: 90 }}
          >
            Limpiar
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        ? record[dataIndex]
            .toString()
            .toLowerCase()
            .includes(value.toLowerCase())
        : "",
    onFilterDropdownVisibleChange: (visible) => {
      if (visible) setTimeout(() => searchInput.current?.select(), 100);
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ""}
        />
      ) : (
        text
      ),
  });

  const estadosMeta = useMemo(() => {
    const map = {};
    if (Array.isArray(estadosTarea)) {
      estadosTarea.forEach((e) => {
        map[e.estadoFront] = {
          label: e.etiqueta || e.estadoFront,
          color: e.colorHex || "gray",
        };
      });
    }
    return map;
  }, [estadosTarea]);

  const ordenEstados = useMemo(
    () =>
      Array.isArray(estadosTarea) ? estadosTarea.map((e) => e.estadoFront) : [],
    [estadosTarea]
  );

  const opcionesPadre = useMemo(
    () =>
      (tareasPorOrden || []).map((t) => ({
        value: t.TareaID,
        label: t.Titulo,
      })),
    [tareasPorOrden]
  );

  const normalizeComentarios = (c) => {
    if (Array.isArray(c)) return JSON.stringify(c);
    if (typeof c === "string") return c;
    return null;
  };

  const crearM = useMutation((datos) => api.post("/tareas/", datos), {
    onSuccess: () => {
      refetch();
      message.success("Tarea creada");
    },
  });

  const editarM = useMutation(
    (datos) => api.put(`/tareas/${datos.tarea_id}`, datos),
    {
      onSuccess: () => {
        refetch();
        message.success("Tarea actualizada");
      },
    }
  );

  const borrarM = useMutation((idT) => api.delete(`/tareas/${idT}`), {
    onSuccess: () => {
      refetch();
      message.success("Tarea eliminada");
    },
  });

  const handleCreate = useCallback(() => {
    const d = (nueva && nueva.__new) || {};
    if (!d.Titulo || !d.FechaInicio || !d.FechaLimite) {
      message.error("Título, Inicio y Fin son obligatorios");
      return;
    }
    crearM.mutate({
      proyecto_id: +id,
      titulo: d.Titulo,
      descripcion: "",
      estado: filtro.estado || "pendiente",
      usuario_asignados: d.usuario_asignados || [],
      fecha_inicio: dayjs(d.FechaInicio).format("YYYY-MM-DD"),
      fecha_limite: dayjs(d.FechaLimite).format("YYYY-MM-DD"),
      porcentaje_avance: 0,
      prioridad: { Baja: 1, Media: 2, Alta: 3, Crítica: 4 }[d.prioridad] || 2,
      comentarios: editingTask?.comentarios ?? "", // mantener tal cual
      id_tarea_padre: d.tarea_padre || null,
    });
    setNueva({});
  }, [nueva, id, filtro.estado, crearM]);

  const { data: rolesData = [] } = { data: roles };
  const nivelJerarquicoLocal = useMemo(
    () => calcularNivelRol(rolesData, userSGP.RolID),
    [rolesData, userSGP.RolID]
  );

  const tareasFiltradas = useMemo(() => {
    if (proyecto?.UsuarioResponsableID === idUsuario) return tareas;
    if (nivelJerarquicoLocal <= nivelResponsable) return tareas;
    return tareas.filter(
      (t) =>
        Array.isArray(t.usuario_asignados) &&
        t.usuario_asignados.includes(idUsuario)
    );
  }, [idUsuario, tareas, proyecto, nivelJerarquicoLocal, nivelResponsable]);

  const participantesProyecto = useMemo(
    () =>
      usuarios.filter((u) =>
        tareasFiltradas.some((t) =>
          (t.usuario_asignados || []).includes(u.UsuarioID)
        )
      ),
    [usuarios, tareasFiltradas]
  );

  const lookupName = (uid) => {
    const u = usuarios.find((x) => x.UsuarioID === uid);
    return u ? u.NombreCompleto : "";
  };

  const usuariosDisponibles = useMemo(() => {
    const ids = [
      ...new Set(seleccionadas.flatMap((t) => t.usuario_asignados || [])),
    ];
    return ids.map((id) => ({ id, nombre: lookupName(id) }));
  }, [seleccionadas]);

  const datosFiltrados = useMemo(
    () =>
      tareasFiltradas
        .filter(
          (t) =>
            !filtro.texto ||
            t.Titulo.toLowerCase().includes(filtro.texto.toLowerCase())
        )
        .filter(
          (t) =>
            !filtro.persona ||
            (t.usuario_asignados || []).includes(filtro.persona)
        )
        .filter((t) => !filtro.estado || t.Estado === filtro.estado),
    [tareasFiltradas, filtro]
  );

  if (lp || lt) return <Spin style={{ margin: 50 }} />;
  if (!proyecto) return <Text type="danger">Proyecto no encontrado.</Text>;

  const filtrarTareas = (tipo) => {
    const hoy = dayjs(new Date());
    const inicioSemana = hoy.startOf("week");
    const finSemana = hoy.endOf("week");
    const proxInicio = inicioSemana.add(1, "week");
    const proxFin = proxInicio.endOf("week");
    const inicioMes = hoy.startOf("month");
    const finMes = hoy.endOf("month");

    return tareasFiltradas.filter((t) => {
      if (!t.FechaLimite) return false;
      const limite = dayjs(t.FechaLimite);
      switch (tipo) {
        case "vencidas":
          return limite.isBefore(hoy, "day");
        case "hoy":
          return limite.isSame(hoy, "day");
        case "semana":
          return limite.isBetween(inicioSemana, finSemana, "day", "[]");
        case "proxima":
          return limite.isBetween(proxInicio, proxFin, "day", "[]");
        case "mes":
          return limite.isBetween(inicioMes, finMes, "day", "[]");
        default:
          return true;
      }
    });
  };

  const tareasParaGantt = filtroVencimiento
    ? filtrarTareas(filtroVencimiento)
    : tareasFiltradas;

  function parseComentarios(raw) {
    if (raw == null || raw === "") return [];

    // 1) Intento JSON (array u objeto)
    try {
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(data)) {
        return data
          .map((c) => ({
            nombre: c.nombre || c.usuario || c.user || "Comentario",
            fecha: c.fecha || c.fechaCreacion || c.created_at || "",
            texto: c.texto || c.mensaje || c.body || c.content || "",
          }))
          .sort((a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf());
      }
    } catch (_) {}

    // 2) Formato "[nombre;fecha;texto]" repetido
    const str = String(raw);
    const matches = str.match(/\[[^\]]+\]/g);
    if (!matches) return [];
    const arr = matches.map((com) => {
      const p = com.slice(1, -1).split(";");
      return {
        nombre: (p[0] || "Sin nombre").trim(),
        fecha: (p[1] || "").trim(),
        texto: p.slice(2).join(";").trim(),
      };
    });

    return arr.sort(
      (a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf()
    );
  }

  // --------- ÁRBOL desde SP, con "nivel" ----------
  const buildTreeFromOrden = (lista) => {
    const nodes = new Map();
    const roots = [];

    lista.forEach((t) => {
      const partesRuta = String(t.Ruta || "")
        .split(">")
        .filter(Boolean);
      const nivel = Math.max(0, partesRuta.length - 1);
      nodes.set(t.TareaID, { ...t, nivel, children: [] });
    });

    lista.forEach((t) => {
      const partes = String(t.Ruta || "")
        .split(">")
        .filter(Boolean);
      if (partes.length <= 1) {
        roots.push(nodes.get(t.TareaID));
      } else {
        const idPadre = parseInt(partes[partes.length - 2], 10);
        const padre = nodes.get(idPadre);
        const hijo = nodes.get(t.TareaID);
        if (padre) padre.children.push(hijo);
        else roots.push(hijo);
      }
    });

    return roots;
  };

  const jerarquizarGrupo = (grupo) => {
    // Si no hay orden del SP, uso el grupo tal cual
    if (!Array.isArray(tareasPorOrden) || tareasPorOrden.length === 0)
      return grupo;

    // Mapa con los registros "completos" (incluye comentarios)
    const fullById = new Map(grupo.map((g) => [g.TareaID, g]));
    const idsGrupo = new Set(fullById.keys());

    // Lista que usaré para armar el árbol, pero
    // cada item trae los campos completos del grupo + los de orden
    const listaOrdenadaFiltrada = tareasPorOrden
      .filter((t) => idsGrupo.has(t.TareaID))
      .map((t) => ({ ...fullById.get(t.TareaID), ...t })); // <-- fusión

    return buildTreeFromOrden(listaOrdenadaFiltrada);
  };

  const toTime = (d) => (d ? dayjs(d).valueOf() : Number.NEGATIVE_INFINITY);

  // --------- Selección (checkbox) con cascada ----------
  const rowSel = {
    selectedRowKeys,
    checkStrictly: false,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSeleccionadas(rows);
    },
  };

  // --------- Columnas ----------
  const columns = [
    {
      title: "Tarea",
      dataIndex: "Titulo",
      className: "col-tarea",
      width: 360,
      ...getColumnSearchProps("Titulo"),
      render: (_, record) => {
        const nivel = record.nivel || 0;
        const isParent =
          Array.isArray(record.children) && record.children.length > 0;
        const isExpanded = expandedRowKeys.includes(record.TareaID);

        const toggle = (e) => {
          e.stopPropagation();
          setExpandedRowKeys((prev) =>
            isExpanded
              ? prev.filter((k) => k !== record.TareaID)
              : [...prev, record.TareaID]
          );
        };

        return (
          <Tooltip title={`${record.TareaID} - ${record.Titulo}`}>
            <div
              className={`tarea-cell ${isParent ? "is-parent" : "is-child"}`}
              style={{ paddingLeft: 8 + nivel * 18 }}
            >
              {isParent ? (
                <button
                  className="exp-btn"
                  onClick={toggle}
                  aria-label="expand"
                >
                  {isExpanded ? "−" : "+"}
                </button>
              ) : (
                <span className="exp-spacer" />
              )}
              <span className="tarea-id">{record.TareaID}</span>
              <span className="tarea-title">{record.Titulo}</span>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "Responsables",
      dataIndex: "usuario_asignados",
      width: 150,
      filters: participantesProyecto.map((u) => ({
        text: u.NombreCompleto,
        value: u.UsuarioID,
      })),
      onFilter: (value, record) =>
        (record.usuario_asignados || []).includes(value),
      render: (arr) =>
        arr && arr.length ? (
          <Avatar.Group maxCount={3} size="small">
            {arr.map((uid) => (
              <Tooltip key={uid} title={lookupName(uid)}>
                <Avatar size="small">
                  {lookupName(uid)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </Avatar>
              </Tooltip>
            ))}
          </Avatar.Group>
        ) : (
          <Text type="secondary">Sin asignar</Text>
        ),
    },
    {
      title: "Estado",
      dataIndex: "Estado",
      width: 120,
      filters: ordenEstados.map((e) => ({
        text: estadosMeta[e].label,
        value: e,
      })),
      onFilter: (val, row) => row.Estado === val,
      render: (e) => (
        <Tag color={estadosMeta[e].color}>{estadosMeta[e].label}</Tag>
      ),
    },
    {
      title: "Antecesora",
      dataIndex: "antecesora",
      width: 160,
      ...getColumnSearchProps("antecesora"),
      render: (id) => {
        const ant = tareas.find((t) => t.TareaID === id);
        return ant ? ant.Titulo : <Text type="secondary">—</Text>;
      },
    },
    {
      title: "Inicio",
      dataIndex: "FechaInicio",
      width: 130,
      render: (f) => (f ? dayjs(f).format("YYYY-MM-DD") : "—"),
      sorter: (a, b) => toTime(a.FechaInicio) - toTime(b.FechaInicio),
      sortDirections: ["descend", "ascend"],
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div style={{ padding: 8 }}>
          <DatePicker
            value={selectedKeys[0] ? dayjs(selectedKeys[0]) : null}
            onChange={(date) =>
              setSelectedKeys(date ? [date.format("YYYY-MM-DD")] : [])
            }
            style={{ marginBottom: 8, display: "block" }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              Buscar
            </Button>
            <Button
              onClick={() => {
                clearFilters();
                confirm({ closeDropdown: true });
              }}
              size="small"
              style={{ width: 90 }}
            >
              Limpiar
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered) => (
        <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
      ),
      onFilter: (value, record) => record.FechaInicio?.startsWith(value),
    },
    {
      title: "Vencimiento",
      dataIndex: "FechaLimite",
      width: 140,
      render: (f) => (f ? dayjs(f).format("YYYY-MM-DD") : "—"),
      sorter: (a, b) => toTime(a.FechaLimite) - toTime(b.FechaLimite),
      sortDirections: ["descend", "ascend"],
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div style={{ padding: 8 }}>
          <DatePicker
            value={selectedKeys[0] ? dayjs(selectedKeys[0]) : null}
            onChange={(date) =>
              setSelectedKeys(date ? [date.format("YYYY-MM-DD")] : [])
            }
            style={{ marginBottom: 8, display: "block" }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              Buscar
            </Button>
            <Button
              onClick={() => {
                clearFilters();
                confirm({ closeDropdown: true });
              }}
              size="small"
              style={{ width: 90 }}
            >
              Limpiar
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered) => (
        <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
      ),
      onFilter: (value, record) => record.FechaLimite?.startsWith(value),
    },
    {
      title: "Prioridad",
      dataIndex: "prioridad",
      width: 120,
      render: (p) => {
        const label =
          typeof p === "number"
            ? { 1: "Baja", 2: "Media", 3: "Alta", 4: "Crítica" }[p] || "—"
            : p || "—";
        return <Tag color={prioridadMeta[label]}>{label}</Tag>;
      },
    },
    {
      title: "Comentarios",
      dataIndex: "comentarios",
      width: 180,
      ...getColumnSearchProps("comentarios"),
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            setComentarioTareaSeleccionada(record);
            setModalComentariosVisible(true);
          }}
        >
          Ver ({parseComentarios(record?.comentarios).length})
        </Button>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 140,
      render: (_, rec) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditingTask(rec);
              editForm.setFieldsValue({
                Titulo: rec.Titulo,
                Estado: rec.Estado,
                PorcentajeAvance: rec.PorcentajeAvance,
                prioridad:
                  typeof rec.prioridad === "number"
                    ? { 1: "Baja", 2: "Media", 3: "Alta", 4: "Crítica" }[
                        rec.prioridad
                      ]
                    : rec.prioridad,
                FechaInicio: dayjs(rec.FechaInicio),
                FechaLimite: dayjs(rec.FechaLimite),
                usuario_asignados: rec.usuario_asignados,
                comentarios: parseComentarios(rec.comentarios)
                  .map(
                    (c) =>
                      `${c.nombre} (${dayjs(c.fecha).format(
                        "YYYY-MM-DD HH:mm"
                      )}): ${c.texto}`
                  )
                  .join("\n"),
                antecesora: rec.antecesora || null,
                tarea_padre: rec.IDTareaPadre ?? null,
              });
              setEditModalVisible(true);
            }}
          >
            Editar
          </Button>
          <Button
            danger
            size="small"
            onClick={() => borrarM.mutate(rec.TareaID)}
          >
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* estilos visuales */}
      <style>{`
        .tabla-tareas td.col-tarea .tarea-cell {
          border-radius: 8px;
          padding: 6px 10px;
          display: inline-flex;
          gap: 8px;
          align-items: center;
          max-width: 100%;
        }
        .tabla-tareas td.col-tarea .tarea-cell.is-parent {
          background: #EEF2F7;
          font-weight: 600;
          box-shadow: inset 3px 0 0 #cbd5e1;
        }
        .tabla-tareas td.col-tarea .tarea-cell.is-child {
          background: #F8FAFC;
          box-shadow: inset 2px 0 0 #e5e7eb;
        }
        .tabla-tareas .tarea-id { 
          color: #64748b; 
          font-variant-numeric: tabular-nums; 
          background:#e9eef5;
          border-radius: 10px;
          padding: 2px 8px;
        }
        .tabla-tareas .tarea-title {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        /* Botón +/− estilizado */
        .tabla-tareas .exp-btn {
          width: 18px; height: 18px; 
          line-height: 16px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 12px;
          cursor: pointer;
          transition: transform .06s ease, background .15s ease;
          user-select: none;
        }
        .tabla-tareas .exp-btn:hover { background:#f3f4f6; }
        .tabla-tareas .exp-btn:active { transform: scale(0.95); }
        .tabla-tareas .exp-spacer { display:inline-block; width:18px; height:18px; }
      `}</style>

      <Title level={2}>{proyecto.NombreProyecto}</Title>

      <Tabs defaultActiveKey="1" type="card" tabBarGutter={20}>
        <Tabs.TabPane
          tab={
            <span>
              <TableOutlined /> Tabla
            </span>
          }
          key="1"
        >
          <Collapse accordion>
            {ordenEstados.map((est) => {
              const grupo = datosFiltrados.filter((t) => t.Estado === est);
              if (!grupo.length) return null;

              const dataJerarquica = jerarquizarGrupo(grupo);

              return (
                <Panel
                  key={est}
                  header={
                    <Text strong style={{ color: estadosMeta[est].color }}>
                      {estadosMeta[est].label} ({grupo.length})
                    </Text>
                  }
                >
                  {seleccionadas.length > 0 && (
                    <Button
                      type="primary"
                      danger
                      style={{ marginBottom: 12 }}
                      onClick={() => setModalRecordatorioVisible(true)}
                    >
                      Enviar recordatorio ({seleccionadas.length} tareas)
                    </Button>
                  )}

                  <Space
                    style={{
                      marginBottom: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <Space>
                      <Button
                        onClick={() => {
                          const keys = [];
                          const walk = (nodes) =>
                            (nodes || []).forEach((n) => {
                              if (n.children?.length) keys.push(n.TareaID);
                              walk(n.children);
                            });
                          walk(dataJerarquica);
                          setExpandedRowKeys(keys);
                        }}
                      >
                        Expandir todo
                      </Button>
                      <Button onClick={() => setExpandedRowKeys([])}>
                        Contraer todo
                      </Button>
                    </Space>

                    <Segmented
                      value={tableSize}
                      onChange={(v) => setTableSize(v)}
                      options={[
                        { label: "Compacta", value: "small" },
                        { label: "Media", value: "middle" },
                        { label: "Amplia", value: "large" },
                      ]}
                    />
                  </Space>

                  <Table
                    dataSource={dataJerarquica}
                    columns={columns}
                    rowKey="TareaID"
                    size={tableSize}
                    className="tabla-tareas"
                    sticky={{ offsetHeader: 64 }}
                    expandedRowKeys={expandedRowKeys}
                    // Usamos nuestro propio toggler; ocultamos el ícono nativo
                    expandable={{
                      childrenColumnName: "children",
                      expandRowByClick: false,
                      rowExpandable: (r) =>
                        Array.isArray(r.children) && r.children.length > 0,
                      expandIcon: () => null,
                    }}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: ["10", "20", "50", "100"],
                    }}
                    scroll={{ x: 1200, y: 400 }}
                    rowSelection={rowSel}
                  />
                  {/* Creación rápida */}
                  <Space style={{ marginTop: 16 }} wrap>
                    <Input
                      placeholder="Título"
                      style={{ width: 160 }}
                      value={nueva.__new?.Titulo}
                      onChange={(e) =>
                        setNueva((n) => ({
                          ...n,
                          __new: { ...n.__new, Titulo: e.target.value },
                        }))
                      }
                    />
                    <DatePicker
                      placeholder="Inicio"
                      value={nueva.__new?.FechaInicio}
                      onChange={(d) =>
                        setNueva((n) => ({
                          ...n,
                          __new: { ...n.__new, FechaInicio: d },
                        }))
                      }
                    />
                    <DatePicker
                      placeholder="Fin"
                      value={nueva.__new?.FechaLimite}
                      onChange={(d) =>
                        setNueva((n) => ({
                          ...n,
                          __new: { ...n.__new, FechaLimite: d },
                        }))
                      }
                    />
                    <Select
                      placeholder="Prioridad"
                      style={{ width: 120 }}
                      value={nueva.__new?.prioridad}
                      onChange={(v) =>
                        setNueva((n) => ({
                          ...n,
                          __new: { ...n.__new, prioridad: v },
                        }))
                      }
                    >
                      {Object.keys(prioridadMeta).map((p) => (
                        <Option key={p} value={p}>
                          {p}
                        </Option>
                      ))}
                    </Select>
                    <Select
                      mode="multiple"
                      placeholder="Responsables"
                      style={{ width: 220 }}
                      value={nueva.__new?.usuario_asignados}
                      onChange={(arr) =>
                        setNueva((n) => ({
                          ...n,
                          __new: { ...n.__new, usuario_asignados: arr },
                        }))
                      }
                    >
                      {usuarios.map((u) => (
                        <Option key={u.UsuarioID} value={u.UsuarioID}>
                          {u.NombreCompleto}
                        </Option>
                      ))}
                    </Select>
                    <Select
                      allowClear
                      placeholder="Tarea padre (opcional)"
                      style={{ width: 260 }}
                      value={nueva.__new?.tarea_padre}
                      onChange={(v) =>
                        setNueva((n) => ({
                          ...n,
                          __new: { ...n.__new, tarea_padre: v || null },
                        }))
                      }
                      options={opcionesPadre}
                    />
                    <Button type="primary" onClick={handleCreate}>
                      Guardar
                    </Button>
                  </Space>
                </Panel>
              );
            })}
          </Collapse>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <ProjectOutlined /> Gantt
            </span>
          }
          key="2"
        >
          <Select
            placeholder="Filtrar por vencimiento"
            style={{ width: 240, marginBottom: 12 }}
            onChange={(val) => setFiltroVencimiento(val)}
            allowClear
          >
            <Select.Option value="vencidas">Vencidas</Select.Option>
            <Select.Option value="hoy">Se vencen hoy</Select.Option>
            <Select.Option value="semana">Esta semana</Select.Option>
            <Select.Option value="proxima">Próxima semana</Select.Option>
            <Select.Option value="mes">Este mes</Select.Option>
          </Select>
          <GanttView
            tasks={tareasParaGantt.map((t) => ({
              id: String(t.TareaID),
              name: `${t.Titulo} - ${t.PorcentajeAvance}%`,
              start: dayjs(t.FechaInicio).toDate(),
              end: dayjs(t.FechaLimite).toDate(),
              progress: t.PorcentajeAvance,
              type: "task",
              dependencies: t.antecesora ? [String(t.antecesora)] : [],
              responsables: (t.usuario_asignados || []).map(lookupName),
            }))}
            viewMode={ViewMode.Day}
          />
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <BarChartOutlined /> Gráfico
            </span>
          }
          key="3"
        >
          <ChartView tasks={tareasFiltradas} usuarios={usuarios} />
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <CalendarOutlined /> Calendario
            </span>
          }
          key="4"
        >
          <CalendarView
            events={tareasFiltradas.map((t) => ({
              id: t.TareaID,
              title: t.Titulo || "—",
              start: dayjs(t.FechaInicio).toDate(),
              end: dayjs(t.FechaFin).toDate(),
              descripcion: t.Descripcion || "—",
              estado: t.Estado || "—",
              usuarioAsignado:
                t.UsuarioAsignado ||
                (Array.isArray(t.usuario_asignados) &&
                t.usuario_asignados.length
                  ? lookupName(t.usuario_asignados[0])
                  : "—"),
              responsables: Array.isArray(t.usuario_asignados)
                ? t.usuario_asignados.slice(1).map(lookupName)
                : [],
              porcentajeAvance: Number(t.PorcentajeAvance) || 0,
              prioridad: t.prioridad || "—",
              comentarios: t.comentarios || "—",
            }))}
          />
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <OrderedListOutlined /> Kanban
            </span>
          }
          key="5"
        >
          <KanbanView tasks={tareasFiltradas} usuarios={usuarios} />
        </Tabs.TabPane>

        {[1, 2, 3].includes(idRol) && (
          <>
            <Tabs.TabPane
              tab={
                <span>
                  <UserOutlined /> Recursos
                </span>
              }
              key="6"
            >
              <RecursosView
                tareas={tareasFiltradas}
                usuarios={participantesProyecto}
              />
            </Tabs.TabPane>
            <Tabs.TabPane
              tab={
                <span>
                  <DollarOutlined /> Financiero
                </span>
              }
              key="7"
            >
              <FinancieroView
                tareas={tareasFiltradas}
                usuarios={participantesProyecto}
                roles={roles}
              />
            </Tabs.TabPane>
          </>
        )}
      </Tabs>

      {/* MODAL editar */}
      <Modal
        title="Editar Tarea"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={async () => {
          if (!nuevoComentario.trim()) return;
          const user = JSON.parse(localStorage.getItem("userSGP") || "{}");

          // Lista existente (de cualquier formato) → array normalizado
          const existentes = parseComentarios(
            comentarioTareaSeleccionada?.comentarios
          );

          // Nuevo comentario
          const nuevo = {
            nombre: user.Nombre || user.NombreCompleto || "Usuario",
            fecha: dayjs().format("YYYY-MM-DD HH:mm:ss"),
            texto: nuevoComentario.trim(),
          };

          // Agrego al final (quedará viejo→nuevo) y guardo como JSON
          const comentariosPayload = JSON.stringify([...existentes, nuevo]);

          const prioridadTextoANumero = {
            Baja: 1,
            Media: 2,
            Alta: 3,
            Crítica: 4,
          };

          await api.put(`/tareas/${comentarioTareaSeleccionada.TareaID}`, {
            tarea_id: comentarioTareaSeleccionada.TareaID,
            proyecto_id: comentarioTareaSeleccionada.ProyectoID,
            titulo: comentarioTareaSeleccionada.Titulo,
            descripcion: comentarioTareaSeleccionada.Descripcion || "",
            estado: comentarioTareaSeleccionada.Estado,
            porcentaje_avance: comentarioTareaSeleccionada.PorcentajeAvance,
            prioridad:
              prioridadTextoANumero[comentarioTareaSeleccionada.prioridad] || 2,
            fecha_inicio: comentarioTareaSeleccionada.FechaInicio,
            fecha_limite: comentarioTareaSeleccionada.FechaLimite,
            usuario_asignados:
              comentarioTareaSeleccionada.usuario_asignados || [],
            comentarios: comentariosPayload, // <-- YA NO concatenar strings
            antecesora: comentarioTareaSeleccionada.antecesora || null,
          });

          message.success("Comentario agregado");
          setNuevoComentario("");
          setModalComentariosVisible(false);
          refetch();
        }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="Titulo" label="Título" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="Estado" label="Estado" rules={[{ required: true }]}>
            <Select>
              {ordenEstados.map((e) => (
                <Option key={e} value={e}>
                  {estadosMeta[e].label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="PorcentajeAvance" label="Avance (%)">
            <Input type="number" min={0} max={100} />
          </Form.Item>
          <Form.Item name="prioridad" label="Prioridad">
            <Select>
              {Object.keys(prioridadMeta).map((p) => (
                <Option key={p} value={p}>
                  {p}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="FechaInicio"
            label="Fecha Inicio"
            rules={[{ required: true }]}
          >
            <DatePicker />
          </Form.Item>
          <Form.Item
            name="FechaLimite"
            label="Fecha Límite"
            rules={[{ required: true }]}
          >
            <DatePicker />
          </Form.Item>
          <Form.Item name="usuario_asignados" label="Responsables">
            <Select mode="multiple">
              {usuarios.map((u) => (
                <Option key={u.UsuarioID} value={u.UsuarioID}>
                  {u.NombreCompleto}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="antecesora" label="Antecesora">
            <Select allowClear placeholder="Seleccione antecesora">
              <Option value={null}>Sin antecesora</Option>
              {tareas
                .filter((t) => t.TareaID !== editingTask?.TareaID)
                .map((t) => (
                  <Option key={t.TareaID} value={t.TareaID}>
                    {t.Titulo}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="tarea_padre" label="Tarea padre">
            <Select allowClear placeholder="Selecciona tarea padre">
              {tareas
                .filter((t) => t.TareaID !== (editingTask?.TareaID ?? -1))
                .map((t) => (
                  <Option key={t.TareaID} value={t.TareaID}>
                    {t.Titulo}
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL recordatorio */}
      <Modal
        title="Enviar recordatorio"
        open={modalRecordatorioVisible}
        onCancel={() => setModalRecordatorioVisible(false)}
        onOk={async () => {
          if (!mensajeRecordatorio.trim()) {
            return message.warning("Escribe un mensaje para el recordatorio");
          }
          const usuariosSel = destinatariosSeleccionados
            .filter((v) => !v.includes("@"))
            .map((v) => parseInt(v));
          const con_copia = destinatariosSeleccionados.filter((v) =>
            v.includes("@")
          );
          try {
            await api.post("/notificaciones/recordatorio", {
              usuarios: usuariosSel,
              con_copia,
              mensaje: mensajeRecordatorio,
              tareas: seleccionadas.map((t) => ({
                id: t.TareaID,
                titulo: t.Titulo,
                asignados: t.usuario_asignados || [],
              })),
            });
            message.success("Recordatorio enviado");
            setModalRecordatorioVisible(false);
            setMensajeRecordatorio("");
            setSeleccionadas([]);
            setSelectedRowKeys([]);
            setDestinatariosSeleccionados([]);
          } catch (err) {
            console.error(err);
            message.error("Error al enviar el recordatorio");
          }
        }}
      >
        <p>Este mensaje se enviará a los siguientes destinatarios:</p>
        <Select
          mode="tags"
          style={{ width: "100%", marginBottom: 12 }}
          placeholder="Escribe correos o selecciona usuarios"
          value={destinatariosSeleccionados}
          onChange={setDestinatariosSeleccionados}
          options={usuariosDisponibles.map((u) => ({
            label: u.nombre,
            value: u.id.toString(),
          }))}
        />
        <Input.TextArea
          rows={4}
          value={mensajeRecordatorio}
          onChange={(e) => setMensajeRecordatorio(e.target.value)}
          placeholder="Escribe tu mensaje aquí..."
        />
      </Modal>

      {/* MODAL comentarios */}
      <Modal
        title={`Comentarios - ${comentarioTareaSeleccionada?.Titulo}`}
        open={modalComentariosVisible}
        width={700}
        style={{ height: "60vh" }}
        bodyStyle={{
          display: "flex",
          flexDirection: "column",
          height: "50vh",
          paddingBottom: 0,
        }}
        onCancel={() => setModalComentariosVisible(false)}
        onOk={async () => {
          if (!nuevoComentario.trim()) return;

          const user = JSON.parse(localStorage.getItem("userSGP") || "{}");
          const entrada = `[${
            user.Nombre || user.NombreCompleto || "Usuario"
          };${dayjs().format(
            "YYYY-MM-DD HH:mm:ss"
          )};${nuevoComentario.trim()}]`;

          // Base existente desde la tarea seleccionada
          let prev = (comentarioTareaSeleccionada?.comentarios || "").trim();

          // Tratar '[]' como vacío real
          if (prev === "[]") prev = "";

          // Si hay algo previo y no termina en coma, agrego coma separadora
          const necesitaComa = prev.length > 0 && !prev.endsWith(",");
          const comentariosPayload =
            (prev || "") + (necesitaComa ? "," : "") + entrada;

          await api.put(`/tareas/${comentarioTareaSeleccionada.TareaID}`, {
            tarea_id: comentarioTareaSeleccionada.TareaID,
            proyecto_id: comentarioTareaSeleccionada.ProyectoID,
            titulo: comentarioTareaSeleccionada.Titulo,
            descripcion: comentarioTareaSeleccionada.Descripcion || "",
            estado: comentarioTareaSeleccionada.Estado,
            porcentaje_avance: comentarioTareaSeleccionada.PorcentajeAvance,
            // ⚠️ No tocamos prioridad ni campos extraños aquí si no cambian
            prioridad:
              { Baja: 1, Media: 2, Alta: 3, Crítica: 4 }[
                comentarioTareaSeleccionada.prioridad
              ] || 2,
            fecha_inicio: comentarioTareaSeleccionada.FechaInicio,
            fecha_limite: comentarioTareaSeleccionada.FechaLimite,
            usuario_asignados:
              comentarioTareaSeleccionada.usuario_asignados || [],
            comentarios: comentariosPayload, // <-- APPEND en formato string
            antecesora: comentarioTareaSeleccionada.antecesora || null,
          });

          message.success("Comentario agregado");
          setNuevoComentario("");
          setModalComentariosVisible(false);
          refetch();
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 8,
            marginBottom: 10,
          }}
        >
          {parseComentarios(comentarioTareaSeleccionada?.comentarios).map(
            (c, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 8,
                  padding: 6,
                  borderRadius: 6,
                  background: "#f5f5f5",
                }}
              >
                <Text strong>{c.nombre}</Text>
                <Text type="secondary" style={{ float: "right" }}>
                  {dayjs(c.fecha).format("YYYY-MM-DD HH:mm")}
                </Text>
                <div
                  dangerouslySetInnerHTML={{ __html: c.texto }}
                  style={{ overflowX: "auto", maxWidth: "100%" }}
                />
              </div>
            )
          )}
        </div>
        <Input.TextArea
          rows={2}
          placeholder="Escribe un nuevo comentario..."
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
          style={{ marginTop: 4 }}
        />
      </Modal>
    </div>
  );
}

function calcularNivelRol(roles, rolId) {
  let nivel = 0;
  let actual = roles.find((r) => r.RolID === rolId);
  while (actual && actual.ParentRolID) {
    nivel += 1;
    actual = roles.find((r) => r.RolID === actual.ParentRolID);
  }
  return nivel;
}

function valsPorcentaje(v) {
  const n = Number(v);
  if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
  return 0;
}
