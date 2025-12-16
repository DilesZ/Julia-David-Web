
const express = require('express');
const router = express.Router();
const db = require('../database'); // Usa el pool de pg
const authMiddleware = require('../middleware/auth');

// GET - Obtener todo el contenido (público)
router.get('/', async (req, res) => {
    try {
        const result = await db.query("SELECT section, text FROM content");
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener contenido:', err);
        res.status(500).json({ error: 'Error interno del servidor al obtener el contenido' });
    }
});

// PUT - Actualizar contenido de una sección (protegido)
router.put('/', authMiddleware, async (req, res) => {
    const { section, text } = req.body;

    if (!section || text === undefined) {
        return res.status(400).json({ error: 'Sección y texto son requeridos' });
    }

    try {
        // Sintaxis de Postgres para "UPSERT"
        const sql = `
            INSERT INTO content (section, text)
            VALUES ($1, $2)
            ON CONFLICT (section) DO UPDATE SET
                text = EXCLUDED.text;
        `;

        await db.query(sql, [section, text]);
        res.json({ message: 'Contenido guardado correctamente' });

    } catch (err) {
        console.error('Error en la operación UPSERT de contenido:', err);
        res.status(500).json({ error: 'Error al guardar el contenido' });
    }
});

module.exports = router;
