// src/components/ChartView.jsx
import React, { useState, useMemo } from 'react';
import {
  Input,
  Select,
  Popover,
  Checkbox,
  Space,
  Modal,
  Card,
  Tag,
  Progress
} from 'antd';
import { FilterOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import dayjs from 'dayjs';
import { allowedColors } from '../assets/colors/colors';

const { Option } = Select;

export default function ChartView({ tasks = [], usuarios = [] }) {
  const allCols = [
    { label: 'Nombre', value: 'name' },
    { label: 'Responsable', value: 'responsables' },
    { label: 'Estado', value: 'estado' },
    { label: 'Vencimiento', value: 'vencimiento' },
    { label: 'Prioridad', value: 'prioridad' },
    { label: 'Cronograma', value: 'cronograma' },
  ];
  const [searchCols, setSearchCols] = useState(allCols.map(c => c.value));
  const [searchText, setSearchText] = useState('');
  const [persona, setPersona] = useState(null);

  const [selectedEstado, setSelectedEstado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const enriched = useMemo(() => {
    return tasks.map(t => ({
      ...t,
      name: t.Titulo,
      estado: t.Estado,
      responsables: (t.usuario_asignados || [])
        .map(uid => usuarios.find(u => u.UsuarioID === uid)?.NombreCompleto || '')
        .join(', '),
      vencimiento: dayjs(t.FechaLimite).format('DD MMM YYYY'),
      prioridad: t.prioridad,
      cronograma: `${dayjs(t.FechaInicio).format('DD MMM')} – ${dayjs(t.FechaLimite).format('DD MMM')}`,
      progreso: t.PorcentajeAvance || 0
    }));
  }, [tasks, usuarios]);

  const filtered = useMemo(() => {
    return enriched.filter(t => {
      if (persona && !t.responsables.split(', ').includes(persona)) {
        return false;
      }
      if (searchText) {
        const txt = searchText.toLowerCase();
        return searchCols.some(col =>
          String(t[col] || '').toLowerCase().includes(txt)
        );
      }
      return true;
    });
  }, [enriched, persona, searchText, searchCols]);

  const chartData = useMemo(() => {
    const acc = {};
    filtered.forEach(t => {
      acc[t.estado] = (acc[t.estado] || 0) + 1;
    });
    return Object.entries(acc).map(([estado, count]) => ({ estado, count }));
  }, [filtered]);

  const handleBarClick = estado => {
    setSelectedEstado(estado);
    setModalVisible(true);
  };

  const popContent = (
    <Checkbox.Group
      options={allCols}
      value={searchCols}
      onChange={setSearchCols}
    >
      <Space direction="vertical" style={{ padding: '4px 0' }} />
    </Checkbox.Group>
  );

  const tareasModal = filtered.filter(t => t.estado === selectedEstado);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar..."
          allowClear
          onSearch={setSearchText}
          style={{ width: 200 }}
        />
        <Select
          placeholder="Persona"
          allowClear
          style={{ width: 140 }}
          onChange={setPersona}
          suffixIcon={<UserOutlined />}
        >
          {usuarios.map(u => (
            <Option key={u.UsuarioID} value={u.NombreCompleto}>
              {u.NombreCompleto}
            </Option>
          ))}
        </Select>
        <Popover content={popContent} title="Elige columnas" trigger="click">
          <FilterOutlined style={{ fontSize: 16, cursor: 'pointer' }} />
        </Popover>
      </Space>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="estado" />
          <YAxis allowDecimals={false} />
          <RechartTooltip
            wrapperStyle={{
              backgroundColor: '#fff',
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          />
          <Bar dataKey="count">
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={allowedColors[i % allowedColors.length]}
                cursor="pointer"
                onClick={() => handleBarClick(entry.estado)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <Modal
        title={`Tareas en estado: ${selectedEstado || ''}`}
        open={modalVisible}
        footer={null}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        {tareasModal.map(t => (
          <Card
            key={t.TareaID}
            style={{ marginBottom: 16 }}
            hoverable
          >
            <h3>{t.Titulo}</h3>
            <Space size="small" wrap>
              <Tag color="blue">{t.estado}</Tag>
              <Tag icon={<CalendarOutlined />}>{t.vencimiento}</Tag>
              <Tag>{t.prioridad}</Tag>
            </Space>
            <div style={{ marginTop: 8 }}>
              <strong>Responsables:</strong> {t.responsables || 'Sin asignar'}
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Progreso:</strong>
              <Progress percent={t.progreso} size="small" />
            </div>
          </Card>
        ))}
        {!tareasModal.length && <p>No hay tareas en este estado.</p>}
      </Modal>
    </div>
  );
}
