const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// GET - Obtener todos los mensajes (protegido)
router.get('/', authMiddleware, (req, res) => {
    db.all(
        "SELECT * FROM messages ORDER BY date DESC LIMIT 50",
        (err, rows) => {
            if (err) {
                console.error('Error al obtener mensajes:', err);
                return res.status(500).json({ error: 'Error al obtener mensajes' });
            }
            res.json(rows);
        }
    );
});

// POST - Crear nuevo mensaje (protegido)
router.post('/', authMiddleware, (req, res) => {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    db.run(
        "INSERT INTO messages (author, text) VALUES (?, ?)",
        [req.user.username, text],
        function (err) {
            if (err) {
                console.error('Error al guardar mensaje:', err);
                return res.status(500).json({ error: 'Error al guardar mensaje' });
            }

            res.json({
                message: 'Mensaje enviado correctamente',
                data: {
                    id: this.lastID,
                    author: req.user.username,
                    text: text
                }
            });
        }
    );
});

// DELETE - Eliminar mensaje (protegido)
router.delete('/:id', authMiddleware, (req, res) => {
    const messageId = req.params.id;
    
    db.run(
        "DELETE FROM messages WHERE id = ?",
        [messageId],
        function (err) {
            if (err) {
                console.error('Error al eliminar mensaje:', err);
                return res.status(500).json({ error: 'Error al eliminar mensaje' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Mensaje no encontrado' });
            }
            
            res.json({ message: 'Mensaje eliminado correctamente' });
        }
    );
});

module.exports = router;
