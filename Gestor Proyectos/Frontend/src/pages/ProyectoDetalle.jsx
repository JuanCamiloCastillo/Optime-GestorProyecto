import React, { useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import './ProyectoDetalle.css';
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
  Row,
  Col,
  Drawer,
  Card,
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
  MenuOutlined,
  PlusOutlined,
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

// Hook personalizado para detectar el tamaño de pantalla
const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState('xl');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 576) setBreakpoint('xs');
      else if (width < 768) setBreakpoint('sm');
      else if (width < 992) setBreakpoint('md');
      else if (width < 1200) setBreakpoint('lg');
      else setBreakpoint('xl');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
};

export default function ProyectoDetalle() {
  const { id } = useParams();
  const breakpoint = useBreakpoint();
  const isMobile = ['xs', 'sm'].includes(breakpoint);
  const isTablet = breakpoint === 'md';

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
  const [modalRecordatorioVisible, setModalRecordatorioVisible] = useState(false);
  const [createTaskDrawerVisible, setCreateTaskDrawerVisible] = useState(false);
  const [filtersDrawerVisible, setFiltersDrawerVisible] = useState(false);

  const userSGP = JSON.parse(localStorage.getItem("userSGP")) || {};
  const idRol = Number(userSGP.idRol || userSGP.RolID);
  const idUsuario = Number(userSGP.idUsuario || userSGP.UsuarioID);
  const [modalComentariosVisible, setModalComentariosVisible] = useState(false);
  const [comentarioTareaSeleccionada, setComentarioTareaSeleccionada] = useState(null);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [destinatariosSeleccionados, setDestinatariosSeleccionados] = useState([]);
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
      setCreateTaskDrawerVisible(false);
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
  };

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

  const construirJerarquiaPorRuta = (tareas) => {
    const tareasPorId = {};
    tareas.forEach((t) => {
      tareasPorId[t.TareaID] = { ...t, children: [] };
    });

    const raices = [];

    tareas.forEach((t) => {
      if (!t.Ruta) {
        raices.push(tareasPorId[t.TareaID]);
        return;
      }
      const partesRuta = String(t.Ruta).split(">");
      if (partesRuta.length === 1) {
        raices.push(tareasPorId[t.TareaID]);
      } else {
        const idPadre = parseInt(partesRuta[partesRuta.length - 2], 10);
        if (tareasPorId[idPadre]) {
          tareasPorId[idPadre].children.push(tareasPorId[t.TareaID]);
        } else {
          raices.push(tareasPorId[t.TareaID]);
        }
      }
    });

    return raices;
  };

  const handleCreate = (values) => {
    if (!values.Titulo || !values.FechaInicio || !values.FechaLimite) {
      return message.error("Título, Inicio y Fin son obligatorios");
    }
    crearM.mutate({
      proyecto_id: +id,
      titulo: values.Titulo,
      descripcion: values.Descripcion || "",
      estado: values.Estado || "pendiente",
      usuario_asignados: values.usuario_asignados || [],
      fecha_inicio: values.FechaInicio.format("YYYY-MM-DD"),
      fecha_limite: values.FechaLimite.format("YYYY-MM-DD"),
      porcentaje_avance: values.PorcentajeAvance || 0,
      prioridad: { Baja: 1, Media: 2, Alta: 3, Crítica: 4 }[values.prioridad] || 2,
      comentarios: null,
    });
    setNueva({});
  };

  // Configuración de columnas responsive
  const getResponsiveColumns = () => {
    const baseColumns = [
      {
        title: "Tarea",
        dataIndex: "Titulo",
        ...(!isMobile ? getColumnSearchProps("Titulo") : {}),
        width: isMobile ? 200 : 300,
        fixed: isMobile ? 'left' : false,
        render: (text, record) => {
          const id = record.TareaID;
          const nivel = record.nivel || 0;
          const indentacion = isMobile ? nivel * 12 : nivel * 24;

          return (
            <Tooltip title={`${id} - ${record.Titulo}`}>
              <div
                style={{
                  paddingLeft: `${indentacion}px`,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: isMobile ? '12px' : '14px',
                }}
              >
                {isMobile ? record.Titulo : `${record.TareaID} - ${record.Titulo}`}
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: "Responsables",
        dataIndex: "usuario_asignados",
        filters: !isMobile ? participantesProyecto.map((u) => ({
          text: u.NombreCompleto,
          value: u.UsuarioID,
        })) : [],
        onFilter: !isMobile ? (value, record) =>
          (record.usuario_asignados || []).includes(value) : undefined,
        width: isMobile ? 100 : 135,
        render: (arr) => (
          <Space size={2} wrap>
            {(arr || []).slice(0, isMobile ? 1 : 3).map((uid) => (
              <Tooltip key={uid} title={lookupName(uid)}>
                <Avatar size={isMobile ? 20 : 24}>
                  {lookupName(uid)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </Avatar>
              </Tooltip>
            ))}
            {(arr || []).length > (isMobile ? 1 : 3) && (
              <Avatar size={isMobile ? 20 : 24}>
                +{(arr || []).length - (isMobile ? 1 : 3)}
              </Avatar>
            )}
            {!(arr || []).length && <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px' }}>N/A</Text>}
          </Space>
        ),
      },
      {
        title: "Estado",
        dataIndex: "Estado",
        filters: !isMobile ? ordenEstados.map((e) => ({
          text: estadosMeta[e].label,
          value: e,
        })) : [],
        onFilter: !isMobile ? (val, row) => row.Estado === val : undefined,
        width: isMobile ? 80 : 100,
        render: (e) => (
          <Tag color={estadosMeta[e].color} style={{ fontSize: isMobile ? '10px' : '12px' }}>
            {isMobile ? estadosMeta[e].label.substring(0, 3) : estadosMeta[e].label}
          </Tag>
        ),
      }
    ];

    if (!isMobile) {
      baseColumns.push(
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
          width: isTablet ? 100 : 120,
          render: (f) => dayjs(f).format(isMobile ? "DD/MM" : "YYYY-MM-DD"),
        },
        {
          title: "Vencimiento",
          dataIndex: "FechaLimite",
          width: isTablet ? 100 : 130,
          render: (f) => dayjs(f).format(isMobile ? "DD/MM" : "YYYY-MM-DD"),
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
          width: 120,
          render: (text, record) => (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setComentarioTareaSeleccionada(record);
                setModalComentariosVisible(true);
              }}
            >
              Ver ({parseComentarios(text).length})
            </Button>
          ),
        }
      );
    }

    // Columna de acciones
    baseColumns.push({
      title: "Acciones",
      key: "acciones",
      width: isMobile ? 80 : 120,
      fixed: isMobile ? 'right' : false,
      render: (_, rec) => (
        <Space size={4} direction={isMobile ? "vertical" : "horizontal"}>
          <Button
            size="small"
            type="primary"
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
            {isMobile ? "Ed" : "Editar"}
          </Button>
          {!isMobile && (
            <Button
              danger
              size="small"
              onClick={() => borrarM.mutate(rec.TareaID)}
            >
              Eliminar
            </Button>
          )}
        </Space>
      ),
    });

    return baseColumns;
  };

  const renderMobileCreateForm = () => (
    <Modal
      title="Crear Nueva Tarea"
      open={createTaskDrawerVisible}
      onCancel={() => setCreateTaskDrawerVisible(false)}
      width={isMobile ? '90%' : 600}
      style={{
        top: isMobile ? 20 : 50,
        maxHeight: '85vh'
      }}
      bodyStyle={{
        maxHeight: '70vh',
        overflowY: 'auto',
        padding: isMobile ? '12px' : '24px'
      }}
      footer={
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: isMobile ? '8px 0' : '10px 0'
        }}>
          <Button onClick={() => setCreateTaskDrawerVisible(false)}>
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={() => {
              const values = nueva.__new;
              handleCreate(values);
            }}
          >
            Guardar
          </Button>
        </div>
      }
    >
      <Form layout="vertical" size={isMobile ? "small" : "default"}>
        <Row gutter={isMobile ? 8 : 16}>
          <Col span={24}>
            <Form.Item
              label="Título"
              required
              style={{ marginBottom: isMobile ? 8 : 16 }}
            >
              <Input
                size={isMobile ? "small" : "default"}
                placeholder="Título de la tarea"
                value={nueva.__new?.Titulo}
                onChange={(e) =>
                  setNueva((n) => ({
                    ...n,
                    __new: { ...n.__new, Titulo: e.target.value },
                  }))
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={isMobile ? 8 : 16}>
          <Col xs={12}>
            <Form.Item
              label="Inicio"
              required
              style={{ marginBottom: isMobile ? 8 : 16 }}
            >
              <DatePicker
                size={isMobile ? "small" : "default"}
                style={{ width: '100%' }}
                placeholder="Inicio"
                value={nueva.__new?.FechaInicio}
                onChange={(d) =>
                  setNueva((n) => ({
                    ...n,
                    __new: { ...n.__new, FechaInicio: d },
                  }))
                }
              />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item
              label="Límite"
              required
              style={{ marginBottom: isMobile ? 8 : 16 }}
            >
              <DatePicker
                size={isMobile ? "small" : "default"}
                style={{ width: '100%' }}
                placeholder="Límite"
                value={nueva.__new?.FechaLimite}
                onChange={(d) =>
                  setNueva((n) => ({
                    ...n,
                    __new: { ...n.__new, FechaLimite: d },
                  }))
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={isMobile ? 8 : 16}>
          <Col xs={12}>
            <Form.Item
              label="Prioridad"
              style={{ marginBottom: isMobile ? 8 : 16 }}
            >
              <Select
                size={isMobile ? "small" : "default"}
                placeholder="Prioridad"
                style={{ width: '100%' }}
                value={nueva.__new?.prioridad}
                onChange={(v) =>
                  setNueva((n) => ({
                    ...n,
                    __new: { ...n.__new, prioridad: v },
                  }))
                }
              >
                {Object.keys(prioridadMeta).map((p) => (
                  <Option key={p} value={p}>{p}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item
              label="Estado"
              style={{ marginBottom: isMobile ? 8 : 16 }}
            >
              <Select
                size={isMobile ? "small" : "default"}
                placeholder="Estado"
                style={{ width: '100%' }}
                value={nueva.__new?.Estado}
                onChange={(v) =>
                  setNueva((n) => ({
                    ...n,
                    __new: { ...n.__new, Estado: v },
                  }))
                }
              >
                {ordenEstados.map((e) => (
                  <Option key={e} value={e}>
                    {estadosMeta[e].label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Responsables"
          style={{ marginBottom: isMobile ? 8 : 16 }}
        >
          <Select
            size={isMobile ? "small" : "default"}
            mode="multiple"
            placeholder="Seleccionar responsables"
            style={{ width: '100%' }}
            value={nueva.__new?.usuario_asignados}
            onChange={(arr) =>
              setNueva((n) => ({
                ...n,
                __new: { ...n.__new, usuario_asignados: arr },
              }))
            }
            maxTagCount={isMobile ? 1 : 3}
            maxTagPlaceholder={(omittedValues) => `+${omittedValues.length}`}
          >
            {usuarios.map((u) => (
              <Option key={u.UsuarioID} value={u.UsuarioID}>
                {u.NombreCompleto}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Descripción"
          style={{ marginBottom: 0 }}
        >
          <Input.TextArea
            size={isMobile ? "small" : "default"}
            rows={isMobile ? 2 : 3}
            placeholder="Descripción opcional"
            value={nueva.__new?.Descripcion}
            onChange={(e) =>
              setNueva((n) => ({
                ...n,
                __new: { ...n.__new, Descripcion: e.target.value },
              }))
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );

  const renderMobileFilters = () => (
    <Drawer
      title="Filtros"
      placement="right"
      width="85%"
      open={filtersDrawerVisible}
      onClose={() => setFiltersDrawerVisible(false)}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text strong>Buscar por texto:</Text>
          <Input
            placeholder="Buscar tareas..."
            value={filtro.texto}
            onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })}
            style={{ marginTop: 8 }}
          />
        </div>

        <div>
          <Text strong>Filtrar por persona:</Text>
          <Select
            placeholder="Seleccionar persona"
            style={{ width: '100%', marginTop: 8 }}
            value={filtro.persona}
            onChange={(v) => setFiltro({ ...filtro, persona: v })}
            allowClear
          >
            {participantesProyecto.map((u) => (
              <Option key={u.UsuarioID} value={u.UsuarioID}>
                {u.NombreCompleto}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Text strong>Filtrar por estado:</Text>
          <Select
            placeholder="Seleccionar estado"
            style={{ width: '100%', marginTop: 8 }}
            value={filtro.estado}
            onChange={(v) => setFiltro({ ...filtro, estado: v })}
            allowClear
          >
            {ordenEstados.map((e) => (
              <Option key={e} value={e}>
                {estadosMeta[e].label}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Text strong>Filtrar por vencimiento:</Text>
          <Select
            placeholder="Filtrar por vencimiento"
            style={{ width: '100%', marginTop: 8 }}
            value={filtroVencimiento}
            onChange={(val) => setFiltroVencimiento(val)}
            allowClear
          >
            <Select.Option value="vencidas">Vencidas</Select.Option>
            <Select.Option value="hoy">Se vencen hoy</Select.Option>
            <Select.Option value="semana">Esta semana</Select.Option>
            <Select.Option value="proxima">Próxima semana</Select.Option>
            <Select.Option value="mes">Este mes</Select.Option>
          </Select>
        </div>
      </Space>
    </Drawer>
  );

  const renderMobileStats = () => {
    const stats = ordenEstados.map(estado => {
      const count = datosFiltrados.filter(t => t.Estado === estado).length;
      return { estado, count, color: estadosMeta[estado].color, label: estadosMeta[estado].label };
    }).filter(s => s.count > 0);

    return (
      <Row gutter={8} style={{ marginBottom: 16 }}>
        {stats.map((stat) => (
          <Col xs={6} sm={4} md={3} key={stat.estado}>
            <Card
              size="small"
              style={{
                textAlign: 'center',
                borderColor: stat.color,
                borderWidth: 2
              }}
            >
              <Text strong style={{ color: stat.color, fontSize: '12px' }}>
                {stat.label.substring(0, 4)}
              </Text>
              <br />
              <Text style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {stat.count}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <div
      className="proyecto-detalle-container"
      style={{
        padding: isMobile ? '8px' : '16px',
        maxWidth: '100vw',
        overflowX: 'hidden',
        overflowY: 'auto'
      }}
    >
      {/* Header responsive */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col xs={16} sm={18} md={20}>
          <Title
            level={isMobile ? 3 : 2}
            style={{
              margin: 0,
              fontSize: isMobile ? '18px' : undefined,
              lineHeight: isMobile ? '24px' : undefined
            }}
          >
            {isMobile
              ? (proyecto.NombreProyecto.length > 20
                ? `${proyecto.NombreProyecto.substring(0, 20)}...`
                : proyecto.NombreProyecto)
              : proyecto.NombreProyecto
            }
          </Title>
        </Col>
        <Col xs={8} sm={6} md={4}>
          <Space>
            {isMobile && (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateTaskDrawerVisible(true)}
                  size="small"
                />
                <Button
                  icon={<MenuOutlined />}
                  onClick={() => setFiltersDrawerVisible(true)}
                  size="small"
                />
              </>
            )}
          </Space>
        </Col>
      </Row>

      {/* Estadísticas móviles */}
      {isMobile && renderMobileStats()}

      <Tabs
        defaultActiveKey="1"
        type="card"
        tabBarGutter={isMobile ? 8 : 20}
        size={isMobile ? "small" : "default"}
        tabPosition={isMobile ? "top" : "top"}
      >
        <Tabs.TabPane
          tab={
            <span>
              <TableOutlined /> {isMobile ? "" : "Tabla"}
            </span>
          }
          key="1"
        >
          {!isMobile && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={8} md={6}>
                <Input
                  placeholder="Buscar tareas..."
                  value={filtro.texto}
                  onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })}
                  prefix={<SearchOutlined />}
                />
              </Col>
              <Col xs={24} sm={8} md={6}>
                <Select
                  placeholder="Filtrar por persona"
                  style={{ width: '100%' }}
                  value={filtro.persona}
                  onChange={(v) => setFiltro({ ...filtro, persona: v })}
                  allowClear
                >
                  {participantesProyecto.map((u) => (
                    <Option key={u.UsuarioID} value={u.UsuarioID}>
                      {u.NombreCompleto}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={8} md={6}>
                <Select
                  placeholder="Filtrar por estado"
                  style={{ width: '100%' }}
                  value={filtro.estado}
                  onChange={(v) => setFiltro({ ...filtro, estado: v })}
                  allowClear
                >
                  {ordenEstados.map((e) => (
                    <Option key={e} value={e}>
                      {estadosMeta[e].label}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={24} md={6}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateTaskDrawerVisible(true)}
                  style={{ width: '100%' }}
                >
                  Nueva Tarea
                </Button>
              </Col>
            </Row>
          )}

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
                      size={isMobile ? "small" : "default"}
                      style={{ marginBottom: 12 }}
                      onClick={() => setModalRecordatorioVisible(true)}
                    >
                      Enviar recordatorio ({seleccionadas.length})
                    </Button>
                  )}

                  <Table
                    dataSource={construirJerarquiaPorRuta(grupo)}
                    columns={getResponsiveColumns()}
                    expandable={{
                      defaultExpandAllRows: !isMobile,
                      childrenColumnName: "children",
                    }}
                    rowKey="TareaID"
                    pagination={{
                      pageSize: isMobile ? 5 : 10,
                      showTotal: !isMobile ? (total, range) =>
                        `${range[0]}-${range[1]} de ${total} tareas` : undefined,
                      size: isMobile ? "small" : "default"
                    }}
                    scroll={{
                      x: isMobile ? 400 : 1500,
                      y: isMobile ? 300 : 400
                    }}
                    size={isMobile ? "small" : "default"}
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
                          setSeleccionadas(
                            seleccionadas.filter(
                              (t) => !allSelectedIds.includes(t.TareaID)
                            )
                          );
                        } else {
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

                  {/* Formulario de creación para desktop */}
                  {!isMobile && (
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
                      <Button
                        type="primary"
                        onClick={() => handleCreate(nueva.__new || {})}
                      >
                        Guardar
                      </Button>
                    </Space>
                  )}
                </Panel>
              );
            })}
          </Collapse>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <ProjectOutlined /> {isMobile ? "" : "Gantt"}
            </span>
          }
          key="2"
        >
          <Select
            placeholder="Filtrar por vencimiento"
            style={{
              width: isMobile ? '100%' : 240,
              marginBottom: 12
            }}
            onChange={(val) => setFiltroVencimiento(val)}
            allowClear
          >
            <Select.Option value="vencidas">Vencidas</Select.Option>
            <Select.Option value="hoy">Se vencen hoy</Select.Option>
            <Select.Option value="semana">Esta semana</Select.Option>
            <Select.Option value="proxima">Próxima semana</Select.Option>
            <Select.Option value="mes">Este mes</Select.Option>
          </Select>
          <div style={{ overflowX: 'auto' }}>
            <GanttView
              tasks={ganttTasks}
              viewMode={isMobile ? ViewMode.Week : ViewMode.Day}
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={<span><BarChartOutlined /> {isMobile ? "" : "Gráfico"}</span>}
          key="3"
        >
          <div className="chart-pane" style={{ overflowX: "auto" }}>
            <ChartView tasks={tareasFiltradas} usuarios={usuarios} />
          </div>
        </Tabs.TabPane>


        <Tabs.TabPane
          tab={
            <span>
              <CalendarOutlined /> {isMobile ? "" : "Calendario"}
            </span>
          }
          key="4"
        >
          <div style={{ overflowX: 'auto' }}>
            <CalendarView events={events} />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <OrderedListOutlined /> {isMobile ? "" : "Kanban"}
            </span>
          }
          key="5"
        >
          <div style={{ overflowX: 'auto' }}>
            <KanbanView tasks={tareasFiltradas} usuarios={usuarios} />
          </div>
        </Tabs.TabPane>

        {[1, 2, 3].includes(idRol) && (
          <>
            <Tabs.TabPane
              tab={
                <span>
                  <UserOutlined /> {isMobile ? "" : "Recursos"}
                </span>
              }
              key="6"
            >
              <div style={{ overflowX: 'auto' }}>
                <RecursosView
                  tareas={tareasFiltradas}
                  usuarios={participantesProyecto}
                />
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane
              tab={
                <span>
                  <DollarOutlined /> {isMobile ? "" : "Financiero"}
                </span>
              }
              key="7"
            >
              <div style={{ overflowX: 'auto' }}>
                <FinancieroView
                  tareas={tareasFiltradas}
                  usuarios={participantesProyecto}
                  roles={roles}
                />
              </div>
            </Tabs.TabPane>
          </>
        )}
      </Tabs>
      {renderMobileCreateForm()}
      {renderMobileFilters()}

      {/* Modal de edición responsive */}
      <Modal
        title="Editar Tarea"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        width={isMobile ? '95%' : 600} 
        style={isMobile ? {
          top: 10,
          maxHeight: '95vh',
          margin: '0 auto'
        } : undefined}
        bodyStyle={{
          maxHeight: isMobile ? '70vh' : '60vh',
          overflowY: 'auto',
          padding: isMobile ? '12px' : '24px'
        }}
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
          } catch { }
        }}
      >
        <Form
          form={editForm}
          layout="vertical"
          size={isMobile ? "small" : "default"}
        >
          <Form.Item
            name="Titulo"
            label="Título"
            rules={[{ required: true }]}
            style={{ marginBottom: isMobile ? 12 : 16 }}
          >
            <Input />
          </Form.Item>

          <Row gutter={isMobile ? 8 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="Estado"
                label="Estado"
                rules={[{ required: true }]}
                style={{ marginBottom: isMobile ? 12 : 16 }}
              >
                <Select>
                  {ordenEstados.map((e) => (
                    <Option key={e} value={e}>
                      {estadosMeta[e].label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="PorcentajeAvance"
                label="Avance (%)"
                style={{ marginBottom: isMobile ? 12 : 16 }}
              >
                <Input type="number" min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={isMobile ? 8 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="prioridad"
                label="Prioridad"
                style={{ marginBottom: isMobile ? 12 : 16 }}
              >
                <Select>
                  {Object.keys(prioridadMeta).map((p) => (
                    <Option key={p} value={p}>
                      {p}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="antecesora"
                label="Antecesora"
                style={{ marginBottom: isMobile ? 12 : 16 }}
              >
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
            </Col>
          </Row>

          <Row gutter={isMobile ? 8 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="FechaInicio"
                label="Inicio"
                rules={[{ required: true }]}
                style={{ marginBottom: isMobile ? 12 : 16 }}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="FechaLimite"
                label="Límite"
                rules={[{ required: true }]}
                style={{ marginBottom: isMobile ? 12 : 16 }}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="usuario_asignados"
            label="Responsables"
            style={{ marginBottom: isMobile ? 8 : 16 }}
          >
            <Select
              mode="multiple"
              maxTagCount={isMobile ? 2 : 3}
              maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} más`}
            >
              {usuarios.map((u) => (
                <Option key={u.UsuarioID} value={u.UsuarioID}>
                  {u.NombreCompleto}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>



      {/* Modal de recordatorio */}
      <Modal
        title="Enviar recordatorio"
        open={modalRecordatorioVisible}
        onCancel={() => setModalRecordatorioVisible(false)}
        width={isMobile ? '95%' : undefined}
        style={isMobile ? { top: 20 } : undefined}
        onOk={async () => {
          if (!mensajeRecordatorio.trim()) {
            return message.warning("Escribe un mensaje para el recordatorio");
          }

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

      {/* Modal de comentarios responsive */}
      <Modal
        title={`Comentarios - ${comentarioTareaSeleccionada?.Titulo}`}
        open={modalComentariosVisible}
        width={isMobile ? '95%' : 700}
        style={isMobile ? { top: 20, height: "80vh" } : { height: "60vh" }}
        bodyStyle={{
          display: "flex",
          flexDirection: "column",
          height: isMobile ? "60vh" : "50vh",
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
                <Text strong style={{ fontSize: isMobile ? '12px' : '14px' }}>
                  {c.nombre}
                </Text>
                <Text
                  type="secondary"
                  style={{
                    float: "right",
                    fontSize: isMobile ? '10px' : '12px'
                  }}
                >
                  {dayjs(c.fecha).format("YYYY-MM-DD HH:mm")}
                </Text>
                <div
                  dangerouslySetInnerHTML={{ __html: c.texto }}
                  style={{
                    overflowX: "auto",
                    maxWidth: "100%",
                    fontSize: isMobile ? '12px' : '14px',
                    marginTop: 4
                  }}
                />
              </div>
            )
          )}
        </div>

        {/* Input para nuevo comentario */}
        <Input.TextArea
          rows={isMobile ? 3 : 2}
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