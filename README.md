# Julia y David - Página Web Romántica ❤️ (Versión Serverless)

Página web romántica para Julia y David, ahora refactorizada a una arquitectura serverless moderna desplegada en Vercel.

## 🌟 Características

- ✨ Diseño romántico y elegante
- 🔐 Sistema de autenticación JWT
- 📝 Contenido editable (Historia y Planes)
- 🖼️ Galería de imágenes con slider y upload a Cloudinary
- 📅 Calendario sincronizado con Google Calendar
- ⏱️ Contador de tiempo juntos
- 🌙 Modo oscuro
- 💕 Animaciones de corazones flotantes
- 📱 Diseño responsive
- ⚡️ Backend basado en Funciones Serverless de Vercel (Node.js)

## 📋 Requisitos

- Node.js (versión 20.x o superior)
- npm (viene con Node.js)
- Una cuenta de Vercel ([vercel.com](https://vercel.com))
- Una cuenta de Cloudinary para el almacenamiento de imágenes.

## 📁 Estructura del Proyecto

```
/
├── api/
│   ├── content.js         # Serverless Function: Maneja la lógica del contenido.
│   ├── health.js          # Serverless Function: Verifica el estado de la API.
│   ├── images.js          # Serverless Function: Maneja la subida y gestión de imágenes.
│   └── login.js           # Serverless Function: Maneja la autenticación de usuarios.
├── public/
│   ├── index.html         # Frontend de la aplicación.
│   └── styles.css         # Estilos CSS.
├── package.json           # Dependencias del proyecto.
├── vercel.json            # Configuración de despliegue para Vercel.
└── README.md              # Este archivo.
```

## 🔧 Configuración Previa al Despliegue

Antes de desplegar, necesitas configurar las variables de entorno en Vercel para que la aplicación funcione correctamente.

1.  **Crea un nuevo proyecto en Vercel:** Ve a tu dashboard de Vercel, crea un nuevo proyecto y conéctalo a tu repositorio de GitHub.
2.  **Configura las Variables de Entorno:** En la configuración del proyecto en Vercel, añade las siguientes variables de entorno. Estas son necesarias para la conexión a la base de datos y Cloudinary.

    - `DB_HOST`: El host de tu base de datos.
    - `DB_USER`: El usuario de tu base de datos.
    - `DB_PASSWORD`: La contraseña de tu base de datos.
    - `DB_DATABASE`: El nombre de tu base de datos.
    - `CLOUDINARY_CLOUD_NAME`: Tu "Cloud Name" de Cloudinary.
    - `CLOUDINARY_API_KEY`: Tu "API Key" de Cloudinary.
    - `CLOUDINARY_API_SECRET`: Tu "API Secret" de Cloudinary.
    - `JWT_SECRET`: Una clave secreta larga y aleatoria para firmar los tokens JWT.

## 🌐 Despliegue en Vercel

Una vez que el repositorio está conectado y las variables de entorno están configuradas en Vercel, cada `git push` a la rama `main` desplegará automáticamente los cambios.

Si necesitas hacer un despliegue manual desde tu terminal, sigue estos pasos:

1.  **Inicia sesión en Vercel (solo la primera vez):**
    ```bash
    npx vercel login
    ```

2.  **Despliega en Producción:**
    Desde la raíz del proyecto, ejecuta:
    ```bash
    npx vercel --prod
    ```

Vercel se encargará del resto. La URL de producción se mostrará en la terminal al finalizar.

## 🎨 Personalización

### Cambiar Colores
Edita `public/styles.css` y busca las variables de color.

### Cambiar Fecha de Aniversario
Edita `public/index.html` y busca:
'''javascript
const startDate = new Date('2025-09-20');
'''

### Cambiar Calendario de Google
Edita `public/index.html` y actualiza el `src` del `iframe` con tu ID de calendario de Google.

## 🐛 Solución de Problemas

### Errores de `fetch` en el navegador
Asegúrate de que la configuración en `vercel.json` es correcta y que las funciones serverless (`/api/*.js`) se están desplegando correctamente. Revisa los logs de Vercel para ver si hay errores en las funciones.

### Problemas de autenticación
Verifica que la variable de entorno `JWT_SECRET` está configurada correctamente en Vercel.

## ❤️ Hecho con Amor

Desarrollado con amor para capturar y celebrar nuestra historia juntos.
