import React, { useMemo, useState } from 'react';
import {
  Table, Tag, Modal, List, Typography, Button,
  Form, Input, Select, message, Space, Popconfirm
} from 'antd';
import { useQuery, useMutation } from 'react-query';
import api from '../services/api';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isoWeek);
dayjs.extend(isSameOrBefore);

const { Text } = Typography;
const { Option } = Select;

const festivosColombia2025 = [
  '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18',
  '2025-05-01', '2025-06-02', '2025-06-23', '2025-06-30',
  '2025-07-20', '2025-08-07', '2025-08-18', '2025-10-14',
  '2025-11-04', '2025-11-11', '2025-12-08', '2025-12-25'
];

export default function RecursosView({ tareas = [], usuarios = [] }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSemana, setModalSemana] = useState('');
  const [modalTareas, setModalTareas] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form] = Form.useForm();

  const { data: roles = [] } = useQuery('roles', () =>
    api.get('/roles/').then(r => r.data)
  );

  const crearM = useMutation(datos => api.post('/usuarios/', datos), {
    onSuccess: () => {
      message.success('Recurso creado');
      setFormVisible(false);
    },
    onError: () => message.error('Error al crear recurso')
  });

  const editarM = useMutation(({ id, ...datos }) =>
    api.put(`/usuarios/${id}`, datos), {
    onSuccess: () => {
      message.success('Recurso editado');
      setFormVisible(false);
    },
    onError: () => message.error('Error al editar recurso')
  });

  const eliminarM = useMutation(id =>
    api.delete(`/usuarios/${id}`), {
    onSuccess: () => {
      message.success('Recurso eliminado');
    },
    onError: () => message.error('Error al eliminar recurso')
  });

  const data = useMemo(() => {
    if (!Array.isArray(usuarios) || !Array.isArray(tareas) || !Array.isArray(roles)) return [];

    return usuarios.map(user => {
      const userTareas = tareas.filter(t =>
        Array.isArray(t.usuario_asignados) && t.usuario_asignados.includes(user.UsuarioID)
      );

      const horasPorSemana = new Map();

      userTareas.forEach(t => {
        let curr = dayjs(t.FechaInicio);
        const end = dayjs(t.FechaLimite);

        while (curr.isSameOrBefore(end, 'day')) {
          const weekKey = `${curr.isoWeekYear()}-W${curr.isoWeek()}`;
          const isFestivo = festivosColombia2025.includes(curr.format('YYYY-MM-DD'));
          const dia = curr.day();

          let horas = 0;
          if (isFestivo || dia === 0) {
            horas = 0;
          } else if (dia === 6) {
            horas = 4;
          } else {
            horas = 8;
          }

          if (horas > 0) {
            const prev = horasPorSemana.get(weekKey) || { horas: 0, tareas: [] };
            prev.horas += horas;
            if (!prev.tareas.includes(t)) prev.tareas.push(t);
            horasPorSemana.set(weekKey, prev);
          }

          curr = curr.add(1, 'day');
        }
      });

      const participacion = (user.participacion != null && user.participacion > 0) ? user.participacion : 100;
      const maxHoras = (participacion / 100) * 42;

      const exceso = [];
      horasPorSemana.forEach((v, week) => {
        if (v.horas > maxHoras) {
          exceso.push({
            week,
            value: (v.horas - maxHoras).toFixed(1),
            tareas: v.tareas
          });
        }
      });

      const horasPlaneadas = Array.from(horasPorSemana.values()).reduce((sum, v) => sum + v.horas, 0);
      const horasReales = horasPlaneadas * 0.85;
      const productividad = horasPlaneadas > 0 ? ((horasReales / horasPlaneadas) * 100).toFixed(1) : '0';

      const rolObj = roles.find(r => r.RolID === user.RolID);
      const nombreRol = rolObj ? rolObj.NombreRol : 'Sin rol';

      return {
        key: user.UsuarioID,
        id: user.UsuarioID,
        nombre: user.NombreCompleto,
        correo: user.Correo,
        rol: nombreRol,
        participacion: `${participacion}%`,
        tasaHora: user.tasaHora != null ? `$${user.tasaHora}` : '—',
        horasP: horasPlaneadas.toFixed(1),
        horasR: horasReales.toFixed(1),
        exceso,
        productividad,
        raw: user
      };
    });
  }, [usuarios, tareas, roles]);

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: 'Nombre Completo', dataIndex: 'nombre' },
    { title: 'Correo', dataIndex: 'correo' },
    { title: 'Rol', dataIndex: 'rol' },
    { title: 'Participación', dataIndex: 'participacion' },
    {
      title: 'Productividad',
      dataIndex: 'productividad',
      render: p => `${p}%`
    },
    {
      title: 'Acciones',
      render: (_, rec) => (
        <Space>
          <Button size="small" onClick={() => {
            setEditRecord(rec.raw);
            form.setFieldsValue({
              nombre: rec.nombre,
              correo: rec.correo,
              rol: roles.find(r => r.NombreRol === rec.rol)?.RolID,
              participacion: rec.raw.participacion,
              tasaHora: rec.raw.tasaHora
            });
            setFormVisible(true);
          }}>Editar</Button>
          <Popconfirm
            title="¿Seguro de eliminar?"
            onConfirm={() => eliminarM.mutate(rec.id)}
          >
            <Button size="small" danger>Eliminar</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => {
          setEditRecord(null);
          form.resetFields();
          setFormVisible(true);
        }}>
          Crear recurso
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        expandable={{
          expandedRowRender: record => (
            <>
              <p><Text strong>Horas Planeadas/Reales:</Text> {record.horasP} / {record.horasR}</p>
              <p><Text strong>Sobrecarga:</Text>{' '}
                {record.exceso.length > 0 ? (
                  record.exceso.map((e, idx) => (
                    <Tag
                      key={idx}
                      color="red"
                      style={{ cursor: 'pointer', marginBottom: '4px' }}
                      onClick={() => {
                        setModalSemana(e.week);
                        setModalTareas(e.tareas);
                        setModalVisible(true);
                      }}
                    >
                      +{e.value}h {e.week}
                    </Tag>
                  ))
                ) : (
                  <Tag color="green">OK</Tag>
                )}
              </p>
              <p><Text strong>Tasa Hora:</Text> {record.tasaHora}</p>
            </>
          )
        }}
        pagination={false}
        scroll={{ x: true }}
      />

      <Modal
        title={`Tareas con Sobrecarga (${modalSemana})`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <List
          dataSource={modalTareas}
          renderItem={t => (
            <List.Item>
              <div>
                <strong>{t.Titulo}</strong><br />
                {t.FechaInicio} - {t.FechaLimite}
              </div>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title={editRecord ? 'Editar Recurso' : 'Crear Recurso'}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        onOk={async () => {
          try {
            const vals = await form.validateFields();
            if (editRecord) {
              editarM.mutate({
                id: editRecord.UsuarioID,
                Correo: vals.correo,
                NombreCompleto: vals.nombre,
                RolID: vals.rol,
                participacion: vals.participacion || null,
                tasaHora: vals.tasaHora || null
              });
            } else {
              crearM.mutate({
                Correo: vals.correo,
                NombreCompleto: vals.nombre,
                RolID: vals.rol,
                participacion: vals.participacion || null,
                tasaHora: vals.tasaHora || null
              });
            }
            form.resetFields();
          } catch {}
        }}
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="Nombre completo" name="nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Correo" name="correo" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Rol" name="rol" rules={[{ required: true }]}>
            <Select>
              {roles.map(r => <Option key={r.RolID} value={r.RolID}>{r.NombreRol}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Participación (%)" name="participacion">
            <Input type="number" min={0} max={100} />
          </Form.Item>
          <Form.Item label="Tasa Hora" name="tasaHora">
            <Input type="number" min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
