import React, { useState, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Progress,
  Avatar,
  Tooltip,
  Spin,
  Typography,
  Modal,
  Upload,
  message,
  Form,
  Input,
  DatePicker,
  Select,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import dayjs from "dayjs";
import "./Proyectos.css";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function Proyectos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // ✅ NUEVO
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModal, setEditModal] = useState({
    visible: false,
    proyecto: null,
  });
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);

  const userSGP = JSON.parse(localStorage.getItem("userSGP") || "{}");
  const idRol = Number(userSGP?.RolID) || null;
  const idUsuario = Number(userSGP?.UsuarioID) || null;
  const areaUsuario = userSGP?.area || "";

  const permisosModuloSGP = JSON.parse(
    localStorage.getItem("permisosModuloSGP") || "[]"
  );
  // Busca el permiso para este módulo
  const permisoProyecto =
    permisosModuloSGP.find((p) => p.Modulo === "Proyectos.jsx") || {};
  const canCreate = permisoProyecto.Crear === true;
  const canEdit = permisoProyecto.Editar === true;
  const canDelete = permisoProyecto.Eliminar === true;

  const { data: proyectos = [], isLoading: loadingP } = useQuery(
    "proyectos",
    () => api.get("/proyectos/").then((r) => r.data || [])
  );

  const { data: tareas = [], isLoading: loadingT } = useQuery("tareas", () =>
    api.get("/tareas/").then((r) => r.data || [])
  );

  const { data: usuarios = [], isLoading: loadingU } = useQuery(
    "usuarios",
    () => api.get("/usuarios/").then((r) => r.data || [])
  );

  const { data: areas = [], isLoading: loadingA } = useQuery("areas", () =>
    api.get("/areas/").then((r) => r.data || [])
  );
  const proyectosVisibles = useMemo(() => {
    const visibles =
      JSON.parse(localStorage.getItem("proyectosVisiblesSGP")) || [];
    return proyectos.filter((p) => visibles.includes(p.ProyectoID));
  }, [proyectos]);

  const responsablesPorProyecto = useMemo(() => {
    const map = {};
    tareas.forEach((t) => {
      const pid = t.ProyectoID;
      map[pid] = map[pid] || new Set();
      (t.usuario_asignados || []).forEach((uid) => map[pid].add(uid));
    });
    return Object.fromEntries(
      Object.entries(map).map(([pid, set]) => [
        pid,
        Array.from(set)
          .map((uid) => usuarios.find((u) => u.UsuarioID === uid))
          .filter(Boolean),
      ])
    );
  }, [tareas, usuarios]);

  const progresoPorProyecto = useMemo(() => {
    const map = {};
    proyectos.forEach((p) => {
      const tasks = tareas.filter((t) => t.ProyectoID === p.ProyectoID);
      if (tasks.length) {
        const total = tasks.reduce(
          (sum, t) => sum + (t.PorcentajeAvance || 0),
          0
        );
        map[p.ProyectoID] = Math.round(total / tasks.length);
      } else {
        map[p.ProyectoID] = 0;
      }
    });
    return map;
  }, [proyectos, tareas]);

  // 1) Controla si puede ver TODO (rol presidente, admin…)
  const permisosSGP = JSON.parse(localStorage.getItem("permisosSGP") || "{}");
  const canViewAll = permisosSGP.VerTodosProyectos === true;

  // 2) Calcula recursivamente el subtree de áreas donde es responsable
  const allowedAreaIds = useMemo(() => {
    if (canViewAll) return new Set(areas.map((a) => a.idArea));

    const childrenMap = areas.reduce((m, a) => {
      (m[a.ParentAreaID] = m[a.ParentAreaID] || []).push(a.idArea);
      return m;
    }, {});

    const roots = areas
      .filter((a) => a.ResponsableID === idUsuario)
      .map((a) => a.idArea);

    const result = new Set();
    function dfs(id) {
      if (result.has(id)) return;
      result.add(id);
      (childrenMap[id] || []).forEach(dfs);
    }
    roots.forEach(dfs);

    return result;
  }, [areas, idUsuario, canViewAll]);

  // 3) Nuevo useMemo que reemplaza al viejo proyectosFiltrados
  const proyectosFiltrados = useMemo(() => {
    if (canViewAll) return proyectos;

    // a) Propios
    const own = proyectos.filter((p) => p.UsuarioPropietarioID === idUsuario);

    // b) Participados (tareas asignadas)
    const part = proyectos.filter((p) =>
      (responsablesPorProyecto[p.ProyectoID] || []).some(
        (u) => u.UsuarioID === idUsuario
      )
    );

    // c) Organizacionales (están en sus áreas)
    const org = proyectos.filter((p) => allowedAreaIds.has(p.area));

    // Unión sin duplicados
    const seen = new Set();
    return [...own, ...part, ...org].filter((p) => {
      if (seen.has(p.ProyectoID)) return false;
      seen.add(p.ProyectoID);
      return true;
    });
  }, [
    proyectos,
    responsablesPorProyecto,
    allowedAreaIds,
    idUsuario,
    canViewAll,
  ]);

  if (loadingP || loadingT || loadingU || loadingA) {
    return <Spin style={{ margin: 50 }} />;
  }

  const handleCreate = async (values) => {
    try {
      const payload = {
        nombre_proyecto: values.nombre_proyecto,
        descripcion: values.descripcion,
        area_id: values.area_id,
        fecha_inicio: values.rango[0].format("YYYY-MM-DD"),
        fecha_fin: values.rango[1].format("YYYY-MM-DD"),
        usuario_propietario_id: values.usuario_propietario_id,
      };
      await api.post("/proyectos/", payload);
      message.success("Proyecto creado");

      // ✅ Refresca lista de proyectos
      queryClient.invalidateQueries("proyectos");

      setCreateModalVisible(false);
      form.resetFields();
    } catch {
      message.error("Error al crear proyecto");
    }
  };

  const handleEdit = async (values) => {
    try {
      const { proyecto } = editModal;
      const payload = {
        proyecto_id: proyecto.ProyectoID,
        nombre_proyecto: values.nombre_proyecto,
        descripcion: values.descripcion,
        area_id: values.area_id,
        fecha_inicio: values.rango[0].format("YYYY-MM-DD"),
        fecha_fin: values.rango[1].format("YYYY-MM-DD"),
        usuario_propietario_id: values.usuario_propietario_id,
      };
      await api.put(`/proyectos/${proyecto.ProyectoID}`, payload);

      if (fileList.length) {
        const formData = new FormData();
        formData.append("proyecto_id", proyecto.ProyectoID);
        formData.append("file", fileList[0]);
        await api.post("/proyectos/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      message.success("Proyecto actualizado");

      // ✅ Refresca lista de proyectos
      queryClient.invalidateQueries("proyectos");

      setEditModal({ visible: false, proyecto: null });
      form.resetFields();
      setFileList([]);
    } catch {
      message.error("Error al actualizar proyecto");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/proyectos/${id}`);
      message.success("Proyecto eliminado");
      queryClient.invalidateQueries("proyectos"); // ✅ También refetch
    } catch {
      message.error("Error al eliminar proyecto");
    }
  };

  return (
    <div className="proyectos-page">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Proyectos
        </Title>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setCreateModalVisible(true);
            }}
          >
            Crear Proyecto
          </Button>
        )}
      </Row>
      <div style={{ maxHeight: "65vh", overflowY: "auto", paddingRight: 8 }}>
        <Row gutter={[16, 16]}>
        {proyectosVisibles.map((proy) => (
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
                              area_id: proy.AreaID,
                              usuario_propietario_id: proy.UsuarioPropietarioID,
                              rango: [
                                dayjs(proy.FechaInicio),
                                dayjs(proy.FechaFin),
                              ],
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
                  {(responsablesPorProyecto[proy.ProyectoID] || []).map((u) => (
                    <Tooltip key={u.UsuarioID} title={u.NombreCompleto}>
                      <Avatar icon={!u.avatarUrl && <UserOutlined />} />
                    </Tooltip>
                  ))}
                </Avatar.Group>
              </div>
            </Card>
          </Col>
        ))}
        </Row>
      </div>

      {/* Modales */}
      <Modal
        title="Crear Proyecto"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="nombre_proyecto"
            label="Nombre"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="descripcion"
            label="Descripción"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="area_id" label="Área" rules={[{ required: true }]}>
            <Select placeholder="Selecciona un área">
              {areas.map((a) => (
                <Option key={a.idArea} value={a.idArea}>
                  {a.nombreArea}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="usuario_propietario_id"
            label="Usuario Propietario"
            rules={[{ required: true }]}
          >
            <Select placeholder="Selecciona un usuario">
              {usuarios.map((u) => (
                <Option key={u.UsuarioID} value={u.UsuarioID}>
                  {u.NombreCompleto}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="rango" label="Fechas" rules={[{ required: true }]}>
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Crear
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Editar Proyecto"
        open={editModal.visible}
        onCancel={() => {
          setEditModal({ visible: false, proyecto: null });
          form.resetFields();
          setFileList([]);
        }}
        footer={null}
      >
        {editModal.proyecto && (
          <>
            <div style={{ marginBottom: 16, textAlign: "center" }}>
              <img
                src={
                  editModal.proyecto.imagen ||
                  "/assets/imagenes/default-project.jpg"
                }
                alt={editModal.proyecto.NombreProyecto}
                style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 4 }}
              />
            </div>
            <Form form={form} layout="vertical" onFinish={handleEdit}>
              <Form.Item
                name="nombre_proyecto"
                label="Nombre"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="descripcion"
                label="Descripción"
                rules={[{ required: true }]}
              >
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item
                name="area_id"
                label="Área"
                rules={[{ required: true }]}
              >
                <Select>
                  {areas.map((a) => (
                    <Option key={a.idArea} value={a.idArea}>
                      {a.nombreArea}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="usuario_propietario_id"
                label="Usuario Propietario"
                rules={[{ required: true }]}
              >
                <Select>
                  {usuarios.map((u) => (
                    <Option key={u.UsuarioID} value={u.UsuarioID}>
                      {u.NombreCompleto}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="rango"
                label="Fechas"
                rules={[{ required: true }]}
              >
                <RangePicker />
              </Form.Item>
              <Form.Item label="Imagen del Proyecto (opcional)">
                <Upload
                  beforeUpload={(file) => {
                    setFileList([file]);
                    return false;
                  }}
                  fileList={fileList}
                  onRemove={() => setFileList([])}
                >
                  <Button icon={<UploadOutlined />}>Seleccionar imagen</Button>
                </Upload>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Guardar
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
