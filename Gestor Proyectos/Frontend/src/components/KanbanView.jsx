import React, { useState } from 'react';
import './KanbanView.css';
import { Avatar, Tooltip, Modal, Button, Tag, Progress, Space, Upload } from 'antd';
import { UserOutlined, MessageOutlined, UploadOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function KanbanView({ tasks, usuarios }) {
  const [tareas, setTareas] = useState(tasks);
  const [comentarioTask, setComentarioTask] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState('');

  const porHacer = tareas.filter(t => t.PorcentajeAvance === 0);
  const enProgreso = tareas.filter(t => t.PorcentajeAvance > 0 && t.PorcentajeAvance < 100);
  const hechas = tareas.filter(t => t.PorcentajeAvance === 100);

  const lookupName = uid => {
    const u = usuarios.find(x => x.UsuarioID === uid);
    return u ? u.NombreCompleto : '—';
  };

  const handleGuardarComentario = async () => {
    if (!comentarioTask) return;

    let nombreUsuario = 'SinNombre';
    try {
      const userRaw = localStorage.getItem('userSGP');
      if (userRaw) {
        const user = JSON.parse(userRaw);
        nombreUsuario = user.Nombre || 'SinNombre';
      }
    } catch {}

    const nuevo = {
      nombre: nombreUsuario,
      fecha: new Date().toISOString(),
      texto: nuevoComentario
    };

    let comentariosActualizados = [];
    try {
      comentariosActualizados = JSON.parse(comentarioTask.comentarios || '[]');
      if (!Array.isArray(comentariosActualizados)) comentariosActualizados = [];
    } catch {
      comentariosActualizados = [];
    }

    comentariosActualizados.push(nuevo);

    try {
      await api.put(`/tareas/${comentarioTask.TareaID}`, {
        tarea_id: comentarioTask.TareaID,
        proyecto_id: comentarioTask.ProyectoID,
        titulo: comentarioTask.Titulo,
        descripcion: comentarioTask.Descripcion,
        estado: comentarioTask.Estado,
        usuario_asignados: comentarioTask.usuario_asignados,
        fecha_inicio: comentarioTask.FechaInicio,
        fecha_limite: comentarioTask.FechaLimite,
        porcentaje_avance: comentarioTask.PorcentajeAvance,
        prioridad: { Baja:1, Media:2, Alta:3, Crítica:4 }[comentarioTask.prioridad] || 2,
        comentarios: JSON.stringify(comentariosActualizados),
        antecesora: comentarioTask.antecesora
      });

      setNuevoComentario('');
      setComentarios(comentariosActualizados);
      setComentarioTask(prev => ({
        ...prev,
        comentarios: JSON.stringify(comentariosActualizados)
      }));

      setTareas(prev =>
        prev.map(t =>
          t.TareaID === comentarioTask.TareaID
            ? { ...t, comentarios: JSON.stringify(comentariosActualizados) }
            : t
        )
      );
    } catch (error) {
      console.error('Error guardando comentario:', error);
    }
  };

  const renderComentarios = (comentariosRaw) => {
    if (!comentariosRaw) return null;
    try {
      const parsed = JSON.parse(comentariosRaw);
      if (Array.isArray(parsed)) {
        return parsed.map((comentario, index) => (
          <div key={index} style={{ marginBottom: 16, padding: 12, background: "#f8f8f8", borderRadius: 6 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
              {comentario.nombre || '—'} · {dayjs(comentario.fecha).format("YYYY-MM-DD HH:mm")}
            </div>
            <div className="comentario-render" dangerouslySetInnerHTML={{ __html: comentario.texto || '' }} />
          </div>
        ));
      }
    } catch {}

    const esHTML = comentariosRaw.trim().startsWith('<') && comentariosRaw.trim().endsWith('>');
    if (esHTML) {
      return (
        <div style={{ marginBottom: 16, padding: 12, background: "#f8f8f8", borderRadius: 6 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Comentario sin estructura</div>
          <div className="comentario-render" dangerouslySetInnerHTML={{ __html: comentariosRaw }} />
        </div>
      );
    }

    return (
      <div style={{ marginBottom: 16, padding: 12, background: "#f8f8f8", borderRadius: 6 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Comentario sin estructura</div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{comentariosRaw}</pre>
      </div>
    );
  };

  const handleImageUpload = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
        setNuevoComentario(prev => prev + `<img src="${e.target.result}" />`);
      };
      reader.readAsDataURL(file);
    });
  };

  const Column = ({ title, items, color }) => (
    <div className="kanban-column">
      <div className="kanban-column-header" style={{ backgroundColor: color }}>
        {title} ({items.length})
      </div>
      <div className="kanban-tasks">
        {items.map(t => (
          <div key={t.TareaID} className="kanban-card">
            <strong>{t.Titulo}</strong>
            <Space style={{ margin: '8px 0' }} wrap>
              <Tag>{t.Estado}</Tag>
              <Tag>{dayjs(t.FechaLimite).format('D/MM/YYYY')}</Tag>
              <Tag>{t.prioridad}</Tag>
            </Space>
            <Progress percent={t.PorcentajeAvance} size="small" />
            <Space style={{ marginTop: 8 }}>
              {(t.usuario_asignados || []).map(uid => (
                <Tooltip key={uid} title={lookupName(uid)}>
                  <Avatar size="small">{lookupName(uid).split(' ').map(n => n[0]).join('')}</Avatar>
                </Tooltip>
              ))}
              {!(t.usuario_asignados || []).length && <Avatar size="small" icon={<UserOutlined />} />}
            </Space>
            <div style={{ marginTop: 8, textAlign: 'right' }}>
              <Tooltip title="Comentarios">
                <Button
                  type="text"
                  size="small"
                  icon={<MessageOutlined />}
                  onClick={() => {
                    setComentarioTask(t);
                    setComentarios(JSON.parse(t.comentarios || '[]'));
                  }}
                >
                  {(() => {
                    try {
                      return JSON.parse(t.comentarios || '[]').length;
                    } catch {
                      return 0;
                    }
                  })()}
                </Button>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="kanban-board">
      <Column title="Por hacer" items={porHacer} color="#ddd" />
      <Column title="En progreso" items={enProgreso} color="#f5a623" />
      <Column title="Hechas" items={hechas} color="#00c851" />

      <Modal
        title={`Comentarios de "${comentarioTask?.Titulo}"`}
        open={!!comentarioTask}
        onCancel={() => {
          setComentarioTask(null);
          setNuevoComentario('');
          setComentarios([]);
        }}
        onOk={handleGuardarComentario}
        okText="Guardar"
      >
        {renderComentarios(comentarioTask?.comentarios)}
        <br />
        <Upload
          showUploadList={false}
          customRequest={({ file, onSuccess }) => {
            handleImageUpload(file).then(() => onSuccess("ok"));
          }}
        >
          <Button icon={<UploadOutlined />}> Subir Imagen </Button>
        </Upload>
        <ReactQuill
          theme="snow"
          value={nuevoComentario}
          onChange={setNuevoComentario}
          placeholder="Escribe un comentario... "
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
}
