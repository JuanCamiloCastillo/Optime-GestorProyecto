import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Button,
  message,
  Modal,
  Typography,
} from "antd";
import "antd/dist/reset.css";
import "./Login.css";

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);

  // Recuperación de contraseña (modal)
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: correo, 2: nueva clave
  const [forgotLoading, setForgotLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [newPass1, setNewPass1] = useState("");
  const [newPass2, setNewPass2] = useState("");

  // Datos del usuario a actualizar que vienen del backend al chequear el correo
  const [resetUser, setResetUser] = useState(null);
  // resetUser = { UsuarioID, correo, nombre_completo, rol_id, participacion, tasaHora }

  const navigate = useNavigate();

  const onFinish = async ({ correo, clave }) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { correo, clave });

      // ✅ Parsear usuario: "Nombre - correo"
      const [nombreCompleto, correoUsuario] = data.usuario
        .split(" - ")
        .map((s) => s.trim());

      // ✅ Parsear rol: "ID - NombreRol"
      const [rolIDStr, nombreRol] = data.rol.split(" - ").map((s) => s.trim());
      const rolID = parseInt(rolIDStr, 10);

      // ✅ Extraer ID desde token
      const tokenParts = data.access_token.split(".");
      const payload = JSON.parse(atob(tokenParts[1]));
      const usuarioID = payload.sub ? parseInt(payload.sub, 10) : null;

      localStorage.setItem("token", data.access_token);
      localStorage.setItem(
        "userSGP",
        JSON.stringify({
          UsuarioID: usuarioID,
          Nombre: nombreCompleto,
          Correo: correoUsuario,
          RolID: rolID,
          NombreRol: nombreRol,
          area: "",
        })
      );

      message.success("Ingreso exitoso");
      navigate("/dashboard");
    } catch {
      message.error("Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  // -------- Recuperación de contraseña (flujo simple) --------

  const openForgot = () => {
    // Resetear estado del flujo
    setForgotOpen(true);
    setForgotStep(1);
    setForgotLoading(false);
    setForgotEmail("");
    setNewPass1("");
    setNewPass2("");
    setResetUser(null);
  };

  const closeForgot = () => {
    setForgotOpen(false);
  };

  // Paso 1: verificar si el correo existe (y enviar aviso)
  const handleCheckEmail = async () => {
    if (!forgotEmail) {
      message.warning("Ingresa tu correo");
      return;
    }
    setForgotLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", {
        correo: forgotEmail,
      });

      if (data?.ok && data?.usuario?.UsuarioID) {
        setResetUser({
          UsuarioID: data.usuario.UsuarioID,
          correo: data.usuario.correo,
          nombre_completo: data.usuario.nombre_completo,
          rol_id: data.usuario.rol_id,
          participacion: data.usuario.participacion,
          tasaHora: data.usuario.tasaHora,
        });

        if (data.email_enviado) {
          message.success(
            "Te enviamos un aviso al correo. Continúa con tu nueva contraseña."
          );
        } else {
          message.warning(
            "No pudimos enviar el correo, pero puedes continuar con el cambio aquí mismo."
          );
        }

        setForgotStep(2); // sigue al cambio de clave
      } else {
        message.error("Correo no encontrado");
      }
    } catch {
      message.error("No fue posible validar el correo");
    } finally {
      setForgotLoading(false);
    }
  };

  // Validadores de contraseña para el reset
  const isLengthValid = newPass1.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPass1);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPass1);

  // Paso 2: actualizar contraseña con PUT /usuarios/{id}
  const handleResetPassword = async () => {
    if (!newPass1 || !newPass2) {
      message.warning("Completa ambos campos de contraseña");
      return;
    }
    if (newPass1 !== newPass2) {
      message.error("Las contraseñas no coinciden");
      return;
    }
    if (!(isLengthValid && hasUpperCase && hasSpecialChar)) {
      message.error("La nueva contraseña no cumple los requisitos");
      return;
    }
    if (!resetUser?.UsuarioID) {
      message.error("No se pudo identificar el usuario a actualizar");
      return;
    }

    setForgotLoading(true);
    try {
      await api.put(`/usuarios/${resetUser.UsuarioID}`, {
        correo: resetUser.correo,
        clave_hash: newPass1,
        nombre_completo: resetUser.nombre_completo,
        rol_id: resetUser.rol_id,
        participacion: resetUser.participacion,
        tasaHora: resetUser.tasaHora,
      });

      message.success("Contraseña actualizada. Ya puedes iniciar sesión.");
      closeForgot();
    } catch {
      message.error("No se pudo actualizar la contraseña");
    } finally {
      setForgotLoading(false);
    }
  };

  // Render de contenido por paso del modal
  const renderForgotContent = () => {
    if (forgotStep === 1) {
      return (
        <>
          <Text>
            Ingresa tu correo para continuar con el cambio de contraseña.
          </Text>
          <Input
            style={{ marginTop: 12 }}
            placeholder="correo@ejemplo.com"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
          />
          <Button
            type="primary"
            block
            style={{ marginTop: 16 }}
            loading={forgotLoading}
            onClick={handleCheckEmail}
          >
            Continuar
          </Button>
        </>
      );
    }
    // Paso 2
    return (
      <>
        <Text>Ingresa tu nueva contraseña.</Text>
        <Input.Password
          style={{ marginTop: 12 }}
          placeholder="Nueva contraseña"
          value={newPass1}
          onChange={(e) => setNewPass1(e.target.value)}
        />
        <Input.Password
          style={{ marginTop: 12 }}
          placeholder="Confirmar nueva contraseña"
          value={newPass2}
          onChange={(e) => setNewPass2(e.target.value)}
        />
        <div className="password-requirements" style={{ marginTop: 12 }}>
          <p style={{ color: isLengthValid ? "green" : "red", margin: 0 }}>
            {isLengthValid ? "✓" : "✗"} Mínimo 8 caracteres
          </p>
          <p style={{ color: hasUpperCase ? "green" : "red", margin: 0 }}>
            {hasUpperCase ? "✓" : "✗"} Al menos una letra mayúscula
          </p>
          <p style={{ color: hasSpecialChar ? "green" : "red", margin: 0 }}>
            {hasSpecialChar ? "✓" : "✗"} Al menos un caracter especial
          </p>
        </div>
        <Button
          type="primary"
          block
          style={{ marginTop: 16 }}
          loading={forgotLoading}
          onClick={handleResetPassword}
        >
          Actualizar contraseña
        </Button>
      </>
    );
  };

  return (
    <Row className="login-row">
      <Col xs={22} sm={18} md={12} lg={8}>
        <Card className="login-card" bordered={false}>
          <Title level={2}>Iniciar Sesión</Title>
          <Text
            type="secondary"
            style={{
              display: "block",
              marginTop: "12px",
              fontSize: "18px",
              color: "grey",
            }}
          >
            Bienvenido a Systemgroup Optime
          </Text>
          <Text
            type="secondary"
            style={{
              display: "block",
              marginTop: "-25px",
              fontSize: "14px",
              color: "grey",
            }}
          >
            por favor ingresa tus credenciales
          </Text>

          <Form onFinish={onFinish} layout="vertical">
            <Form.Item
              name="correo"
              label="Correo"
              validateTrigger="onChange"
              rules={[
                {
                  required: true,
                  type: "email",
                  message: "Ingresa un correo válido",
                },
              ]}
            >
              <Input placeholder="correo@sgnpl.com" />
            </Form.Item>

            <Form.Item
              name="clave"
              label="Contraseña"
              rules={[{ required: true, message: "Ingresa tu contraseña" }]}
            >
              <Input.Password placeholder="••••••••" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Ingresar
              </Button>
            </Form.Item>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <Button type="link" onClick={() => navigate("/crearusuario/")}>
                  Crear Usuario
                </Button>
              </div>
              <Button type="link" onClick={openForgot}>
                ¿Olvidó su contraseña?
              </Button>
            </div>
          </Form>
        </Card>

        {/* Modal Olvidó su contraseña */}
        <Modal
          title={
            forgotStep === 1
              ? "Recuperar contraseña: correo"
              : "Recuperar contraseña: nueva clave"
          }
          open={forgotOpen}
          onCancel={closeForgot}
          footer={null}
          destroyOnClose
        >
          {renderForgotContent()}
        </Modal>
      </Col>
    </Row>
  );
}
