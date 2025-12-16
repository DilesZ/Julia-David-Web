# Julia y David - Página Web Romántica ❤️

Página web romántica para Julia y David con backend completo en Node.js, Express y SQLite.

## 🌟 Características

- ✨ Diseño romántico y elegante
- 🔐 Sistema de autenticación JWT
- 📝 Contenido editable (Historia y Planes)
- 🖼️ Galería de imágenes con slider
- 📤 Upload de imágenes
- 💌 Sistema de mensajes románticos
- 📅 Calendario sincronizado con Google Calendar
- ⏱️ Contador de tiempo juntos
- 🌙 Modo oscuro
- 💕 Animaciones de corazones flotantes
- 📱 Diseño responsive

## 📋 Requisitos

- Node.js (versión 14 o superior)
- npm (viene con Node.js)

## 🚀 Instalación y Uso Local

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Iniciar el Servidor

```bash
npm start
```

El servidor se iniciará en `http://localhost:3000`

### 3. Acceder a la Aplicación

- **Página Principal**: http://localhost:3000
- **Panel de Administración**: http://localhost:3000/admin

### 4. Credenciales de Acceso

Por defecto se crean dos usuarios:

- **Usuario**: Julia | **Contraseña**: julia2025
- **Usuario**: David | **Contraseña**: david2025

> ⚠️ **Importante**: Cambia las contraseñas después del primer uso editando directamente en la base de datos o creando un endpoint para cambiarlas.

## 📁 Estructura del Proyecto

```
JuliayDavid/
├── backend/
│   ├── middleware/
│   │   └── auth.js              # Middleware de autenticación JWT
│   ├── routes/
│   │   ├── authRoutes.js        # Rutas de autenticación
│   │   ├── contentRoutes.js     # Rutas de contenido
│   │   ├── imageRoutes.js       # Rutas de imágenes
│   │   └── messageRoutes.js     # Rutas de mensajes
│   ├── database.js              # Configuración de SQLite
│   └── server.js                # Servidor Express
├── frontend/
│   ├── IMG/                     # Imágenes existentes
│   ├── index.html               # Página principal
│   ├── admin.html               # Panel de administración
│   └── styles.css               # Estilos CSS
├── uploads/                     # Imágenes subidas (generado)
├── .env                         # Variables de entorno
├── .gitignore                   # Archivos ignorados por Git
├── package.json                 # Dependencias del proyecto
├── database.db                  # Base de datos SQLite (generado)
└── README.md                    # Este archivo
```

## 🔧 Configuración

### Variables de Entorno (.env)

```env
PORT=3000
JWT_SECRET=tu_secreto_super_seguro_aqui
NODE_ENV=development
```

## 📡 API Endpoints

### Autenticación

- `POST /api/login` - Iniciar sesión
  ```json
  {
    "username": "Julia",
    "password": "julia2025"
  }
  ```

### Contenido (Historia y Planes)

- `GET /api/content` - Obtener todo el contenido (público)
- `PUT /api/content` - Actualizar contenido (requiere autenticación)
  ```json
  {
    "section": "historia",
    "text": "Nuestra historia..."
  }
  ```

### Imágenes

- `GET /api/images` - Listar todas las imágenes (público)
- `POST /api/images` - Subir imagen (requiere autenticación)
  - Form data: `image` (archivo), `description` (texto)
- `DELETE /api/images/:id` - Eliminar imagen (requiere autenticación)

### Mensajes

- `GET /api/messages` - Obtener mensajes (requiere autenticación)
- `POST /api/messages` - Enviar mensaje (requiere autenticación)
  ```json
  {
    "text": "Te amo"
  }
  ```

## 🌐 Deployment

### Opción 1: Render.com (Recomendado - Gratis)

1. Crea una cuenta en [Render.com](https://render.com)
2. Conecta tu repositorio de GitHub
3. Crea un nuevo "Web Service"
4. Configura:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `PORT`: 3000
     - `JWT_SECRET`: tu_secreto_super_seguro
     - `NODE_ENV`: production

### Opción 2: Railway.app (Gratis)

1. Crea una cuenta en [Railway.app](https://railway.app)
2. Crea un nuevo proyecto desde GitHub
3. Railway detectará automáticamente Node.js
4. Añade las variables de entorno en el panel

### Opción 3: Vercel (Gratis)

1. Instala Vercel CLI: `npm i -g vercel`
2. Ejecuta: `vercel`
3. Sigue las instrucciones

> ⚠️ **Nota sobre la Base de Datos**: Para producción, considera usar una base de datos persistente como PostgreSQL en lugar de SQLite.

## 🎨 Personalización

### Cambiar Colores

Edita `frontend/styles.css` y busca las variables de color:
- `#d65a7b` - Color principal (rosa)
- `#ff6f61` - Color secundario (coral)
- `#f9f5f2` - Fondo claro
- `#2c2c2c` - Fondo oscuro

### Cambiar Fecha de Aniversario

Edita `frontend/index.html` y busca:
```javascript
const startDate = new Date('2025-09-20');
```

### Cambiar Calendario de Google

Edita `frontend/index.html` y actualiza el `src` del iframe con tu ID de calendario de Google.

## 🔒 Seguridad

- Las contraseñas se almacenan hasheadas con bcrypt
- Autenticación mediante JWT con expiración de 7 días
- Validación de tipos de archivo en uploads
- Límite de tamaño de archivo: 10MB
- CORS habilitado para desarrollo

## 🐛 Solución de Problemas

### El servidor no inicia

```bash
# Verifica que Node.js está instalado
node --version

# Reinstala dependencias
rm -rf node_modules
npm install
```

### Las imágenes no se cargan

- Verifica que la carpeta `frontend/IMG` existe
- Verifica que la carpeta `uploads` tiene permisos de escritura

### Error de autenticación

- Verifica que `JWT_SECRET` está configurado en `.env`
- Borra el token del localStorage y vuelve a iniciar sesión

## 📝 Licencia

Este proyecto es privado y para uso personal de Julia y David.

## ❤️ Hecho con Amor

Desarrollado con amor para capturar y celebrar nuestra historia juntos.

---

**¿Necesitas ayuda?** Contacta al desarrollador.
