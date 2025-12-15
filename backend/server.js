require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
// Servimos el contenido de 'frontend' y 'uploads' desde la raíz
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rutas de la API
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const imageRoutes = require('./routes/imageRoutes');
const messageRoutes = require('./routes/messageRoutes');

app.use('/api', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/messages', messageRoutes);

// Todas las rutas no-API sirven index.html para una SPA (Single Page Application)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: err.message || 'Error interno del servidor'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║       ❤️  Julia y David - Servidor Activo  ❤️         ║
║                                                       ║
║   🌐 URL: http://localhost:${PORT}                     ║
║                                                       ║
║   👤 Usuario Julia - Password: julia2025             ║
║   👤 Usuario David - Password: david2025             ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

module.exports = app;
