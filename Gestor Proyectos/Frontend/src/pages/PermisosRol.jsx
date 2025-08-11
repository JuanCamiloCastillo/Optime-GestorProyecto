import React, { useEffect, useState } from "react";
import { Table, Switch, Button, message, Input, Space } from "antd";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function PermisosRol() {
  const [permisos, setPermisos] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nuevoPermisoPorRol, setNuevoPermisoPorRol] = useState({});
  const [editandoPermisoId, setEditandoPermisoId] = useState(null);
  const [nuevoRolNombre, setNuevoRolNombre] = useState("");

  const nav = useNavigate();
  const userSGP = JSON.parse(localStorage.getItem("userSGP")) || {};
  const permisosSGP = JSON.parse(localStorage.getItem("permisosSGP")) || {};

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPermisos, resRoles] = await Promise.all([
        api.get("/permisos-rol/"),
        api.get("/roles/"),
      ]);

      const permisosConNombre = resPermisos.data.map((permiso) => {
        const rol = resRoles.data.find((r) => r.RolID === permiso.RolID);
        return {
          ...permiso,
          NombreRol: rol ? rol.NombreRol : "Sin Nombre",
        };
      });

      setPermisos(permisosConNombre);
      setRoles(resRoles.data);
    } catch (error) {
      console.error(error);
      message.error("Error cargando permisos o roles");
    } finally {
      setLoading(false);
    }
  };

  const agruparPorRol = () => {
    const rolesMap = {};

    // Inicializar todos los roles aunque no tengan permisos
    roles.forEach((rol) => {
      rolesMap[rol.RolID] = {
        RolID: rol.RolID,
        NombreRol: rol.NombreRol,
        modulos: [],
      };
    });

    // Agregar permisos existentes
    permisos.forEach((permiso) => {
      if (rolesMap[permiso.RolID]) {
        rolesMap[permiso.RolID].modulos.push(permiso);
      }
    });

    return Object.values(rolesMap);
  };

  const handleSwitchChange = (rolId, modulo, field, value) => {
    setPermisos((prev) =>
      prev.map((permiso) =>
        permiso.RolID === rolId && permiso.Modulo === modulo
          ? { ...permiso, [field]: value }
          : permiso
      )
    );
  };

  const handleActualizarPermiso = async (permiso) => {
    try {
      const payload = {
        modulo: permiso.Modulo,
        rol_id: permiso.RolID,
        crear: permiso.Crear,
        editar: permiso.Editar,
        eliminar: permiso.Eliminar,
        seleccionar: permiso.Seleccionar,
      };
      await api.put(`/permisos-rol/${permiso.PermisoModuloID}`, payload);
      message.success("Permisos actualizados");
      setEditandoPermisoId(null);
      fetchData();
    } catch (error) {
      message.error("Error al actualizar permisos");
    }
  };

  const handleAgregarPermiso = async (rolId) => {
    const permiso = nuevoPermisoPorRol[rolId];
    if (!permiso || !permiso.Modulo)
      return message.warning("Ingrese el nombre del módulo");

    try {
      await api.post("/permisos-rol/", {
        rol_id: rolId,
        modulo: permiso.Modulo,
        crear: permiso.Crear || false,
        editar: permiso.Editar || false,
        eliminar: permiso.Eliminar || false,
        seleccionar: permiso.Seleccionar || false,
      });
      message.success("Permiso creado");
      setNuevoPermisoPorRol((prev) => ({ ...prev, [rolId]: {} }));
      fetchData();
    } catch {
      message.error("Error al crear permiso");
    }
  };

  const handleCrearRol = async () => {
    if (!nuevoRolNombre) return;
    try {
      await api.post("/roles/", { nombre_rol: nuevoRolNombre });
      setNuevoRolNombre("");
      await fetchData();
      message.success("Rol creado");
    } catch {
      message.error("Error al crear rol");
    }
  };

  const expandedRowRender = (record) => {
    const permisoNuevo = nuevoPermisoPorRol[record.RolID] || {
      Modulo: "",
      Crear: false,
      Editar: false,
      Eliminar: false,
      Seleccionar: false,
    };

    const columnas = [
      { title: "Módulo", dataIndex: "Modulo", key: "Modulo" },
      {
        title: "Crear",
        render: (_, permiso) =>
          editandoPermisoId === `${permiso.RolID}-${permiso.Modulo}` ? (
            <Switch
              checked={permiso.Crear}
              onChange={(val) =>
                handleSwitchChange(permiso.RolID, permiso.Modulo, "Crear", val)
              }
            />
          ) : (
            <Switch checked={permiso.Crear} disabled />
          ),
      },
      {
        title: "Editar",
        render: (_, permiso) =>
          editandoPermisoId === `${permiso.RolID}-${permiso.Modulo}` ? (
            <Switch
              checked={permiso.Editar}
              onChange={(val) =>
                handleSwitchChange(permiso.RolID, permiso.Modulo, "Editar", val)
              }
            />
          ) : (
            <Switch checked={permiso.Editar} disabled />
          ),
      },
      {
        title: "Eliminar",
        render: (_, permiso) =>
          editandoPermisoId === `${permiso.RolID}-${permiso.Modulo}` ? (
            <Switch
              checked={permiso.Eliminar}
              onChange={(val) =>
                handleSwitchChange(
                  permiso.RolID,
                  permiso.Modulo,
                  "Eliminar",
                  val
                )
              }
            />
          ) : (
            <Switch checked={permiso.Eliminar} disabled />
          ),
      },
      {
        title: "Seleccionar",
        render: (_, permiso) =>
          editandoPermisoId === `${permiso.RolID}-${permiso.Modulo}` ? (
            <Switch
              checked={permiso.Seleccionar}
              onChange={(val) =>
                handleSwitchChange(
                  permiso.RolID,
                  permiso.Modulo,
                  "Seleccionar",
                  val
                )
              }
            />
          ) : (
            <Switch checked={permiso.Seleccionar} disabled />
          ),
      },
      {
        title: "Acciones",
        key: "acciones",
        render: (_, permiso) => {
          // Si es fila nueva, mostramos "Crear"
          if (permiso.isNew) {
            return (
              <Button
                type="primary"
                loading={loading}
                onClick={() => handleAgregarPermiso(permiso.RolID)}
              >
                Crear
              </Button>
            );
          }
          // Para filas existentes, alternamos Editar/Guardar
          const id = `${permiso.RolID}-${permiso.Modulo}`;
          return editandoPermisoId === id ? (
            <Button
              type="primary"
              loading={loading}
              onClick={() => handleActualizarPermiso(permiso)}
            >
              Guardar
            </Button>
          ) : (
            <Button onClick={() => setEditandoPermisoId(id)}>Editar</Button>
          );
        },
      },
    ];

    const dataWithInputRow = [
      ...record.modulos,
      {
        RolID: record.RolID,
        Modulo: (
          <Input
            placeholder="Nuevo módulo"
            value={permisoNuevo.Modulo}
            onChange={(e) =>
              setNuevoPermisoPorRol((prev) => ({
                ...prev,
                [record.RolID]: { ...permisoNuevo, Modulo: e.target.value },
              }))
            }
          />
        ),
        Crear: (
          <Switch
            checked={permisoNuevo.Crear}
            onChange={(val) =>
              setNuevoPermisoPorRol((prev) => ({
                ...prev,
                [record.RolID]: { ...permisoNuevo, Crear: val },
              }))
            }
          />
        ),
        Editar: (
          <Switch
            checked={permisoNuevo.Editar}
            onChange={(val) =>
              setNuevoPermisoPorRol((prev) => ({
                ...prev,
                [record.RolID]: { ...permisoNuevo, Editar: val },
              }))
            }
          />
        ),
        Eliminar: (
          <Switch
            checked={permisoNuevo.Eliminar}
            onChange={(val) =>
              setNuevoPermisoPorRol((prev) => ({
                ...prev,
                [record.RolID]: { ...permisoNuevo, Eliminar: val },
              }))
            }
          />
        ),
        Seleccionar: (
          <Switch
            checked={permisoNuevo.Seleccionar}
            onChange={(val) =>
              setNuevoPermisoPorRol((prev) => ({
                ...prev,
                [record.RolID]: { ...permisoNuevo, Seleccionar: val },
              }))
            }
          />
        ),
        key: "nuevo",
        Acciones: (
          <Button
            type="primary"
            onClick={() => handleAgregarPermiso(record.RolID)}
          >
            Guardar
          </Button>
        ),
        key: `${record.RolID}-nuevo`,
        isNew: true,
      },
    ];

    return (
      <Table
        columns={columnas}
        dataSource={dataWithInputRow}
        rowKey={(record) => record.Modulo || "nuevo"}
        pagination={false}
      />
    );
  };

  const groupedData = agruparPorRol();

  if (userSGP.NombreRol?.toUpperCase() !== "ADMINISTRADOR")
    return <div>No autorizado</div>;
  if (!permisosSGP.VerPermisosRol)
    return <div>No tiene permiso para ver esta sección</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Permisos por Rol</h2>

      <Table
        dataSource={[
          ...groupedData,
          {
            RolID: "nuevo",
            NombreRol: (
              <Input
                placeholder="Nombre del nuevo rol"
                value={nuevoRolNombre}
                onChange={(e) => setNuevoRolNombre(e.target.value)}
              />
            ),
          },
        ]}
        columns={[
          {
            title: "Rol",
            dataIndex: "NombreRol",
            key: "NombreRol",
            render: (text, record) =>
              record.RolID === "nuevo" ? (
                <Space>
                  {text}
                  <Button type="primary" onClick={handleCrearRol}>
                    Crear
                  </Button>
                </Space>
              ) : (
                `${record.RolID} - ${record.NombreRol}`
              ),
          },
        ]}
        rowKey={(record) => record.RolID}
        expandable={{
          expandedRowRender: (record) =>
            record.RolID === "nuevo" ? null : expandedRowRender(record),
        }}
        pagination={true}
        loading={loading}
       
        size="small"
        bordered
      />
    </div>
  );
}
