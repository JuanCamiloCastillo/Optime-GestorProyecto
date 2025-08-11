from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.roles_api import router as roles_router
from api.usuarios import router as usuarios_router
from api.proyectos import router as proyectos_router
from api.tareas import router as tareas_router
from api.bitacora_api import router as bitacora_router
from api.auth import router as auth_router
from api.areas import router as areas_router
from api.permisosRol_api import router as permisosRol_router
from api.notificaciones import router as notificaciones_router
from api.estados import router as estados_router
from utils.worker_notificaciones import start_worker
from utils.tareas_automaticas import run

app = FastAPI(title="API Gestión de Proyectos", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
     allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(roles_router)
app.include_router(usuarios_router)
app.include_router(proyectos_router)
app.include_router(tareas_router)
app.include_router(bitacora_router)
app.include_router(auth_router)
app.include_router(areas_router)
app.include_router(permisosRol_router)
app.include_router(notificaciones_router)
app.include_router(estados_router)

#start_worker()
#run()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
