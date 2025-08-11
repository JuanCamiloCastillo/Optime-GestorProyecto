import React from 'react';
import { Modal, Form, Input, DatePicker } from 'antd';
import './ProyectoForm.css';

export default function ProyectoForm({ visible, onCancel, onCreate, initialValues }) {
  const [form] = Form.useForm();
  return (
    <Modal
      title={initialValues ? 'Editar Proyecto' : 'Nuevo Proyecto'}
      open={visible}
      onCancel={onCancel}
      onOk={() => {
        form
          .validateFields()
          .then(values => {
            onCreate({
              ...initialValues,
              ...values,
              fecha_inicio: values.fecha_inicio.format('YYYY-MM-DD'),
              fecha_fin: values.fecha_fin && values.fecha_fin.format('YYYY-MM-DD')
            });
            form.resetFields();
          })
          .catch(() => {});
      }}
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item name="nombre_proyecto" label="Nombre" rules={[{ required: true }]}> <Input /> </Form.Item>
        <Form.Item name="fecha_inicio" label="Fecha inicio" rules={[{ required: true }]}> <DatePicker /> </Form.Item>
        <Form.Item name="fecha_fin" label="Fecha fin"> <DatePicker /> </Form.Item>
        <Form.Item name="usuario_propietario_id" label="ID Propietario" rules={[{ required: true }]}> <Input type="number" /> </Form.Item>
      </Form>
    </Modal>
  );
}
