
const functions = require("firebase-functions");
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database'); 

const app = express();

// Middleware
app.use(cors({ origin: true })); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de la API
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const imageRoutes = require('./routes/imageRoutes');
const messageRoutes = require('./routes/messageRoutes');

app.use('/', authRoutes);
app.use('/content', contentRoutes);
app.use('/images', imageRoutes);
app.use('/messages', messageRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error inesperado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Expose the Express app as a Cloud Function named 'api'
exports.api = functions.https.onRequest(app);
