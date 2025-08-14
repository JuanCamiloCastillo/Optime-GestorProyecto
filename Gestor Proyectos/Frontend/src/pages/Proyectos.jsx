import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Space,
  Typography,
  Input,
  Select,
  Button,
  Tooltip,
  Avatar,
  Tag,
  Progress,
  Drawer,
  Modal,
  DatePicker,
  Table,
  Segmented,
  message,
  Empty,
} from "antd";
import {
  AppstoreOutlined,
  NodeExpandOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../services/api";
import "./Proyectos.css";

const { Title, Text } = Typography;
const { Option } = Select;

// -------- Breakpoints responsivos --------
const useBreakpoint = () => {
  const [bp, setBp] = useState("xl");
  React.useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      if (w < 576) setBp("xs");
      else if (w < 768) setBp("sm");
      else if (w < 992) setBp("md");
      else if (w < 1200) setBp("lg");
      else setBp("xl");
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return bp;
};

// Construye jerarquía a partir de una ruta tipo "1>5>9"
function buildTreeFromRuta(lista, idField = "ProyectoID", rutaField = "Ruta") {
  const map = new Map();
  const roots = [];
  (lista || []).forEach((p) => {
    const partes = String(p[rutaField] || "")
      .split(">")
      .filter(Boolean);
    const nivel = Math.max(0, partes.length - 1);
    map.set(p[idField], { ...p, nivel, children: [] });
  });
  (lista || []).forEach((p) => {
    const partes = String(p[rutaField] || "")
      .split(">")
      .filter(Boolean);
    const id = p[idField];
    if (partes.length <= 1) {
      roots.push(map.get(id));
    } else {
      const idPadre = parseInt(partes[partes.length - 2], 10);
      const padre = map.get(idPadre);
      const yo = map.get(id);
      if (padre) padre.children.push(yo);
      else roots.push(yo);
    }
  });
  return roots;
}

export default function Proyectos() {
  const bp = useBreakpoint();
  const isMobile = ["xs", "sm"].includes(bp);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ------- Usuario/Permisos -------
  const userSGP = JSON.parse(localStorage.getItem("userSGP") || "{}") || {};
  const rawPermisos = JSON.parse(localStorage.getItem("permisosSGP") || "null");
  const permisosLista = Array.isArray(rawPermisos)
    ? rawPermisos
    : rawPermisos && typeof rawPermisos === "object"
    ? [rawPermisos]
    : [];
  const permisosVista =
    permisosLista.find(
      (p) => p.Modulo === "Proyectos.jsx" || p.Modulo === "Proyectos"
    ) || {};
  const puedeCrear = !!permisosVista.Crear;
  const puedeEditar = !!permisosVista.Editar;
  const puedeEliminar = !!permisosVista.Eliminar;

  const idRol = Number(userSGP.idRol || userSGP.RolID);
  const idUsuario = Number(userSGP.idUsuario || userSGP.UsuarioID);

  // ------- Estado UI -------
  const [view, setView] = useState("cards"); // "cards" | "tree"
  const [texto, setTexto] = useState("");
  const [responsable, setResponsable] = useState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  const [formProyecto, setFormProyecto] = useState({
    Nombre: "",
    Estado: "",
    ResponsableID: undefined,
    FechaInicio: undefined,
    FechaFin: undefined,
    Descripcion: "",
    ImagenURL: "",
    ProyectoPadreID: undefined,
  });

  // ------- Queries -------
  const { data: usuarios = [] } = useQuery(["usuarios"], () =>
    api.get("/usuarios/").then((r) => r.data)
  );
  const { data: areas = [] } = useQuery(
    ["areas"],
    () => api.get("/areas/").then((r) => r.data),
    { staleTime: 5 * 60 * 1000 }
  );

  const {
    data: proyectos = [],
    isLoading: lp,
    refetch: refetchProyectos,
  } = useQuery(["proyectos-jerarquia", idRol, idUsuario], async () => {
    const r = await api.get("/proyectos/");
    return r.data || [];
  });

  const { data: tareas = [] } = useQuery(["tareas"], async () => {
    const r = await api.get("/tareas/");
    return r.data || [];
  });

  // ------- Mutations -------
  const crearM = useMutation((payload) => api.post("/proyectos/", payload), {
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (q) => q.queryKey?.[0] === "proyectos-jerarquia",
      });
      await refetchProyectos();
      message.success("Proyecto creado");
      setDrawerOpen(false);
      setFormProyecto({
        Nombre: "",
        Estado: "",
        ResponsableID: undefined,
        FechaInicio: undefined,
        FechaFin: undefined,
        Descripcion: "",
        ImagenURL: "",
        ProyectoPadreID: undefined,
      });
    },
  });

  const editarM = useMutation(
    ({ id, data }) => api.put(`/proyectos/${id}`, data),
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          predicate: (q) => q.queryKey?.[0] === "proyectos-jerarquia",
        });
        await refetchProyectos();
        message.success("Proyecto actualizado");
        setModalOpen(false);
        setEditing(null);
      },
    }
  );

  const borrarM = useMutation((id) => api.delete(`/proyectos/${id}`), {
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (q) => q.queryKey?.[0] === "proyectos-jerarquia",
      });
      await refetchProyectos();
      message.success("Proyecto eliminado");
    },
  });

  // ------- Derivados -------
  const responsablesOptions = useMemo(
    () =>
      usuarios.map((u) => ({ value: u.UsuarioID, label: u.NombreCompleto })),
    [usuarios]
  );

  // progreso por proyecto (promedio simple del % de sus tareas)
  const progresoPorProyecto = useMemo(() => {
    const m = new Map();
    const byProj = new Map();

    (tareas || []).forEach((t) => {
      const pid = t.ProyectoID;
      if (pid == null) return;
      const v = Number(t.PorcentajeAvance);
      if (Number.isNaN(v)) return; // ignora NaN
      const val = Math.min(100, Math.max(0, v)); // clamp 0–100
      if (!byProj.has(pid)) byProj.set(pid, []);
      byProj.get(pid).push(val);
    });

    byProj.forEach((arr, pid) => {
      const avg = arr.length
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : 0;
      m.set(pid, avg);
    });

    return m;
  }, [tareas]);

  // equipo por proyecto (nombres abreviados a partir de tareas)
  const equipoPorProyecto = useMemo(() => {
    const m = new Map();
    const usersById = new Map(usuarios.map((u) => [u.UsuarioID, u]));
    (tareas || []).forEach((t) => {
      const pid = t.ProyectoID;
      if (!m.has(pid)) m.set(pid, new Set());
      (t.usuario_asignados || []).forEach((uid) => m.get(pid).add(uid));
    });
    const result = new Map();
    m.forEach((set, pid) => {
      result.set(
        pid,
        Array.from(set)
          .map((uid) => usersById.get(uid))
          .filter(Boolean)
      );
    });
    return result;
  }, [tareas, usuarios]);

  // opciones para proyecto padre
  const opcionesPadre = useMemo(
    () =>
      Array.isArray(proyectos)
        ? proyectos.map((p) => ({
            value: p.ProyectoID,
            label: p.NombreProyecto || p.Nombre,
          }))
        : [],
    [proyectos]
  );

  // helper: responsable por idAsignado (con fallbacks)
  const matchResponsable = (p, uid) => {
    const val =
      p.idAsignado ??
      p.IdAsignado ??
      p.id_asignado ??
      p.UsuarioResponsableID ??
      p.ResponsableID;
    if (Array.isArray(val)) return val.map(Number).includes(Number(uid));
    if (val == null) return false;
    return Number(val) === Number(uid);
  };

  // filtros (sin estado)
  const proyectosFiltrados = useMemo(() => {
    const txt = (texto || "").trim().toLowerCase();
    return (proyectos || [])
      .filter((p) =>
        txt
          ? (p.NombreProyecto || p.Nombre || "").toLowerCase().includes(txt)
          : true
      )
      .filter((p) => (responsable ? matchResponsable(p, responsable) : true));
  }, [proyectos, texto, responsable]);

  // jerarquía
  const proyectosJerarquia = useMemo(
    () => buildTreeFromRuta(proyectosFiltrados, "ProyectoID", "Ruta"),
    [proyectosFiltrados]
  );

  // nombre de área "<id> - <nombre>"
  const areaNombre = (id, p) => {
    const a =
      (areas || []).find((x) => Number(x.AreaID ?? x.id) === Number(id)) ||
      null;
    const area = "Área: " + p.area;
    return area || "";
  };

  // --------- Columnas (Jerarquía) ---------
  const columns = [
    {
      title: "Proyecto",
      dataIndex: "NombreProyecto",
      key: "nombre",
      render: (_, r) => {
        const nivel = r.nivel || 0;
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingLeft: 8 + nivel * (isMobile ? 12 : 16),
            }}
          >
            <span style={{ fontWeight: r.children?.length ? 600 : 400 }}>
              {r.NombreProyecto || r.Nombre}
            </span>
            {r.Codigo && <Tag color="blue">{r.Codigo}</Tag>}
          </div>
        );
      },
    },
    {
      title: "Responsable",
      dataIndex: "UsuarioResponsableID",
      key: "resp",
      width: 200,
      render: (uid) => {
        const u = usuarios.find((x) => x.UsuarioID === uid);
        return u ? (
          <Space>
            <Avatar size="small">
              {u.NombreCompleto?.split(" ")
                .map((x) => x[0])
                .join("")}
            </Avatar>
            <Text>{u.NombreCompleto}</Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
    },
    {
      title: "% Avance",
      key: "avance",
      width: 160,
      render: (r) => (
        <Progress
          percent={progresoPorProyecto.get(r.ProyectoID) ?? 0}
          size={8}
        />
      ),
    },
    {
      title: "Inicio",
      dataIndex: "FechaInicio",
      key: "ini",
      width: 120,
      render: (f) => (f ? dayjs(f).format("YYYY-MM-DD") : "—"),
      sorter: (a, b) =>
        dayjs(a.FechaInicio || 0).valueOf() -
        dayjs(b.FechaInicio || 0).valueOf(),
    },
    {
      title: "Fin",
      dataIndex: "FechaFin",
      key: "fin",
      width: 120,
      render: (f) => (f ? dayjs(f).format("YYYY-MM-DD") : "—"),
      sorter: (a, b) =>
        dayjs(a.FechaFin || 0).valueOf() - dayjs(b.FechaFin || 0).valueOf(),
    },
    {
      title: "Acciones",
      key: "acc",
      width: 160,
      render: (r) => (
        <Space>
          {puedeEditar && (
            <Tooltip title="Editar">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(r);
                  setFormProyecto({
                    Nombre: r.NombreProyecto || r.Nombre || "",
                    Estado: r.Estado || "",
                    ResponsableID: r.UsuarioResponsableID,
                    FechaInicio: r.FechaInicio
                      ? dayjs(r.FechaInicio)
                      : undefined,
                    FechaFin: r.FechaFin ? dayjs(r.FechaFin) : undefined,
                    Descripcion: r.Descripcion || "",
                    ImagenURL: r.ImagenURL || "",
                    ProyectoPadreID: r.ProyectoPadreID || undefined,
                  });
                  setModalOpen(true);
                }}
              />
            </Tooltip>
          )}
          {puedeEliminar && (
            <Tooltip title="Eliminar">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  borrarM.mutate(r.ProyectoID);
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // ---------- Render ----------
  if (lp) return <div style={{ padding: 24 }}>Cargando…</div>;

  const CardProyecto = ({ p }) => {
    const equipo = equipoPorProyecto.get(p.ProyectoID) || [];
    const avance = progresoPorProyecto.get(p.ProyectoID) || 0;
    const img = p.ImagenURL || "/assets/imagenes/default-project.jpg";
    const areaStr = areaNombre(p.AreaID ?? p.idArea ?? p.AreaId, p);

    return (
      <Card
        hoverable
        style={{ height: "100%", cursor: "pointer" }}
        onClick={() => navigate(`/proyectos/${p.ProyectoID}`)}
        cover={
          <div
            style={{ height: 120, overflow: "hidden", background: "#f6f8fa" }}
          >
            <img
              src={img}
              alt={p.NombreProyecto || p.Nombre}
              style={{ width: "100%", height: 120, objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.src = "/assets/imagenes/default-project.jpg";
              }}
            />
          </div>
        }
        actions={[
          puedeEditar ? (
            <Tooltip title="Editar" key="edit">
              <EditOutlined
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(p);
                  setFormProyecto({
                    Nombre: p.NombreProyecto || p.Nombre || "",
                    Estado: p.Estado || "",
                    ResponsableID: p.UsuarioResponsableID,
                    FechaInicio: p.FechaInicio
                      ? dayjs(p.FechaInicio)
                      : undefined,
                    FechaFin: p.FechaFin ? dayjs(p.FechaFin) : undefined,
                    Descripcion: p.Descripcion || "",
                    ImagenURL: p.ImagenURL || "",
                    ProyectoPadreID: p.ProyectoPadreID || undefined,
                  });
                  setModalOpen(true);
                }}
              />
            </Tooltip>
          ) : null,
          puedeEliminar ? (
            <Tooltip title="Eliminar" key="del">
              <DeleteOutlined
                onClick={(e) => {
                  e.stopPropagation();
                  borrarM.mutate(p.ProyectoID);
                }}
              />
            </Tooltip>
          ) : null,
        ].filter(Boolean)}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="small">
          <Space
            align="start"
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <div style={{ minWidth: 0 }}>
              <Tooltip title={p.NombreProyecto || p.Nombre}>
                <Title
                  level={5}
                  style={{
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.NombreProyecto || p.Nombre}
                </Title>
              </Tooltip>
              <Text type="secondary">
                {areaStr || p.Codigo || `ID ${p.ProyectoID}`}
              </Text>
            </div>
            <Tag>{p.Estado || "—"}</Tag>
          </Space>

          <div style={{ marginTop: 8 }}>
            <Progress percent={avance} size={8} />
          </div>

          <Space
            style={{
              width: "100%",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            <Space>
              <TeamOutlined />
              <Avatar.Group max={{ count: 4 }} size="small">
                {equipo.length ? (
                  equipo.map((u) => (
                    <Tooltip key={u.UsuarioID} title={u.NombreCompleto}>
                      <Avatar size="small">
                        {u.NombreCompleto?.split(" ")
                          .map((x) => x[0])
                          .join("")}
                      </Avatar>
                    </Tooltip>
                  ))
                ) : (
                  <Tooltip title="Sin equipo asignado">
                    <Avatar size="small">—</Avatar>
                  </Tooltip>
                )}
              </Avatar.Group>
            </Space>
            <Space>
              <Text type="secondary">
                {p.FechaInicio ? dayjs(p.FechaInicio).format("YYYY-MM-DD") : ""}
              </Text>
              <Text type="secondary">→</Text>
              <Text type="secondary">
                {p.FechaFin ? dayjs(p.FechaFin).format("YYYY-MM-DD") : ""}
              </Text>
            </Space>
          </Space>
        </Space>
      </Card>
    );
  };

  const contenido = (
    <div
      style={{
        height: "calc(100vh - 120px)",
        overflowY: "auto",
        paddingRight: 8,
        paddingBottom: 56,
      }}
    >
      {/* Filtros y acciones (sin estado) */}
      <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 12 }}>
        <Col xs={24} sm={12} md={12} lg={10}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Buscar proyectos..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </Col>
        <Col xs={12} sm={6} md={6} lg={6}>
          <Select
            allowClear
            placeholder="Responsable"
            style={{ width: "100%" }}
            value={responsable}
            onChange={setResponsable}
            options={responsablesOptions}
          />
        </Col>
        <Col
          xs={12}
          sm={6}
          md={6}
          lg={8}
          style={{ textAlign: isMobile ? "left" : "right" }}
        >
          <Space>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                {
                  label: isMobile ? <AppstoreOutlined /> : "Tarjetas",
                  value: "cards",
                },
                {
                  label: isMobile ? <NodeExpandOutlined /> : "Jerarquía",
                  value: "tree",
                },
              ]}
            />
            {puedeCrear && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setDrawerOpen(true)}
              >
                {!isMobile && "Nuevo"}
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {view === "cards" ? (
        <Row gutter={[16, 16]}>
          {proyectosFiltrados.length ? (
            proyectosFiltrados.map((p) => (
              <Col key={p.ProyectoID} xs={24} sm={12} md={8} lg={6} xl={6}>
                <CardProyecto p={p} />
              </Col>
            ))
          ) : (
            <Col span={24}>
              <Empty description="Sin resultados" />
            </Col>
          )}
        </Row>
      ) : (
        <Table
          dataSource={proyectosJerarquia}
          columns={columns}
          rowKey="ProyectoID"
          size={isMobile ? "small" : "middle"}
          sticky={{ offsetHeader: 64 }}
          expandable={{
            childrenColumnName: "children",
            expandRowByClick: true,
            rowExpandable: (r) =>
              Array.isArray(r.children) && r.children.length > 0,
          }}
          expandedRowKeys={expandedRowKeys}
          onExpand={(expanded, record) => {
            setExpandedRowKeys((prev) =>
              expanded
                ? [...prev, record.ProyectoID]
                : prev.filter((k) => k !== record.ProyectoID)
            );
          }}
          onRow={(r) => ({
            onClick: () => navigate(`/proyectos/${r.ProyectoID}`),
          })}
          pagination={{
            pageSize: isMobile ? 6 : 10,
            showSizeChanger: !isMobile,
          }}
        />
      )}
    </div>
  );

  return (
<<<<<<< Updated upstream
    <div className="proyectos-page">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Proyectos
        </Title>
        {canCreate && (
=======
    <div style={{ padding: isMobile ? 8 : 16 }}>
      <Title level={isMobile ? 3 : 2} style={{ marginBottom: 12 }}>
        Proyectos
      </Title>
      {contenido}

      {/* Drawer crear */}
      <Drawer
        title="Nuevo proyecto"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={isMobile ? "100%" : 520}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Input
            placeholder="Nombre"
            value={formProyecto.Nombre}
            onChange={(e) =>
              setFormProyecto((f) => ({ ...f, Nombre: e.target.value }))
            }
          />
          <Select
            placeholder="Estado"
            value={formProyecto.Estado}
            onChange={(v) => setFormProyecto((f) => ({ ...f, Estado: v }))}
            allowClear
          >
            {["pendiente", "en_progreso", "detenido", "terminado"].map((e) => (
              <Option key={e} value={e}>
                {e.replace("_", " ")}
              </Option>
            ))}
          </Select>
          <Select
            showSearch
            placeholder="Responsable"
            value={formProyecto.ResponsableID}
            onChange={(v) =>
              setFormProyecto((f) => ({ ...f, ResponsableID: v }))
            }
            options={responsablesOptions}
            allowClear
          />
          <DatePicker
            placeholder="Inicio"
            value={formProyecto.FechaInicio}
            onChange={(d) => setFormProyecto((f) => ({ ...f, FechaInicio: d }))}
            style={{ width: "100%" }}
          />
          <DatePicker
            placeholder="Fin"
            value={formProyecto.FechaFin}
            onChange={(d) => setFormProyecto((f) => ({ ...f, FechaFin: d }))}
            style={{ width: "100%" }}
          />
          <Input.TextArea
            rows={3}
            placeholder="Descripción"
            value={formProyecto.Descripcion}
            onChange={(e) =>
              setFormProyecto((f) => ({ ...f, Descripcion: e.target.value }))
            }
          />
          <Input
            placeholder="URL de imagen (opcional)"
            value={formProyecto.ImagenURL}
            onChange={(e) =>
              setFormProyecto((f) => ({ ...f, ImagenURL: e.target.value }))
            }
          />
          <Select
            allowClear
            placeholder="Proyecto padre (opcional)"
            value={formProyecto.ProyectoPadreID}
            onChange={(v) =>
              setFormProyecto((f) => ({ ...f, ProyectoPadreID: v }))
            }
            options={opcionesPadre}
          />

>>>>>>> Stashed changes
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              if (!formProyecto.Nombre)
                return message.error("Nombre es obligatorio");
              crearM.mutate({
                nombre: formProyecto.Nombre,
                estado: formProyecto.Estado || "pendiente",
                usuario_responsable_id: formProyecto.ResponsableID || null,
                fecha_inicio: formProyecto.FechaInicio
                  ? formProyecto.FechaInicio.format("YYYY-MM-DD")
                  : null,
                fecha_fin: formProyecto.FechaFin
                  ? formProyecto.FechaFin.format("YYYY-MM-DD")
                  : null,
                descripcion: formProyecto.Descripcion || "",
                imagen_url: formProyecto.ImagenURL || null,
                proyecto_padre_id: formProyecto.ProyectoPadreID || null,
              });
            }}
            block
          >
            Crear
          </Button>
        </Space>
      </Drawer>

<<<<<<< Updated upstream
      <div style={{ maxHeight: "65vh", overflowY: "auto", paddingRight: 8 }}>
        <Row gutter={[16, 16]}>
          {proyectos.map((proy) => (
            <Col key={proy.ProyectoID} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                className="project-card"
                cover={
                  <img
                    alt={proy.NombreProyecto}
                    src={proy.imagen || "/assets/imagenes/default-project.jpg"}
                    className="project-card-cover"
                  />
                }
                onClick={() => navigate(`/proyectos/${proy.ProyectoID}`)}
                actions={
                  canEdit && canDelete
                    ? [
                        <Tooltip title="Editar" key="edit">
                          <EditOutlined
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditModal({ visible: true, proyecto: proy });
                              form.setFieldsValue({
                                nombre_proyecto: proy.NombreProyecto,
                                descripcion: proy.descripcion,
                                area_id: proy.area,
                                usuario_propietario_id:
                                  proy.UsuarioPropietarioID,
                                rango: [
                                  proy.FechaInicio
                                    ? dayjs(proy.FechaInicio)
                                    : null,
                                  proy.FechaFin ? dayjs(proy.FechaFin) : null,
                                ].filter(Boolean),
                              });
                            }}
                          />
                        </Tooltip>,
                        <Popconfirm
                          title="¿Eliminar proyecto?"
                          onConfirm={(e) => {
                            e.stopPropagation();
                            handleDelete(proy.ProyectoID);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          key="delete"
                        >
                          <DeleteOutlined />
                        </Popconfirm>,
                      ]
                    : []
                }
              >
                <div className="project-card-body">
                  <Text type="secondary">{proy.area}</Text>
                  <Title level={4}>{proy.NombreProyecto}</Title>
                  <Text>{proy.descripcion?.slice(0, 80)}…</Text>

                  <Progress
                    percent={progresoPorProyecto[proy.ProyectoID]}
                    showInfo
                    status="active"
                    strokeWidth={8}
                    trailColor="#eee"
                    strokeColor={{ from: "#108ee9", to: "#87d068" }}
                    style={{ margin: "8px 0" }}
                  />

                  <Row justify="space-between" align="middle">
                    <Text type="secondary">
                      {
                        tareas.filter((t) => t.ProyectoID === proy.ProyectoID)
                          .length
                      }{" "}
                      tareas
                    </Text>
                  </Row>

                  <Avatar.Group
                    maxCount={4}
                    size="small"
                    style={{ marginTop: 12 }}
                  >
                    {(responsablesPorProyecto[proy.ProyectoID] || []).map(
                      (u) => (
                        <Tooltip key={u.UsuarioID} title={u.NombreCompleto}>
                          <Avatar icon={!u.avatarUrl && <UserOutlined />} />
                        </Tooltip>
                      )
                    )}
                  </Avatar.Group>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Modales */}
=======
      {/* Modal editar */}
>>>>>>> Stashed changes
      <Modal
        title={`Editar proyecto ${editing?.ProyectoID ?? ""}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => {
          if (!editing) return;
          const payload = {
            nombre: formProyecto.Nombre,
            estado: formProyecto.Estado || "pendiente",
            usuario_responsable_id: formProyecto.ResponsableID || null,
            fecha_inicio: formProyecto.FechaInicio
              ? formProyecto.FechaInicio.format("YYYY-MM-DD")
              : null,
            fecha_fin: formProyecto.FechaFin
              ? formProyecto.FechaFin.format("YYYY-MM-DD")
              : null,
            descripcion: formProyecto.Descripcion || "",
            imagen_url: formProyecto.ImagenURL || null,
            proyecto_padre_id: formProyecto.ProyectoPadreID || null,
          };
          editarM.mutate({ id: editing.ProyectoID, data: payload });
        }}
        styles={{ body: { paddingTop: 8 } }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Input
            placeholder="Nombre"
            value={formProyecto.Nombre}
            onChange={(e) =>
              setFormProyecto((f) => ({ ...f, Nombre: e.target.value }))
            }
          />
          <Select
            placeholder="Estado"
            value={formProyecto.Estado}
            onChange={(v) => setFormProyecto((f) => ({ ...f, Estado: v }))}
            allowClear
          >
            {["pendiente", "en_progreso", "detenido", "terminado"].map((e) => (
              <Option key={e} value={e}>
                {e.replace("_", " ")}
              </Option>
            ))}
          </Select>
          <Select
            showSearch
            placeholder="Responsable"
            value={formProyecto.ResponsableID}
            onChange={(v) =>
              setFormProyecto((f) => ({ ...f, ResponsableID: v }))
            }
            options={responsablesOptions}
            allowClear
          />
          <DatePicker
            placeholder="Inicio"
            value={formProyecto.FechaInicio}
            onChange={(d) => setFormProyecto((f) => ({ ...f, FechaInicio: d }))}
            style={{ width: "100%" }}
          />
          <DatePicker
            placeholder="Fin"
            value={formProyecto.FechaFin}
            onChange={(d) => setFormProyecto((f) => ({ ...f, FechaFin: d }))}
            style={{ width: "100%" }}
          />
          <Input.TextArea
            rows={3}
            placeholder="Descripción"
            value={formProyecto.Descripcion}
            onChange={(e) =>
              setFormProyecto((f) => ({ ...f, Descripcion: e.target.value }))
            }
          />
          <Input
            placeholder="URL de imagen (opcional)"
            value={formProyecto.ImagenURL}
            onChange={(e) =>
              setFormProyecto((f) => ({ ...f, ImagenURL: e.target.value }))
            }
          />
          <Select
            allowClear
            placeholder="Proyecto padre (opcional)"
            value={formProyecto.ProyectoPadreID}
            onChange={(v) =>
              setFormProyecto((f) => ({ ...f, ProyectoPadreID: v }))
            }
            options={opcionesPadre}
          />
        </Space>
      </Modal>
    </div>
  );
}
