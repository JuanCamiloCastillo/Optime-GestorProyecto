import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Card,
  Modal,
  Form,
  Input,
  Progress,
  message,
  Spin,
  Tag
} from 'antd';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { CalendarOutlined, CommentOutlined, UserOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import './TareaKanban.css';

const ESTADOS = [
  { key: 'pendiente',   label: 'Detenido', color: '#f5222d' },
  { key: 'en_progreso', label: 'En curso', color: '#faad14' },
  { key: 'terminado',   label: 'Listo',    color: '#52c41a' }
];

export default function TareaKanban({ proyectoId }) {
  const qc = useQueryClient();
  const [commentModal, setCommentModal] = useState({ visible: false, tarea: null });
  const [commentForm] = Form.useForm();

  const { data: tareas = [], isLoading } = useQuery(
    ['tareas', proyectoId],
    () => api.get('/tareas/').then(res => res.data.filter(t => t.ProyectoID === Number(proyectoId)))
  );

  const actualizarTarea = useMutation(
    tarea => api.put(`/tareas/${tarea.tarea_id}`, tarea),
    {
      onMutate: async tarea => {
        await qc.cancelQueries(['tareas', proyectoId]);
        const prev = qc.getQueryData(['tareas', proyectoId]);

        qc.setQueryData(['tareas', proyectoId], old =>
          old.map(t => t.TareaID === tarea.tarea_id ? { ...t, Estado: tarea.estado } : t)
        );

        return { prev };
      },
      onError: (_err, _tarea, ctx) => {
        if (ctx?.prev) {
          qc.setQueryData(['tareas', proyectoId], ctx.prev);
        }
        message.error('Error actualizando tarea');
      },
      onSuccess: () => message.success('Estado actualizado'),
      onSettled: () => qc.invalidateQueries(['tareas', proyectoId])
    }
  );

  const comentarTarea = useMutation(
    ({ id, texto }) => api.post(`/tareas/${id}/comentarios`, { texto }),
    {
      onSuccess: () => {
        message.success('Comentario agregado');
        qc.invalidateQueries(['tareas', proyectoId]);
        setCommentModal({ visible: false, tarea: null });
        commentForm.resetFields();
      }
    }
  );

  const onDragEnd = result => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const tarea = tareas.find(t => String(t.TareaID) === draggableId);
    if (!tarea) return;

    const nuevoEstado = ESTADOS[Number(destination.droppableId)].key;

    if (tarea.Estado !== nuevoEstado) {
      actualizarTarea.mutate({
        tarea_id: tarea.TareaID,
        proyecto_id: tarea.ProyectoID,
        titulo: tarea.Titulo,
        descripcion: tarea.Descripcion || '',
        estado: nuevoEstado,
        porcentaje_avance: tarea.PorcentajeAvance || 0,
        prioridad: { Baja:1, Media:2, Alta:3, Crítica:4 }[tarea.prioridad] || 2,
        fecha_inicio: tarea.FechaInicio,
        fecha_limite: tarea.FechaLimite,
        usuario_asignados: tarea.usuario_asignados || [],
        comentarios: tarea.comentarios || null,
        antecesora: tarea.antecesora || null
      });
    }
  };

  const openComment = tarea => setCommentModal({ visible: true, tarea });
  const closeComment = () => { setCommentModal({ visible: false, tarea: null }); commentForm.resetFields(); };

  if (isLoading) return <Spin style={{ margin: 50 }} />;

  return (
    <div className="kanban-container">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board" style={{ display: 'flex', gap: '16px', overflowX: 'auto' }}>
          {ESTADOS.map((col, idx) => (
            <Droppable droppableId={`${idx}`} key={col.key}>
              {provided => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    flex: '0 0 320px',
                    background: '#f0f2f5',
                    padding: '8px',
                    borderRadius: '6px',
                    minHeight: '200px'
                  }}
                >
                  <div style={{
                    background: col.color,
                    color: '#fff',
                    padding: '8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '16px',
                    textAlign: 'center',
                    marginBottom: '12px'
                  }}>
                    {col.label} ({tareas.filter(t => t.Estado === col.key).length})
                  </div>

                  {tareas.filter(t => t.Estado === col.key).map((t, i) => (
                    <Draggable key={t.TareaID} draggableId={`${t.TareaID}`} index={i}>
                      {prov => (
                        <Card
                          hoverable
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          style={{
                            marginBottom: '12px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '6px' }}>{t.Titulo}</div>
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                            <Tag color={col.color}>{col.label}</Tag>
                            <Tag icon={<CalendarOutlined />}>{dayjs(t.FechaLimite).format('DD MMM')}</Tag>
                            <Tag>{t.prioridad}</Tag>
                          </div>
                          <Progress percent={t.PorcentajeAvance} size="small" />
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '10px'
                          }}>
                            <span><UserOutlined /> <strong>{t.UsuarioAsignado || 'Sin asignar'}</strong></span>
                            <CommentOutlined onClick={() => openComment(t)} style={{ cursor: 'pointer' }} />
                          </div>
                        </Card>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <Modal
        title={commentModal.tarea ? `Comentar: ${commentModal.tarea.Titulo}` : 'Comentar'}
        visible={commentModal.visible}
        onCancel={closeComment}
        onOk={() => comentarTarea.mutate({
          id: commentModal.tarea.TareaID,
          texto: commentForm.getFieldValue('texto')
        })}
      >
        <Form form={commentForm} layout="vertical">
          <Form.Item name="texto" rules={[{ required: true, message: 'Ingresa tu comentario' }]}>
            <Input.TextArea rows={4} placeholder="Escribe tu comentario aquí" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
