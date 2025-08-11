import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
moment.locale('es');

import {
  Modal,
  Typography,
  Tag,
  Avatar,
  Space,
  Progress,
  Divider,
  Tooltip
} from 'antd';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarView.css';

const { Text, Paragraph } = Typography;
const localizer = momentLocalizer(moment);

const mensajesCalendario = {
  today: 'Hoy',
  previous: 'Atrás',
  next: 'Siguiente',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Tarea',
  noEventsInRange: 'No hay tareas en este rango.',
  showMore: total => `+ Ver ${total} más`
};

export default function CalendarView({ events }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const EventComponent = ({ event }) => (
    <Tooltip
      title={
        <>
          <div>Avance: {event.porcentajeAvance || 0}%</div>
          <div>Responsable: {event.usuarioAsignado || '—'}</div>
        </>
      }
      placement="top"
    >
      <div style={{ width: '100%', height: '100%' }}>
        {event.title}
      </div>
    </Tooltip>
  );

  return (
    <>
      <Calendar
        localizer={localizer}
        events={(events || []).map(e => ({
          ...e,
          title: e.name || e.title,
        }))}
        startAccessor="start"
        endAccessor="end"
        views={['month', 'day', 'agenda']}
        defaultView="month"
        messages={mensajesCalendario}
        style={{
          height: 600,
          background: '#fff',
          borderRadius: '8px',
          padding: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
        eventPropGetter={() => ({
          style: {
            backgroundColor: '#36A2DA',
            borderRadius: '4px',
            color: '#fff',
            border: 'none',
            padding: '4px',
            cursor: 'pointer'
          }
        })}
        components={{
          event: EventComponent
        }}
        onSelectEvent={(event) => setSelectedEvent(event)}
      />

      <Modal
        open={!!selectedEvent}
        title="Detalle de la Tarea"
        onCancel={() => setSelectedEvent(null)}
        footer={null}
      >
        {selectedEvent && (
          <div>
            <Text strong>Título:</Text>
            <Paragraph>{selectedEvent.name || '—'}</Paragraph>

            <Text strong>Descripción:</Text>
            <Paragraph>
              {selectedEvent.descripcion?.trim() ? selectedEvent.descripcion : '—'}
            </Paragraph>

            <Divider />

            <Text strong>Estado:</Text>
            <Paragraph>
              <Tag>{selectedEvent.estado || '—'}</Tag>
            </Paragraph>

            <Text strong>Responsable principal:</Text>
            <Paragraph>{selectedEvent.usuarioAsignado || '—'}</Paragraph>

            {selectedEvent.responsables?.length > 0 && (
              <>
                <Text strong>Responsables adicionales:</Text>
                <Paragraph>
                  <Space>
                    {selectedEvent.responsables.map((name, i) => (
                      <Avatar key={i}>
                        {name ? name.split(' ').map(n => n[0]).join('') : '—'}
                      </Avatar>
                    ))}
                  </Space>
                </Paragraph>
              </>
            )}

            <Divider />

            <Text strong>Inicio:</Text>
            <Paragraph>{moment(selectedEvent.start).format('LL')}</Paragraph>

            <Text strong>Fin:</Text>
            <Paragraph>{moment(selectedEvent.end).format('LL')}</Paragraph>

            <Text strong>Porcentaje de Avance:</Text>
            <Paragraph>
              <Progress percent={Number(selectedEvent.porcentajeAvance) || 0} />
            </Paragraph>

            <Text strong>Prioridad:</Text>
            <Paragraph>
              <Tag>{selectedEvent.prioridad || '—'}</Tag>
            </Paragraph>

            <Text strong>Comentarios:</Text>
            <Paragraph>
              {selectedEvent.comentarios?.trim() ? selectedEvent.comentarios : '—'}
            </Paragraph>
          </div>
        )}
      </Modal>
    </>
  );
}
