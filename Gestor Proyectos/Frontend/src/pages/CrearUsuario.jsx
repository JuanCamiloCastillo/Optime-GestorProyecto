import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Button,
  Modal,
  Typography,
  message,
  Select,
} from "antd";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./CrearUsuario.css";

const { Title, Text } = Typography;
const { Option } = Select;

export default function CrearUsuario() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [roles, setRoles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      showLoginModal();
    } else {
      setIsAuthenticated(true);
    }
    cargarRoles();
  }, []);

  const cargarRoles = async () => {
    try {
      const { data } = await api.get("/roles/");
      const normalizados = data.map((r) => ({
        ...r,
        NombreRol: r.NombreRol?.trim(),
      }));
      setRoles(normalizados);
    } catch {
      message.error("Error al cargar roles");
    }
  };

  const showLoginModal = () => {
    Modal.confirm({
      title: "Iniciar Sesión",
      content: (
        <Form
          form={loginForm}
          layout="vertical"
          onFinish={onLogin}
          className="modal-login-form"
        >
          <Form.Item
            name="correo"
            label="Correo"
            rules={[
              { required: true, type: "email", message: "Correo inválido" },
            ]}
          >
            <Input placeholder="correo@ejemplo.com" />
          </Form.Item>
          <Form.Item
            name="clave"
            label="Contraseña"
            rules={[{ required: true, message: "Ingresa la contraseña" }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>
        </Form>
      ),
      okText: "Ingresar",
      cancelButtonProps: { style: { display: "none" } },
      onOk: () => loginForm.submit(),
      closable: false,
      maskClosable: false,
    });
  };

  const onLogin = async ({ correo, clave }) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { correo, clave });
      localStorage.setItem("token", data.access_token);
      message.success("Autenticación exitosa");
      setIsAuthenticated(true);
    } catch {
      message.error("Credenciales incorrectas");
      showLoginModal();
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async ({ nombre, correo, clave, rol_id }) => {
    setLoading(true);
    try {
      await api.post("/usuarios/", {
        correo,
        clave_hash: clave,
        nombre_completo: nombre,
        rol_id,
        participacion: "",
        tasaHora: "",
      });
      message.success("Usuario creado exitosamente");
      registerForm.resetFields();
      setPasswordValue("");
    } catch {
      message.error("Error al registrar usuario");
    } finally {
      setLoading(false);
    }
  };
  const cerrarSesion = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    showLoginModal();
  };

  const isLengthValid = passwordValue.length >= 8;
  const hasUpperCase = /[A-Z]/.test(passwordValue);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
    passwordValue
  );

  if (!isAuthenticated) return null;

  return (
    <Row className="crear-row">
      <Col xs={22} sm={18} md={12} lg={8}>
        <Card className="crear-card" bordered={false}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Button type="link" onClick={() => navigate("/login")}>
              Ir a login
            </Button>
            <Button type="link" danger onClick={cerrarSesion}>
              Cerrar sesión
            </Button>
          </div>

          <Title level={3}>Crear Nuevo Usuario</Title>
          <Form form={registerForm} layout="vertical" onFinish={onRegister}>
            <Form.Item
              name="nombre"
              label="Nombre Completo"
              rules={[
                { required: true, message: "Ingresa el nombre completo" },
              ]}
            >
              <Input placeholder="Juan Pérez" />
            </Form.Item>

            <Form.Item
              name="correo"
              label="Correo"
              rules={[
                { required: true, type: "email", message: "Correo inválido" },
              ]}
            >
              <Input placeholder="correo@ejemplo.com" />
            </Form.Item>

            <Form.Item
              name="clave"
              label="Contraseña"
              rules={[
                { required: true, message: "Ingresa una contraseña" },
                {
                  validator: (_, value) => {
                    if (isLengthValid && hasUpperCase && hasSpecialChar) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      "La contraseña no cumple los requisitos"
                    );
                  },
                },
              ]}
            >
              <Input.Password
                placeholder="••••••••"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
              />
            </Form.Item>

            <div className="password-requirements">
              <p style={{ color: isLengthValid ? "green" : "red" }}>
                {isLengthValid ? "✓" : "✗"} Mínimo 8 caracteres
              </p>
              <p style={{ color: hasUpperCase ? "green" : "red" }}>
                {hasUpperCase ? "✓" : "✗"} Al menos una letra mayúscula
              </p>
              <p style={{ color: hasSpecialChar ? "green" : "red" }}>
                {hasSpecialChar ? "✓" : "✗"} Al menos un caracter especial
              </p>
            </div>

            <Form.Item
              name="rol_id"
              label="Rol"
              rules={[{ required: true, message: "Selecciona un rol" }]}
            >
              <Select placeholder="Selecciona un rol">
                {roles.map((r) => (
                  <Option key={r.RolID} value={r.RolID}>
                    {r.NombreRol}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Crear Usuario
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
