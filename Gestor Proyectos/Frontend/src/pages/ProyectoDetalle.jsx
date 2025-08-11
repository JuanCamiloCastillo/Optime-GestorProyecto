import React, { useState, useMemo, useRef } from "react";
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
} from "antd";
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
import ReactDOM from "react-dom";
import GanttView from "../components/GanttView.jsx";
import ChartView from "../components/ChartView.jsx";
import CalendarView from "../components/CalendarView.jsx";
import KanbanView from "../components/KanbanView.jsx";
import RecursosView from "../components/RecursosView.jsx";
import FinancieroView from "../components/FinancieroView.jsx";
import ReactQuill from "react-quill";
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

  // Verificamos que sea un array antes de usar find
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

  const { data: tareasPorOrden = [], isLoading: lpTareas } = useQuery(
    ["tareas-orden", id],
    () =>
      api
        .get(`/tareas/por-orden/${id}`)
        .then((r) => r.data.filter((t) => t.ProyectoID === +id))
  );
  console.log("tareasPorOrden", tareasPorOrden);

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
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
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

  const tareasFiltradas = useMemo(() => {
  // Si el usuario es responsable del proyecto
  if (proyecto?.UsuarioResponsableID === idUsuario) return tareas;

  // Si su nivel es igual o MÁS jefe que el responsable (nivelJerarquico <= nivelResponsable), ve todo
  if (nivelJerarquico <= nivelResponsable) return tareas;

  // Si no, solo tareas asignadas a él
  return tareas.filter(
    (t) =>
      Array.isArray(t.usuario_asignados) &&
      t.usuario_asignados.includes(idUsuario)
  );
}, [idUsuario, tareas, proyecto, nivelJerarquico, nivelResponsable]);

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
    // Puedes ajustar esta lógica según cómo tengas tus usuarios cargados
    const ids = [
      ...new Set(seleccionadas.flatMap((t) => t.usuario_asignados || [])),
    ];
    return ids.map((id) => ({
      id,
      nombre: lookupName(id),
    }));
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
  }; // <- AQUÍ CIERRA BIEN LA FUNCIÓN

  // ✅ Y aquí ahora sí definimos las variables bien
  const tareasParaGantt = filtroVencimiento
    ? filtrarTareas(filtroVencimiento)
    : tareasFiltradas;
  const parseComentarios = (raw) => {
    if (!raw) return [];

    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      // fallback si no es JSON válido
    }

    // fallback legacy (corchetes o texto plano)
    return raw
      .match(/\[[^\]]+\]|[^[]+/g)
      .filter(Boolean)
      .map((com) => {
        if (com.startsWith("[")) {
          const contenido = com.slice(1, -1).split(";");
          return {
            nombre: contenido[0] || "Sin nombre",
            fecha: contenido[1] || "",
            texto: contenido.slice(2).join(";") || "",
          };
        } else {
          return {
            nombre: "Comentario",
            fecha: "",
            texto: com.trim(),
          };
        }
      });
  };

  const ganttTasks = tareasParaGantt
    .map((t) => ({
      id: String(t.TareaID),
      name: `${t.Titulo} - ${t.PorcentajeAvance}%`,
      start: dayjs(t.FechaInicio).toDate(),
      end: dayjs(t.FechaLimite).toDate(),
      progress: t.PorcentajeAvance,
      type: "task",
      dependencies: t.antecesora ? [String(t.antecesora)] : [],
      responsables: (t.usuario_asignados || []).map(lookupName),
    }))
    .sort((a, b) => a.start - b.start);

  const events = tareasFiltradas.map((t) => ({
    id: t.TareaID,
    title: t.Titulo || "—",
    start: dayjs(t.FechaInicio).toDate(),
    end: dayjs(t.FechaFin).toDate(),
    descripcion: t.Descripcion || "—",
    estado: t.Estado || "—",
    usuarioAsignado:
      t.UsuarioAsignado ||
      (Array.isArray(t.usuario_asignados) && t.usuario_asignados.length
        ? lookupName(t.usuario_asignados[0])
        : "—"),
    responsables: Array.isArray(t.usuario_asignados)
      ? t.usuario_asignados.slice(1).map(lookupName)
      : [],
    porcentajeAvance: Number(t.PorcentajeAvance) || 0,
    prioridad: t.prioridad || "—",
    comentarios: t.comentarios || "—",
  }));

  const construirJerarquia = (tareas) => {
    // Mapa de rutas y niveles desde tareasPorOrden
    const rutasPorId = {};
    tareasPorOrden.forEach((t) => {
      rutasPorId[t.TareaID] = {
        ruta: t.Ruta,
        nivel: t.Nivel,
      };
    });

    // 1. Crear todas las tareas en el mapa
    const tareasPorId = {};
    tareas.forEach((t) => {
      const rutaInfo = rutasPorId[t.TareaID] || { ruta: t.Titulo, nivel: 0 };
      tareasPorId[t.TareaID] = {
        ...t,
        children: [],
        nivel: rutaInfo.nivel,
        ruta: rutaInfo.ruta,
      };
    });

    // 2. Asignar hijos a sus padres
    const jerarquicas = [];
    tareas.forEach((t) => {
      if (t.IDTareaPadre && tareasPorId[t.IDTareaPadre]) {
        tareasPorId[t.IDTareaPadre].children.push(tareasPorId[t.TareaID]);
      } else if (!t.IDTareaPadre) {
        jerarquicas.push(tareasPorId[t.TareaID]);
      }
    });

    return jerarquicas;
  };
  const construirJerarquiaPorRuta = (tareas) => {
    // Mapa de todas las tareas por ID
    const tareasPorId = {};
    tareas.forEach((t) => {
      tareasPorId[t.TareaID] = { ...t, children: [] };
    });

    // Lista de raíces
    const raices = [];

    tareas.forEach((t) => {
      if (!t.Ruta) {
        // Si no hay ruta, lo tratamos como raíz
        raices.push(tareasPorId[t.TareaID]);
        return;
      }
      const partesRuta = String(t.Ruta).split(">");
      if (partesRuta.length === 1) {
        // Es raíz
        raices.push(tareasPorId[t.TareaID]);
      } else {
        // El padre es el penúltimo ID de la ruta
        const idPadre = parseInt(partesRuta[partesRuta.length - 2], 10);
        if (tareasPorId[idPadre]) {
          tareasPorId[idPadre].children.push(tareasPorId[t.TareaID]);
        } else {
          // Si no se encuentra el padre, lo tratamos como raíz por seguridad
          raices.push(tareasPorId[t.TareaID]);
        }
      }
    });

    return raices;
  };

  const handleCreate = () => {
    const d = nueva.__new || {};
    if (!d.Titulo || !d.FechaInicio || !d.FechaLimite) {
      return message.error("Título, Inicio y Fin son obligatorios");
    }
    crearM.mutate({
      proyecto_id: +id,
      titulo: d.Titulo,
      descripcion: "",
      estado: filtro.estado || "pendiente",
      usuario_asignados: d.usuario_asignados || [],
      fecha_inicio: d.FechaInicio.format("YYYY-MM-DD"),
      fecha_limite: d.FechaLimite.format("YYYY-MM-DD"),
      porcentaje_avance: 0,
      prioridad: { Baja: 1, Media: 2, Alta: 3, Crítica: 4 }[d.prioridad] || 2,
      comentarios: null,
    });
    setNueva({});
  };

  const columns = [
    {
      title: "Tarea",
      dataIndex: "Titulo",
      ...getColumnSearchProps("Titulo"),
      width: 300,
      render: (text, record) => {
        const id = record.TareaID;
        const nivel = record.nivel || 0;
        const indentacion = nivel * 24; // 24px por nivel

        return (
          <Tooltip title={`${id} - ${record.Titulo}`}>
            <div
              style={{
                paddingLeft: `${indentacion}px`,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {record.TareaID} - {record.Titulo}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "Responsables",
      dataIndex: "usuario_asignados",
      filters: participantesProyecto.map((u) => ({
        text: u.NombreCompleto,
        value: u.UsuarioID,
      })),
      onFilter: (value, record) =>
        (record.usuario_asignados || []).includes(value),
      width: 135,
      render: (arr) => (
        <Space>
          {(arr || []).map((uid) => (
            <Tooltip key={uid} title={lookupName(uid)}>
              <Avatar size="small">
                {lookupName(uid)
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </Avatar>
            </Tooltip>
          ))}
          {!(arr || []).length && <Text type="secondary">Sin asignar</Text>}
        </Space>
      ),
    },
    {
      title: "Estado",
      dataIndex: "Estado",
      filters: ordenEstados.map((e) => ({
        text: estadosMeta[e].label,
        value: e,
      })),
      onFilter: (val, row) => row.Estado === val,
      width: 100,
      render: (e) => (
        <Tag color={estadosMeta[e].color}>{estadosMeta[e].label}</Tag>
      ),
    },
    {
      title: "Antecesora",
      dataIndex: "antecesora",
      ...getColumnSearchProps("antecesora"),
      width: 120,
      render: (id) => {
        const antecesora = tareas.find((t) => t.TareaID === id);
        return antecesora ? antecesora.Titulo : "Sin antecesora";
      },
    },
    {
      title: "Inicio",
      dataIndex: "FechaInicio",
      width: 120,
      render: (f) => dayjs(f).format("YYYY-MM-DD"),
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
      width: 130,
      render: (f) => dayjs(f).format("YYYY-MM-DD"),
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
      filters: Object.keys(prioridadMeta).map((p) => ({ text: p, value: p })),
      onFilter: (value, record) => record.prioridad === value,
      width: 120,
      render: (p) => <Tag color={prioridadMeta[p]}>{p}</Tag>,
    },
    {
      title: "Comentarios",
      dataIndex: "comentarios",
      ...getColumnSearchProps("comentarios"),
      width: 200,
      render: (text, record) => (
        <Button
          type="link"
          onClick={() => {
            setComentarioTareaSeleccionada(record);
            setModalComentariosVisible(true);
          }}
        >
          Ver ({parseComentarios(text).length})
        </Button>
      ),
    },
    ,
    {
      title: "Acciones",
      key: "acciones",
      width: 120,
      render: (_, rec) => (
        <div style={{ marginRight: 12 }}>
          <Space>
            <Button
              size="small"
              onClick={() => {
                setEditingTask(rec);
                editForm.setFieldsValue({
                  Titulo: rec.Titulo,
                  Estado: rec.Estado,
                  PorcentajeAvance: rec.PorcentajeAvance,
                  prioridad: rec.prioridad,
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
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
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

                  <Table
                    dataSource={construirJerarquiaPorRuta(grupo)}
                    columns={columns}
                    expandable={{
                      defaultExpandAllRows: true,
                      childrenColumnName: "children",
                    }}
                    rowKey="TareaID"
                    pagination={true}
                    defaultExpandAllRows={true}
                    scroll={{ x: 1200, y: 400 }}
                    rowSelection={{
                      selectedRowKeys: seleccionadas.map((t) => t.TareaID),
                      onSelect: (record, selected) => {
                        setSeleccionadas((prev) => {
                          const existe = prev.some(
                            (t) => t.TareaID === record.TareaID
                          );
                          if (selected && !existe) return [...prev, record];
                          if (!selected)
                            return prev.filter(
                              (t) => t.TareaID !== record.TareaID
                            );
                          return prev;
                        });
                      },
                      onSelectAll: (selected, selectedRows, changeRows) => {
                        const allSelectedIds = tareasFiltradas.map(
                          (t) => t.TareaID
                        );
                        const allAlreadySelected = allSelectedIds.every((id) =>
                          seleccionadas.some((t) => t.TareaID === id)
                        );

                        if (allAlreadySelected) {
                          // Deselect all
                          setSeleccionadas(
                            seleccionadas.filter(
                              (t) => !allSelectedIds.includes(t.TareaID)
                            )
                          );
                        } else {
                          // Select all (sin duplicar)
                          const nuevos = tareasFiltradas.filter(
                            (t) =>
                              !seleccionadas.some(
                                (s) => s.TareaID === t.TareaID
                              )
                          );
                          setSeleccionadas([...seleccionadas, ...nuevos]);
                        }
                      },
                    }}
                  />
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
                      style={{ width: 100 }}
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
                      style={{ width: 180 }}
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
                    <Button type="primary" onClick={handleCreate}>
                      Guardar
                    </Button>
                  </Space>
                </Panel>
              );
            })}
          </Collapse>
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
              style={{ width: 100 }}
              value={nueva.__new?.prioridad}
              onChange={(v) =>
                setNueva((n) => ({ ...n, __new: { ...n.__new, prioridad: v } }))
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
              style={{ width: 180 }}
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
            <Button type="primary" onClick={handleCreate}>
              Guardar
            </Button>
          </Space>
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
          <GanttView tasks={ganttTasks} viewMode={ViewMode.Day} />
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
          <CalendarView events={events} />
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

      <Modal
        title="Editar Tarea"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={async () => {
          try {
            const vals = await editForm.validateFields();
            editarM.mutate({
              tarea_id: editingTask.TareaID,
              proyecto_id: +id,
              titulo: vals.Titulo,
              descripcion: editingTask.Descripcion || "",
              estado: vals.Estado,
              porcentaje_avance: Number(vals.PorcentajeAvance) || 0,
              prioridad:
                { Baja: 1, Media: 2, Alta: 3, Crítica: 4 }[vals.prioridad] || 2,
              fecha_inicio: vals.FechaInicio.format("YYYY-MM-DD"),
              fecha_limite: vals.FechaLimite.format("YYYY-MM-DD"),
              usuario_asignados: vals.usuario_asignados || [],
              comentarios: editingTask.comentarios || null,
              antecesora: vals.antecesora || null,
            });
            setEditModalVisible(false);
          } catch {}
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
        </Form>
      </Modal>
      <Modal
        title="Enviar recordatorio"
        open={modalRecordatorioVisible}
        onCancel={() => setModalRecordatorioVisible(false)}
        onOk={async () => {
          if (!mensajeRecordatorio.trim()) {
            return message.warning("Escribe un mensaje para el recordatorio");
          }

          // Recolectar IDs numéricos y correos escritos manualmente
          const usuarios = destinatariosSeleccionados
            .filter((v) => !v.includes("@"))
            .map((v) => parseInt(v));
          const con_copia = destinatariosSeleccionados.filter((v) =>
            v.includes("@")
          );

          try {
            await api.post("/notificaciones/recordatorio", {
              usuarios,
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

      <Modal
        title={`Comentarios - ${comentarioTareaSeleccionada?.Titulo}`}
        open={modalComentariosVisible}
        width={700}
        style={{ height: "60vh" }} // altura general menor
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
          const entrada = `[${user.Nombre};${dayjs().format(
            "YYYY-MM-DD HH:mm:ss"
          )};${nuevoComentario}]`;
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
            comentarios:
              (comentarioTareaSeleccionada.comentarios || "") + entrada,
            antecesora: comentarioTareaSeleccionada.antecesora || null,
          });
          message.success("Comentario agregado");
          setNuevoComentario("");
          setModalComentariosVisible(false);
          refetch();
        }}
      >
        {/* Historial de comentarios */}
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

        {/* Input para nuevo comentario */}
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
