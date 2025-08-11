import React, { useState } from 'react';
import { Layout } from 'antd';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Proyectos from './pages/Proyectos';
import ProyectoDetalle from './pages/ProyectoDetalle';
import PermisosRol from './pages/PermisosRol';
import CrearUsuario from './pages/CrearUsuario';

const { Content } = Layout;

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const isAuth = Boolean(localStorage.getItem('token'));
  const location = useLocation();
  const showNav = isAuth && location.pathname !== '/login';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {showNav && (
        <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
      )}

      <Layout>
        <Content style={{ margin: '24px 16px 0', padding: 24 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={isAuth ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
            <Route path="/dashboard" element={isAuth ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/proyectos" element={isAuth ? <Proyectos /> : <Navigate to="/login" />} />
            <Route path="/proyectos/:id" element={isAuth ? <ProyectoDetalle /> : <Navigate to="/login" />} />
            <Route path="/permisosRol" element={isAuth ? <PermisosRol /> : <Navigate to="/login" />} />
            <Route path='/crearusuario' element={<CrearUsuario></CrearUsuario>} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
