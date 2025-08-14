import React, { useState, useEffect, useCallback } from 'react';
import './KanbanView.css';
import { Avatar, Tooltip, Modal, Button, Tag, Progress, Space, Upload, message } from 'antd';
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
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      setIsTablet(width > 768 && width <= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Filtros optimizados
  const porHacer = tareas.filter(t => t.PorcentajeAvance === 0);
  const enProgreso = tareas.filter(t => t.PorcentajeAvance > 0 && t.PorcentajeAvance < 100);
  const hechas = tareas.filter(t => t.PorcentajeAvance === 100);

  const lookupName = useCallback((uid) => {
    const u = usuarios.find(x => x.UsuarioID === uid);
    return u ? u.NombreCompleto : '—';
  }, [usuarios]);

  const getInitials = useCallback((name) => {
    return name.split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }, []);

  const handleGuardarComentario = async () => {
    if (!comentarioTask || !nuevoComentario.trim()) {
      message.warning('Por favor escribe un comentario');
      return;
    }

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

      message.success('Comentario guardado correctamente');
    } catch (error) {
      console.error('Error guardando comentario:', error);
      message.error('Error al guardar el comentario');
    }
  };

  const renderComentarios = (comentariosRaw) => {
    if (!comentariosRaw) return null;
    
    try {
      const parsed = JSON.parse(comentariosRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((comentario, index) => (
          <div key={index} style={{ 
            marginBottom: isMobile ? 12 : 16, 
            padding: isMobile ? 10 : 14, 
            background: "#f8f8f8", 
            borderRadius: 8,
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ 
              fontWeight: 'bold', 
              marginBottom: 6,
              fontSize: isMobile ? '12px' : '14px',
              color: '#1890ff'
            }}>
              {comentario.nombre || '—'} • {dayjs(comentario.fecha).format(isMobile ? "DD/MM HH:mm" : "DD/MM/YYYY HH:mm")}
            </div>
            <div className="comentario-render" dangerouslySetInnerHTML={{ __html: comentario.texto || '' }} />
          </div>
        ));
      }
    } catch {}

    const esHTML = comentariosRaw.trim().startsWith('<') && comentariosRaw.trim().endsWith('>');
    if (esHTML) {
      return (
        <div style={{ 
          marginBottom: isMobile ? 12 : 16, 
          padding: isMobile ? 10 : 14, 
          background: "#f8f8f8", 
          borderRadius: 8,
          border: '1px solid #f0f0f0'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: 6,
            fontSize: isMobile ? '12px' : '14px',
            color: '#888'
          }}>
            Comentario sin estructura
          </div>
          <div className="comentario-render" dangerouslySetInnerHTML={{ __html: comentariosRaw }} />
        </div>
      );
    }

    return (
      <div style={{ 
        marginBottom: isMobile ? 12 : 16, 
        padding: isMobile ? 10 : 14, 
        background: "#f8f8f8", 
        borderRadius: 8,
        border: '1px solid #f0f0f0'
      }}>
        <div style={{ 
          fontWeight: 'bold', 
          marginBottom: 6,
          fontSize: isMobile ? '12px' : '14px',
          color: '#888'
        }}>
          Comentario sin estructura
        </div>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-word',
          fontSize: isMobile ? '12px' : '14px',
          margin: 0
        }}>
          {comentariosRaw}
        </pre>
      </div>
    );
  };

  const handleImageUpload = async (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    const isLt2M = file.size / 1024 / 1024 < 2;
    
    if (!isJpgOrPng) {
      message.error('Solo puedes subir archivos JPG/PNG');
      return;
    }
    if (!isLt2M) {
      message.error('La imagen debe ser menor a 2MB');
      return;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
        setNuevoComentario(prev => prev + `<br><img src="${e.target.result}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0;" />`);
        message.success('Imagen añadida al comentario');
      };
      reader.readAsDataURL(file);
    });
  };

  const getCommentCount = (comentariosRaw) => {
    try {
      const parsed = JSON.parse(comentariosRaw || '[]');
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getPriorityColor = (prioridad) => {
    switch(prioridad) {
      case 'Crítica': return 'red';
      case 'Alta': return 'orange';
      case 'Media': return 'blue';
      case 'Baja': return 'green';
      default: return 'default';
    }
  };

  const formatDate = (date) => {
    const now = dayjs();
    const taskDate = dayjs(date);
    
    if (isMobile) {
      return taskDate.format('DD/MM');
    } else if (isTablet) {
      return taskDate.format('DD/MM/YY');
    } else {
      return taskDate.format('DD/MM/YYYY');
    }
  };

  const getMaxVisibleUsers = () => {
    if (isMobile) return 2;
    if (isTablet) return 3;
    return 4;
  };

  const Column = ({ title, items, color }) => (
    <div className="kanban-column">
      <div className="kanban-column-header" style={{ backgroundColor: color }}>
        {title} ({items.length})
      </div>
      <div className="kanban-tasks">
        {items.map(t => {
          const maxUsers = getMaxVisibleUsers();
          const comentariosCount = getCommentCount(t.comentarios);
          
          return (
            <div key={t.TareaID} className="kanban-card">
              <div className="kanban-card-title">
                <Tooltip title={t.Titulo} placement="topLeft">
                  {isMobile ? truncateText(t.Titulo, 50) : 
                   isTablet ? truncateText(t.Titulo, 70) : t.Titulo}
                </Tooltip>
              </div>
              
              <div className="kanban-card-tags">
                <Tag size={isMobile ? 'small' : 'default'} color="blue">
                  {t.Estado}
                </Tag>
                <Tag size={isMobile ? 'small' : 'default'} color="default">
                  {formatDate(t.FechaLimite)}
                </Tag>
                <Tag 
                  size={isMobile ? 'small' : 'default'}
                  color={getPriorityColor(t.prioridad)}
                >
                  {t.prioridad}
                </Tag>
              </div>
              
              <div className="kanban-card-progress">
                <Progress 
                  percent={t.PorcentajeAvance} 
                  size={isMobile ? 'small' : 'default'}
                  showInfo={!isMobile}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                {isMobile && (
                  <div style={{ fontSize: '12px', textAlign: 'right', marginTop: '4px', color: '#666' }}>
                    {t.PorcentajeAvance}%
                  </div>
                )}
              </div>
              
              <div className="kanban-card-users">
                {(t.usuario_asignados || []).slice(0, maxUsers).map(uid => (
                  <Tooltip key={uid} title={lookupName(uid)}>
                    <Avatar size={isMobile ? 'small' : 'default'} style={{ backgroundColor: '#1890ff' }}>
                      {getInitials(lookupName(uid))}
                    </Avatar>
                  </Tooltip>
                ))}
                {(t.usuario_asignados || []).length > maxUsers && (
                  <Tooltip title={`+${(t.usuario_asignados || []).length - maxUsers} más`}>
                    <Avatar size={isMobile ? 'small' : 'default'} style={{ backgroundColor: '#f56a00' }}>
                      +{(t.usuario_asignados || []).length - maxUsers}
                    </Avatar>
                  </Tooltip>
                )}
                {!(t.usuario_asignados || []).length && (
                  <Avatar 
                    size={isMobile ? 'small' : 'default'} 
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#d9d9d9', color: '#999' }}
                  />
                )}
              </div>
              
              <div className="kanban-card-actions">
                <Tooltip title="Ver comentarios">
                  <Button
                    type="text"
                    size="small"
                    icon={<MessageOutlined />}
                    className="comments-button"
                    style={{ 
                      color: comentariosCount > 0 ? '#1890ff' : '#999',
                      fontWeight: comentariosCount > 0 ? 'bold' : 'normal'
                    }}
                    onClick={() => {
                      setComentarioTask(t);
                      setComentarios(JSON.parse(t.comentarios || '[]'));
                    }}
                  >
                    {!isMobile && comentariosCount > 0 && comentariosCount}
                    {isMobile && comentariosCount > 0 && (
                      <span style={{ fontSize: '10px', marginLeft: '2px' }}>
                        {comentariosCount}
                      </span>
                    )}
                  </Button>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Configuración del editor ReactQuill adaptada para cada dispositivo
  const quillModules = {
    toolbar: isMobile ? [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link']
    ] : isTablet ? [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link']
    ] : [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ]
  };

  const getModalWidth = () => {
    if (isMobile) return '95%';
    if (isTablet) return '85%';
    return 900;
  };

  return (
    <div className="kanban-board">
      <Column title="Por hacer" items={porHacer} color="#8c8c8c" />
      <Column title="En progreso" items={enProgreso} color="#fa8c16" />
      <Column title="Hechas" items={hechas} color="#52c41a" />

      <Modal
        title={
          <div style={{ 
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: 'bold'
          }}>
            💬 {isMobile ? truncateText(comentarioTask?.Titulo, 30) : `Comentarios de "${comentarioTask?.Titulo}"`}
          </div>
        }
        open={!!comentarioTask}
        onCancel={() => {
          setComentarioTask(null);
          setNuevoComentario('');
          setComentarios([]);
        }}
        onOk={handleGuardarComentario}
        okText={isMobile ? "💾 Guardar" : "Guardar comentario"}
        cancelText="Cancelar"
        width={getModalWidth()}
        centered={!isMobile}
        style={isMobile ? { top: 20 } : {}}
        bodyStyle={{ 
          maxHeight: isMobile ? 'calc(100vh - 200px)' : '70vh', 
          overflowY: 'auto',
          padding: isMobile ? '16px' : '24px'
        }}
        okButtonProps={{
          disabled: !nuevoComentario.trim()
        }}
      >
        <div style={{ marginBottom: 20 }}>
          {comentarios.length > 0 ? (
            renderComentarios(comentarioTask?.comentarios)
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#999',
              fontSize: isMobile ? '14px' : '16px'
            }}>
              📝 No hay comentarios aún. ¡Sé el primero en comentar!
            </div>
          )}
        </div>
        
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Upload
            showUploadList={false}
            customRequest={({ file, onSuccess }) => {
              handleImageUpload(file).then(() => onSuccess("ok"));
            }}
            accept="image/*"
          >
            <Button 
              icon={<UploadOutlined />} 
              size={isMobile ? 'small' : 'middle'}
              block={isMobile}
            >
              📷 {isMobile ? 'Imagen' : 'Subir Imagen'}
            </Button>
          </Upload>
          
          <ReactQuill
            theme="snow"
            value={nuevoComentario}
            onChange={setNuevoComentario}
            placeholder="✍️ Escribe un comentario..."
            modules={quillModules}
            style={{ 
              fontSize: isMobile ? '14px' : '16px',
              minHeight: isMobile ? '120px' : '150px'
            }}
          />
        </Space>
      </Modal>
    </div>
  );
}