import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Row, Col, Card, Form, Input, Button, message, Modal, Typography } from 'antd';
import 'antd/dist/reset.css';
import './Login.css';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const navigate = useNavigate();

  const onFinish = async ({ correo, clave }) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { correo, clave });

      // ✅ Parsear usuario: "Nombre - correo"
      const [nombreCompleto, correoUsuario] = data.usuario.split(' - ').map(s => s.trim());

      // ✅ Parsear rol: "ID - NombreRol"
      const [rolIDStr, nombreRol] = data.rol.split(' - ').map(s => s.trim());
      const rolID = parseInt(rolIDStr, 10);

      // ✅ Extraer ID desde token si lo tienes embebido
      const tokenParts = data.access_token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      const usuarioID = payload.sub ? parseInt(payload.sub, 10) : null;

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('userSGP', JSON.stringify({
        UsuarioID: usuarioID,
        Nombre: nombreCompleto,
        Correo: correoUsuario,
        RolID: rolID,
        NombreRol: nombreRol,
        area: '' // Si aplica luego
      }));

      message.success('Ingreso exitoso');
      navigate('/dashboard');
    } catch {
      message.error('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async ({ nombre, correo, clave }) => {
    setLoading(true);
    try {
      await api.post('/usuarios/', {
        correo,
        clave_hash: clave,
        nombre_completo: nombre,
        rol_id: 5,
        participacion: '',
        tasaHora: ''
      });
      message.success('Registro exitoso');
      setIsRegisterOpen(false);
    } catch {
      message.error('Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  // Validadores de contraseña
  const isLengthValid = passwordValue.length >= 8;
  const hasUpperCase = /[A-Z]/.test(passwordValue);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordValue);

  return (
    <Row className="login-row">
      <Col xs={22} sm={18} md={12} lg={8}>
        <Card className="login-card" bordered={false}>
          <Title level={2}>Iniciar Sesión</Title>
          <Text type="secondary" style={{ display: "block", marginTop: "12px", fontSize: "18px", color: "grey" }}>
            Bienvenido a Systemgroup Optime
          </Text>
          <Text type="secondary" style={{ display: "block", marginTop: "-25px", fontSize: "14px", color: "grey" }}>
            por favor ingresa tus credenciales
          </Text>
          <Form onFinish={onFinish} layout="vertical">
            <Form.Item
              name="correo"
              label="Correo"
              validateTrigger="onChange"
              rules={[{ required: true, type: 'email', message: 'Ingresa un correo válido' }]}
            >
              <Input placeholder="correo@ejemplo.com" />
            </Form.Item>
            <Form.Item
              name="clave"
              label="Contraseña"
              rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
            >
              <Input.Password placeholder="••••••••" />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
              >
                Ingresar
              </Button>
            </Form.Item>
            <Text>¿No tienes cuenta? </Text>
            <Button type="link" onClick={() => setIsRegisterOpen(true)}>
              Regístrate
            </Button>
          </Form>
        </Card>

        <Modal
          title="Registro de Usuario"
          open={isRegisterOpen}
          onCancel={() => setIsRegisterOpen(false)}
          footer={null}
        >
          <Form onFinish={onRegister} layout="vertical">
            <Form.Item
              name="nombre"
              label="Nombre Completo"
              rules={[{ required: true, message: 'Ingresa tu nombre completo' }]}
            >
              <Input placeholder="Juan Pérez" />
            </Form.Item>
            <Form.Item
              name="correo"
              label="Correo"
              rules={[{ required: true, type: 'email', message: 'Ingresa un correo válido' }]}
            >
              <Input placeholder="correo@ejemplo.com" />
            </Form.Item>
            <Form.Item
              name="clave"
              label="Contraseña"
              rules={[
                { required: true, message: 'Ingresa una contraseña' },
                {
                  validator: (_, value) => {
                    if (isLengthValid && hasUpperCase && hasSpecialChar) {
                      return Promise.resolve();
                    }
                    return Promise.reject('La contraseña no cumple todos los requisitos');
                  }
                }
              ]}
            >
              <Input.Password
                placeholder="••••••••"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
              />
            </Form.Item>

            <div className="password-requirements">
              <p style={{ color: isLengthValid ? 'green' : 'red' }}>
                {isLengthValid ? '✓' : '✗'} Mínimo 8 caracteres
              </p>
              <p style={{ color: hasUpperCase ? 'green' : 'red' }}>
                {hasUpperCase ? '✓' : '✗'} Al menos una letra mayúscula
              </p>
              <p style={{ color: hasSpecialChar ? 'green' : 'red' }}>
                {hasSpecialChar ? '✓' : '✗'} Al menos un caracter especial
              </p>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
              >
                Registrar
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Col>
    </Row>
  );
}
