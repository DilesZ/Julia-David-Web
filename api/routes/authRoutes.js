
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database'); // Ahora usa el pool de pg

// Login endpoint
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    try {
        // Consulta a la base de datos Postgres
        const result = await db.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // Verificar la contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // Generar JWT
        const secret = process.env.JWT_SECRET || 'secreto_super_seguro_por_defecto';
        const token = jwt.sign(
            { id: user.id, username: user.username },
            secret,
            { expiresIn: '7d' } 
        );

        // Enviar respuesta
        res.json({
            message: 'Login exitoso',
            token,
            username: user.username
        });

    } catch (error) {
        console.error('Error crítico en login:', error);
        res.status(500).json({ error: 'Error interno al procesar login' });
    }
});

module.exports = router;
