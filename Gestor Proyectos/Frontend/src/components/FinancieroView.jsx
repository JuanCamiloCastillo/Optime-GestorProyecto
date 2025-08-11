import React, { useMemo } from 'react';
import { Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

// Formateador COP
const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0
});

export default function FinancieroView({ tareas = [], usuarios = [] }) {
  // 1️⃣ Calcular métricas por usuario
  const dataSource = useMemo(() => {
    return usuarios.map(u => {
      const tareasUsuario = tareas.filter(t =>
        (t.usuario_asignados || []).includes(u.UsuarioID)
      );

      let horasPlaneadas = 0;
      let horasReales = 0;

      tareasUsuario.forEach(t => {
        const dias = dayjs(t.FechaLimite).diff(dayjs(t.FechaInicio), 'day') + 1;
        const planeadas = dias * 8; // 8h por día
        const reales = (planeadas * (Number(t.PorcentajeAvance) || 0)) / 100;

        horasPlaneadas += planeadas;
        horasReales += reales;
      });

      const tasaHora = Number(u.tasaHora) || 0;
      const costoPlaneado = horasPlaneadas * tasaHora;
      const costoReal = horasReales * tasaHora;
      const productividad = horasPlaneadas ? (horasReales / horasPlaneadas) * 100 : 0;
      const participacion = Number(u.participacion) || 100;

      return {
        key: u.UsuarioID,
        nombre: u.NombreCompleto,
        correo: u.Correo,
        rol: u.RolID,
        participacion,
        tasaHora,
        horasPlaneadas,
        horasReales,
        costoPlaneado,
        costoReal,
        productividad
      };
    });
  }, [tareas, usuarios]);

  // 2️⃣ Totales proyecto
  const totalProyecto = useMemo(() => {
    return dataSource.reduce(
      (acc, u) => {
        acc.horasPlaneadas += u.horasPlaneadas;
        acc.horasReales += u.horasReales;
        acc.costoPlaneado += u.costoPlaneado;
        acc.costoReal += u.costoReal;
        return acc;
      },
      { horasPlaneadas: 0, horasReales: 0, costoPlaneado: 0, costoReal: 0 }
    );
  }, [dataSource]);

  // 3️⃣ Columnas
  const columns = [
    { title: 'ID', dataIndex: 'key' },
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Correo', dataIndex: 'correo' },
    { title: 'RolID', dataIndex: 'rol' },
    {
      title: 'Participación',
      dataIndex: 'participacion',
      render: v => `${Number(v).toFixed(0)}%`
    },
    {
      title: 'Tasa Hora',
      dataIndex: 'tasaHora',
      render: v => formatoCOP.format(Number(v))
    },
    {
      title: 'Horas Planeadas',
      dataIndex: 'horasPlaneadas',
      render: v => Number(v).toFixed(1)
    },
    {
      title: 'Horas Reales',
      dataIndex: 'horasReales',
      render: v => Number(v).toFixed(1)
    },
    {
      title: 'Costo Planeado',
      dataIndex: 'costoPlaneado',
      render: v => formatoCOP.format(Number(v))
    },
    {
      title: 'Costo Real',
      dataIndex: 'costoReal',
      render: v => formatoCOP.format(Number(v))
    },
    {
      title: 'Productividad Financiera',
      dataIndex: 'productividad',
      render: v => `${Number(v).toFixed(1)}%`
    }
  ];

  return (
    <div>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={5}>
              <Text strong>Totales del Proyecto</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5}>
              <Tag color="blue">—</Tag>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={6}>
              {totalProyecto.horasPlaneadas.toFixed(1)}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7}>
              {totalProyecto.horasReales.toFixed(1)}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={8}>
              {formatoCOP.format(totalProyecto.costoPlaneado)}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={9}>
              {formatoCOP.format(totalProyecto.costoReal)}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={10}>—</Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      <div style={{ marginTop: 24 }}>
        <Text strong>Notas:</Text>
        <p>• Todos los valores están expresados en pesos colombianos (COP).</p>
        <p>• Los costos se calculan con la tasa hora de cada recurso.</p>
        <p>• Si no tiene tasa, se asume $0.</p>
        <p>• La productividad es horas reales dividido horas planeadas.</p>
      </div>
    </div>
  );
}
