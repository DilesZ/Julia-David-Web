# 🚀 Guía de Deployment Gratis - Render.com

## Instrucciones Paso a Paso

### Opción 1: Deployment Automático con GitHub (Recomendado)

#### Paso 1: Subir a GitHub

1. **Abre PowerShell en la carpeta del proyecto**
2. **Ejecuta estos comandos:**

```bash
# Inicializar Git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit - Julia y David website"

# Crear repositorio en GitHub y seguir las instrucciones
```

3. **Ve a GitHub.com:**
   - Click en el botón "New repository" (+)
   - Nombre: `juliaydavid`
   - Descripción: "Página web romántica"
   - **NO** marques "Initialize with README"
   - Click "Create repository"

4. **Ejecuta los comandos que GitHub te muestra:**
```bash
git remote add origin https://github.com/TU_USUARIO/juliaydavid.git
git branch -M main
git push -u origin main
```

#### Paso 2: Deployment en Render.com

1. **Ve a [render.com](https://render.com)** y crea una cuenta gratuita
   - Puedes usar tu cuenta de GitHub para registrarte

2. **Conecta tu repositorio:**
   - Click en "New +" → "Web Service"
   - Conecta tu cuenta de GitHub
   - Selecciona el repositorio `juliaydavid`

3. **Configura el servicio:**
   - **Name:** juliaydavid
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

4. **Variables de entorno (Environment Variables):**
   
   Click en "Advanced" y añade:
   
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | `julia_david_amor_2025_secreto_render` |
   | `PORT` | `3000` |

5. **Click en "Create Web Service"**

6. **Espera 5-10 minutos** mientras Render construye y despliega tu aplicación

7. **Tu sitio estará en:** `https://juliaydavid.onrender.com`

---

### ⚠️ Importante sobre la Base de Datos

**Render Free Tier reinicia el servidor periódicamente**, lo que significa que la base de datos SQLite se restablecerá. Para producción real, considera:

1. **Usar PostgreSQL gratuito** (Render ofrece 90 días gratis)
2. **Aceptar que los datos se resetean** (usuarios/contraseñas se recrean automáticamente)

---

### Opción 2: Deployment Manual (Sin GitHub)

Si prefieres no usar GitHub, puedes usar la CLI de Render:

```bash
# Instalar Render CLI
npm install -g @render/cli

# Login en Render
render login

# Iniciar deployment
render deploy
```

---

## Credenciales por Defecto

Después de cada reinicio del servidor, las credenciales por defecto son:

- **Usuario Julia:** julia2025
- **Usuario David:** david2025

---

## URLs Finales

- **Página Principal:** https://juliaydavid.onrender.com
- **Panel Admin:** https://juliaydavid.onrender.com/admin

---

## Problemas Comunes

### "Application failed to respond"
- **Solución:** Verifica que el puerto en `.env` sea 3000 o usa `process.env.PORT`

### "Build failed"
- **Solución:** Asegúrate de que `package.json` tiene el campo `engines`

### Las imágenes no cargan
- **Solución:** Las imágenes originales se cargan automáticamente al iniciar

---

## Alternativas Gratuitas

Si Render no funciona, puedes probar:

1. **Railway.app** - Similar a Render
2. **Fly.io** - Más técnico pero bueno
3. **Cyclic.sh** - Muy fácil para Node.js

---

## Próximos Pasos

Una vez deployado:

1. ✅ Visita tu sitio en la URL de Render
2. ✅ Haz login en el panel de admin
3. ✅ Cambia el contenido de "Historia" y "Planes"
4. ✅ Sube nuevas fotos
5. ✅ Comparte la URL con Julia/David

---

**¿Necesitas ayuda?** Puedo guiarte paso a paso en el deployment.
