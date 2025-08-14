import React, { useMemo, useState } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Statistic,
  Modal,
  Table,
  Input,
  Button,
  Space,
  Select,
  Tag,
  Drawer
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useQuery } from "react-query";
import api from "../services/api";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { allowedColors } from "../assets/colors/colors";

dayjs.extend(isBetween);

const { Text } = Typography;
const { Column } = Table;
const { Option } = Select;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  return (
    <Card size="small" style={{ pointerEvents: "none" }}>
      <Text strong>{data.payload.name}</Text>
      <div style={{ marginTop: 4 }}>
        <Text>
          <Text strong>{data.value}</Text> Tareas
        </Text>
      </div>
    </Card>
  );
};

function getColumnSearchProps(dataIndex) {
  return {
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Buscar ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={confirm}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={confirm}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Buscar
          </Button>
          <Button onClick={clearFilters} size="small" style={{ width: 90 }}>
            Resetear
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
  };
}

export default function Dashboard() {
  const {
    data: tareas = [],
    isLoading: loadingT,
    isError: errorT,
  } = useQuery("tareas", () => api.get("/tareas/").then((r) => r.data));
  const {
    data: usuarios = [],
    isLoading: loadingU,
    isError: errorU,
  } = useQuery("usuarios", () => api.get("/usuarios/").then((r) => r.data));
  const {
    data: proyectos = [],
    isLoading: loadingP,
    isError: errorP,
  } = useQuery("proyectos", () => api.get("/proyectos/").then((r) => r.data));
  const { data: estadosTarea = [] } = useQuery("estadosTarea", () =>
    api.get("/estados-tarea/").then((r) => r.data)
  );
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

  const userSGP = JSON.parse(localStorage.getItem("userSGP")) || {};
  const idRol = userSGP.RolID;
  const nombreRol = userSGP.NombreRol?.toUpperCase();
  const idUsuario = userSGP.UsuarioID;
  const areaUsuario = userSGP.area || "";
  const [selectedProjects, setSelectedProjects] = useState([]);

  // Estado para controlar si usamos Modal o Drawer
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 768);

  // Escuchar cambios de tamaño de ventana
  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width <= 1024 || height <= 600);
      setIsSmallScreen(width <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tareasFiltradas = useMemo(() => {
    const visibles =
      JSON.parse(localStorage.getItem("proyectosVisiblesSGP")) || [];

    let tareasBase = [];

    if (!Array.isArray(tareas)) return [];

    // Filtramos por proyectos visibles desde el localStorage
    tareasBase = tareas.filter((t) => visibles.includes(t.ProyectoID));

    // Filtro adicional por proyectos seleccionados manualmente
    if (selectedProjects.length > 0) {
      tareasBase = tareasBase.filter((t) =>
        selectedProjects.includes(t.ProyectoID)
      );
    }

    return tareasBase;
  }, [tareas, selectedProjects]);

  const proyectosFiltrados = useMemo(() => {
    if (!Array.isArray(proyectos)) return [];

    const visibles =
      JSON.parse(localStorage.getItem("proyectosVisiblesSGP")) || [];

    return proyectos.filter((p) => visibles.includes(Number(p.ProyectoID)));
  }, [proyectos]);

  const nombrePorId = useMemo(() => {
    if (!Array.isArray(usuarios)) return {};
    return usuarios.reduce(
      (m, u) => ({ ...m, [u.UsuarioID]: u.NombreCompleto }),
      {}
    );
  }, [usuarios]);

  const proyectoPorId = useMemo(() => {
    if (!Array.isArray(proyectosFiltrados)) return {};
    return proyectosFiltrados.reduce(
      (m, p) => ({ ...m, [p.ProyectoID]: p.NombreProyecto }),
      {}
    );
  }, [proyectosFiltrados]);

  const [filterPeriod, setFilterPeriod] = useState("all");
  const VencimientoTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <Card size="small" style={{ pointerEvents: "none" }}>
        <Text strong>{label}</Text>
        <div style={{ marginTop: 4 }}>
          {payload.map((item, i) => (
            <div key={i}>
              <Text strong style={{ color: item.fill }}>
                {item.name || item.dataKey}:
              </Text>{" "}
              <Text>{item.value} tareas</Text>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const filterByDate = (t) => {
    if (filterPeriod === "all") return true;
    const fecha = dayjs(t.FechaLimite);
    const hoy = dayjs();
    if (filterPeriod === "today") return fecha.isSame(hoy, "day");
    if (filterPeriod === "tomorrow")
      return fecha.isSame(hoy.add(1, "day"), "day");
    if (filterPeriod === "week")
      return fecha.isBetween(
        hoy.startOf("week"),
        hoy.endOf("week"),
        null,
        "[]"
      );
    if (filterPeriod === "month") return fecha.isSame(hoy, "month");
    return true;
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ title: "", data: [] });

  const {
    estados,
    pieData,
    porResponsable,
    vencidasPorEstado,
    porVencimiento,
  } = useMemo(() => {
    const estadoCount = {};
    const vencidasCount = {};
    const sched = {};
    const countResp = {};
    const hoy = dayjs();

    tareasFiltradas.forEach((t) => {
      if (filterByDate(t)) {
        estadoCount[t.Estado] = (estadoCount[t.Estado] || 0) + 1;
        t.usuario_asignados?.forEach((id) => {
          const key = nombrePorId[id] || "Sin asignar";
          countResp[key] = (countResp[key] || 0) + 1;
        });
      }
      if (
        dayjs(t.FechaLimite).isBefore(hoy, "day") &&
        t.Estado !== "terminado"
      ) {
        vencidasCount[t.Estado] = (vencidasCount[t.Estado] || 0) + 1;
      }
      const f = dayjs(t.FechaLimite).format("DD MMM");

      const estadoObj = estadosTarea.find(
        (e) => e.estadoFront === t.Estado?.toLowerCase()
      );

      // Si es terminado o no existe, ignorar
      if (!estadoObj || estadoObj.estadoFront === "terminado") return;

      // Inicializa si no existe
      if (!sched[f]) sched[f] = { date: f };

      // Suma al estado correspondiente
      const estadoKey = estadoObj.estadoFront;
      sched[f][estadoKey] = (sched[f][estadoKey] || 0) + 1;
    });

    const estados = Object.entries(estadoCount).map(
      ([estadoKey, value], i) => ({
        estadoKey, // ← el estado como viene de backend ("pendiente", "en_progreso", etc.)
        value,
      })
    );

    const pieData = estados.map(({ estadoKey, value }) => ({
      name: estadosMeta[estadoKey]?.label || estadoKey,
      value,
      fill: estadosMeta[estadoKey]?.color || allowedColors[0],
    }));

    const porResponsable = Object.entries(countResp).map(
      ([name, value], i) => ({
        name,
        value,
        fill: allowedColors[i % allowedColors.length],
      })
    );
    const vencidasPorEstado = Object.entries(vencidasCount).map(
      ([estado, value]) => ({
        estado,
        name: estadosMeta[estado]?.label || estado, // <-- agregas esta línea (name)
        value,
        fill: estadosMeta[estado]?.color || allowedColors[0],
      })
    );

    const porVencimiento = Object.values(sched).sort(
      (a, b) =>
        dayjs(a.date, "DD MMM").valueOf() - dayjs(b.date, "DD MMM").valueOf()
    );

    return {
      estados,
      pieData,
      porResponsable,
      vencidasPorEstado,
      porVencimiento,
    };
  }, [tareasFiltradas, nombrePorId, filterPeriod]);

  if (loadingT || loadingU || loadingP) return <Spin style={{ margin: 50 }} />;
  if (errorT || errorU || errorP)
    return <Text type="danger">Error cargando datos</Text>;

  const handleChartClick = (filtro, tipo) => {
    let dataFiltrada = [];

    if (tipo === "estado") {
      dataFiltrada = tareasFiltradas.filter((t) => t.Estado === filtro);
    } else if (tipo === "responsable") {
      dataFiltrada = tareasFiltradas.filter((t) =>
        (t.usuario_asignados || []).some((id) => nombrePorId[id] === filtro)
      );
    } else if (tipo === "vencidas") {
      dataFiltrada = tareasFiltradas.filter(
        (t) =>
          dayjs(t.FechaLimite).isBefore(dayjs(), "day") &&
          t.Estado === filtro &&
          t.Estado !== "terminado"
      );
    } else if (tipo === "vencimiento") {
      dataFiltrada = tareasFiltradas.filter(
        (t) =>
          dayjs(t.FechaLimite).format("DD MMM") === filtro &&
          t.Estado !== "terminado"
      );
    }

    setModalData({
      title: `Tareas filtradas por ${tipo}: ${filtro}`,
      data: dataFiltrada,
    });
    setModalVisible(true);
  };

  // Componente de tabla responsive
  const TareasTable = ({ data, title }) => (
    <div>
      <Text strong style={{ marginBottom: 16, display: 'block' }}>{title}</Text>
      <Table
        dataSource={data}
        rowKey="TareaID"
        pagination={isMobile ? {
          pageSize: isSmallScreen ? 6 : 8,
          size: 'small',
          simple: true,
          showLessItems: true
        } : {
          pageSize: 5,
          size: 'default',
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} tareas`,
          pageSizeOptions: ['5', '10', '20', '50']
        }}
        scroll={{ x: isMobile ? 900 : false }}
        size={isMobile ? 'small' : 'middle'}
      >
        <Column
          title="Tarea"
          dataIndex="Titulo"
          key="Titulo"
          width={isMobile ? (isSmallScreen ? 120 : 140) : 200}
          ellipsis={true}
          {...getColumnSearchProps("Titulo")}
          render={(text) => (
            <div style={{
              wordBreak: 'break-word',
              whiteSpace: isMobile ? 'nowrap' : 'normal',
              overflow: isMobile ? 'hidden' : 'visible',
              textOverflow: isMobile ? 'ellipsis' : 'clip',
              fontSize: isSmallScreen ? '11px' : '12px'
            }}>
              {text}
            </div>
          )}
        />
        <Column
          title="Proyecto"
          dataIndex="ProyectoID"
          key="ProyectoID"
          width={isMobile ? (isSmallScreen ? 100 : 120) : 150}
          ellipsis={true}
          render={(id) => (
            <div style={{
              wordBreak: 'break-word',
              whiteSpace: isMobile ? 'nowrap' : 'normal',
              overflow: isMobile ? 'hidden' : 'visible',
              textOverflow: isMobile ? 'ellipsis' : 'clip',
              fontSize: isSmallScreen ? '11px' : '12px'
            }}>
              {proyectoPorId[id] || "Sin asignar"}
            </div>
          )}
        />
        <Column
          title="Responsable"
          dataIndex="usuario_asignados"
          key="Responsable"
          width={isMobile ? (isSmallScreen ? 100 : 120) : 150}
          ellipsis={true}
          render={(ids) => (
            <div style={{
              wordBreak: 'break-word',
              whiteSpace: isMobile ? 'nowrap' : 'normal',
              overflow: isMobile ? 'hidden' : 'visible',
              textOverflow: isMobile ? 'ellipsis' : 'clip',
              fontSize: isSmallScreen ? '11px' : '12px'
            }}>
              {(ids || [])
                .map((id) => nombrePorId[id])
                .filter((n) => n)
                .join(", ") || "Sin asignar"}
            </div>
          )}
        />
        <Column
          title="Inicio"
          dataIndex="FechaInicio"
          key="FechaInicio"
          width={isMobile ? (isSmallScreen ? 70 : 80) : 110}
          render={(d) => (
            <span style={{ fontSize: isSmallScreen ? '10px' : '12px' }}>
              {dayjs(d).format(isMobile ? "DD/MM" : "DD MMM YYYY")}
            </span>
          )}
        />
        <Column
          title="Fin"
          dataIndex="FechaLimite"
          key="FechaLimite"
          width={isMobile ? (isSmallScreen ? 70 : 80) : 110}
          render={(d) => (
            <span style={{ fontSize: isSmallScreen ? '10px' : '12px' }}>
              {dayjs(d).format(isMobile ? "DD/MM" : "DD MMM YYYY")}
            </span>
          )}
        />
        <Column
          title="Estado"
          dataIndex="Estado"
          key="Estado"
          width={isMobile ? (isSmallScreen ? 60 : 70) : 100}
          render={(e) => (
            <Tag
              color={estadosMeta[e]?.color}
              style={{
                fontSize: isSmallScreen ? '9px' : '10px',
                padding: isSmallScreen ? '1px 4px' : '2px 6px'
              }}
            >
              {isMobile ?
                (estadosMeta[e]?.label || e).substring(0, isSmallScreen ? 4 : 6) + (isSmallScreen ? '' : '...') :
                (estadosMeta[e]?.label || e)
              }
            </Tag>
          )}
        />
        <Column
          title="Prioridad"
          dataIndex="prioridad"
          key="prioridad"
          width={isMobile ? (isSmallScreen ? 50 : 60) : 100}
          render={(text) => (
            <span style={{ fontSize: isSmallScreen ? '10px' : '12px' }}>
              {text}
            </span>
          )}
        />
      </Table>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <Row gutter={[16, 16]} justify="center" style={{ marginBottom: 24 }}>
        {estados.map((s, i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <Card
              hoverable
              onClick={() => handleChartClick(s.estadoKey, "estado")}
              style={{
                backgroundColor:
                  estadosMeta[s.estadoKey]?.color ||
                  allowedColors[i % allowedColors.length],
                borderRadius: 8,
                textAlign: "center",
                minHeight: isMobile ? 80 : 100,
              }}
              bodyStyle={{ padding: isMobile ? 12 : 16 }}
            >
              <Text style={{
                color: "#fff",
                fontSize: isMobile ? 10 : 12,
                display: "block"
              }}>
                {estadosMeta[s.estadoKey]?.label || s.estadoKey}
              </Text>
              <Statistic
                value={s.value}
                valueStyle={{
                  color: "#fff",
                  fontSize: isMobile ? 20 : 28,
                  fontWeight: "bold"
                }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={16}>
          <Text strong>Filtrar por proyecto:</Text>
          <Select
            mode="multiple"
            allowClear
            placeholder="Selecciona proyecto(s)"
            value={selectedProjects}
            onChange={setSelectedProjects}
            style={{ width: "100%" }}
            size={isMobile ? 'small' : 'middle'}
          >
            {proyectosFiltrados.map((p) => (
              <Option key={p.ProyectoID} value={p.ProyectoID}>
                {p.NombreProyecto}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Filtrar vencimiento:</Text>
          <Select
            value={filterPeriod}
            onChange={setFilterPeriod}
            style={{ width: "100%" }}
            size={isMobile ? 'small' : 'middle'}
          >
            <Option value="all">Todas las fechas</Option>
            <Option value="today">Hoy</Option>
            <Option value="tomorrow">Mañana</Option>
            <Option value="week">Esta semana</Option>
            <Option value="month">Este mes</Option>
          </Select>
        </Col>
      </Row>
      <div style={{ maxHeight: "55vh", overflowY: "auto", overflowX: "hidden", paddingRight: 5 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Tareas por estado">
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
                <PieChart
                  onClick={(e) => handleChartClick(e.activeLabel, "estado")}
                >
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? "60%" : "80%"}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.fill ||
                          allowedColors[index % allowedColors.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: isMobile ? '10px' : '12px' }}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Tareas por responsable">
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
                <BarChart
                  data={porResponsable}
                  onClick={(e) => handleChartClick(e.activeLabel, "responsable")}
                >
                  <XAxis
                    dataKey="name"
                    angle={-90}
                    textAnchor="end"
                    interval={0}
                    height={isMobile ? 100 : 120}
                    tick={{ dx: -6, fontSize: isMobile ? 8 : 10 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: isMobile ? 8 : 10 }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="value">
                    {porResponsable.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Tareas vencidas por estado">
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
                <BarChart
                  data={vencidasPorEstado}
                  onClick={(e) => handleChartClick(e.activeLabel, "vencidas")}
                >
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={isMobile ? -60 : 0}
                    height={isMobile ? 80 : 60}
                    tick={{ fontSize: isMobile ? 8 : 10 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: isMobile ? 8 : 10 }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="value">
                    {vencidasPorEstado.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Tareas por vencimiento">
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
                <BarChart
                  data={porVencimiento}
                  barSize={isMobile ? 25 : 45}
                  barCategoryGap={-15}
                  onClick={(e) => handleChartClick(e.activeLabel, "vencimiento")}
                >
                  <XAxis
                    dataKey="date"
                    angle={-90}
                    textAnchor="end"
                    interval={0}
                    height={isMobile ? 100 : 120}
                    tick={{ dx: -5, fontSize: isMobile ? 7 : 9 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: isMobile ? 8 : 10 }} />
                  <RechartsTooltip content={<VencimientoTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: isMobile ? '8px' : '12px' }}
                  />
                  {Array.from(
                    new Set(
                      porVencimiento.flatMap((d) =>
                        Object.keys(d).filter((k) => k !== "date" && d[k] > 0)
                      )
                    )
                  ).map((estadoKey, i) => {
                    const estado = estadosTarea.find(
                      (e) => e.estadoFront === estadoKey
                    );
                    return (
                      <Bar
                        key={estadoKey}
                        dataKey={estadoKey}
                        name={estado?.etiqueta || estadoKey}
                        fill={
                          estado?.colorHex ||
                          allowedColors[i % allowedColors.length]
                        }
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Modal para Desktop */}
      {!isMobile && (
        <Modal
          open={modalVisible}
          title={modalData.title}
          footer={null}
          onCancel={() => setModalVisible(false)}
          width="90%"
          style={{ top: 20 }}
        >
          <TareasTable data={modalData.data} title="" />
        </Modal>
      )}

      {/* Drawer para Mobile*/}
      {isMobile && (
        <Drawer
          title={
            <div style={{
              fontSize: isSmallScreen ? '14px' : '16px',
              wordBreak: 'break-word'
            }}>
              {modalData.title}
            </div>
          }
          placement="bottom"
          onClose={() => setModalVisible(false)}
          open={modalVisible}
          height={isSmallScreen ? "90vh" : "85vh"}
          bodyStyle={{
            padding: isSmallScreen ? 8 : 16,
            paddingBottom: isSmallScreen ? 60 : 16
          }}
        >
          <TareasTable data={modalData.data} title="" />
        </Drawer>
      )}
    </div>
  );
}