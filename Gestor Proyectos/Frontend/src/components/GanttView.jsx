import React, { useEffect, useRef } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import dayjs from 'dayjs';
import './GanttView.css';

export default function GanttView({
  tasks = [],
  viewMode = ViewMode.Day,
  onDateChange,
  onProgressChange,
}) {
  if (tasks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 50, color: '#888' }}>
        No hay tareas para mostrar.
      </div>
    );
  }

  const CustomTooltip = ({ task }) => {
    const ref = useRef();

    useEffect(() => {
      const el = ref.current?.parentElement;
      if (el) {
        const top = parseFloat(el.style.top || '0');
        el.style.top = `${top - 40}px`; // 🔼 Mueve el tooltip arriba de la barra
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
      }
    }, []);

    return (
      <div
        ref={ref}
        style={{
          padding: '10px',
          fontSize: '13px',
          lineHeight: '1.6em',
          backgroundColor: 'rgba(0,0,0,0.85)',
          color: '#fff',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          maxWidth: '300px',
          pointerEvents: 'none',
          whiteSpace: 'normal',
          zIndex: 9999,
        }}
      >
        <div><strong>{task.name}</strong></div>
        <div>📅 <b>Inicio:</b> {dayjs(task.start).format('DD/MM/YYYY')}</div>
        <div>🛑 <b>Fin:</b> {dayjs(task.end).format('DD/MM/YYYY')}</div>
        <div>📈 <b>Avance:</b> {task.progress}%</div>
        {task.responsables?.length > 0 && (
          <div>👤 <b>Responsables:</b> {task.responsables.join(', ')}</div>
        )}
      </div>
    );
  };

  return (
    <div
      className="gantt-container"
      style={{
        height: '600px',
        overflowX: 'auto',
        overflowY: 'auto',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#fff',
      }}
    >
      <div style={{ minWidth: `${tasks.length * 400}px` }}>
        <Gantt
          tasks={tasks}
          viewMode={viewMode}
          columnWidth={60}
          onDateChange={onDateChange}
          onProgressChange={onProgressChange}
          listCellWidth={''} // ❌ sin columnas
          locale="es"
          TooltipContent={CustomTooltip} // ✅ tooltip sobre la barra
          barProgressColor="#6d78f2"
          barBackgroundColor="#d9d9d9"
          barCornerRadius={4}
          barFill={60}
          fontSize={12}
        />
      </div>
    </div>
  );
}
