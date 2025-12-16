
const express = require('express');
const router = express.Router();
const db = require('../database'); // Usa el pool de pg
const authMiddleware = require('../middleware/auth');

// GET - Obtener todos los mensajes (público)
router.get('/', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM messages ORDER BY timestamp DESC LIMIT 100");
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener mensajes:', err);
        res.status(500).json({ error: 'Error al obtener mensajes' });
    }
});

// POST - Crear nuevo mensaje (público)
router.post('/', async (req, res) => {
    const { author, message } = req.body;

    if (!author || !message || author.trim().length === 0 || message.trim().length === 0) {
        return res.status(400).json({ error: 'El nombre y el mensaje no pueden estar vacíos' });
    }

    try {
        const result = await db.query(
            "INSERT INTO messages (author, message) VALUES ($1, $2) RETURNING *",
            [author, message]
        );
        res.status(201).json({ message: 'Mensaje enviado correctamente', data: result.rows[0] });
    } catch (err) {
        console.error('Error al guardar mensaje:', err);
        res.status(500).json({ error: 'Error al guardar mensaje' });
    }
});

// DELETE - Eliminar mensaje (protegido, solo para administradores)
router.delete('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("DELETE FROM messages WHERE id = $1", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }
        res.json({ message: 'Mensaje eliminado correctamente' });
    } catch (err) {
        console.error('Error al eliminar mensaje:', err);
        res.status(500).json({ error: 'Error al eliminar mensaje' });
    }
});

module.exports = router;
