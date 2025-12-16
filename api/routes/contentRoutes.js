const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Contenido por defecto como fallback para evitar que la UI se vea vacía.
const defaultContent = [
    {
        section: 'historia',
        text: `Nuestra historia comenzó el 20 de septiembre de 2025, cuando nuestros caminos se cruzaron de una manera que solo el destino podría haber planeado. Desde ese primer momento, supimos que algo especial estaba naciendo entre nosotros. Cada día juntos es una nueva aventura, llena de risas, complicidad y un amor que crece más fuerte con el tiempo.`
    },
    {
        section: 'planes',
        text: `Nuestros sueños están llenos de planes increíbles: viajar por el mundo, crear recuerdos inolvidables y construir juntos el futuro que siempre imaginamos. Queremos explorar nuevos lugares, disfrutar de cada momento y seguir escribiendo nuestra historia de amor, capítulo a capítulo, día a día.`
    }
];

// GET - Obtener todo el contenido (público)
router.get('/', (req, res) => {
    db.all("SELECT * FROM content", (err, rows) => {
        if (err) {
            console.error('Error al obtener contenido, sirviendo fallback:', err);
            return res.status(500).json(defaultContent);
        }
        
        // Si la DB está vacía (condición de carrera), sirve el contenido por defecto.
        if (!rows || rows.length === 0) {
            console.log("Base de datos vacía. Sirviendo contenido por defecto.");
            return res.json(defaultContent);
        }
        
        res.json(rows);
    });
});

// PUT - Actualizar contenido de una sección (protegido)
router.put('/', authMiddleware, (req, res) => {
    const { section, text } = req.body;

    if (!section || !text) {
        return res.status(400).json({ error: 'Sección y texto son requeridos' });
    }

    const sql = `
        INSERT INTO content (section, text, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(section) DO UPDATE SET
            text = excluded.text,
            updated_at = CURRENT_TIMESTAMP;
    `;

    db.run(sql, [section, text], function(err) {
        if (err) {
            console.error('Error en la operación UPSERT de contenido:', err);
            return res.status(500).json({ error: 'Error al guardar el contenido' });
        }
        res.json({ message: 'Contenido guardado correctamente' });
    });
});

module.exports = router;
