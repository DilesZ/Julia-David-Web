const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

// Login endpoint
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Buscar usuario en la base de datos
    db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        async (err, user) => {
            if (err) {
                console.error('Error en login:', err);
                return res.status(500).json({ error: 'Error en el servidor' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
            }

            try {
                // Verificar contraseña
                const isValidPassword = await bcrypt.compare(password, user.password);

                if (!isValidPassword) {
                    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
                }

                // Generar token JWT
                const secret = process.env.JWT_SECRET || 'secreto_super_seguro_por_defecto';
                const token = jwt.sign(
                    { id: user.id, username: user.username },
                    secret,
                    { expiresIn: '7d' } // Token válido por 7 días
                );

                res.json({
                    message: 'Login exitoso',
                    token,
                    user: {
                        id: user.id,
                        username: user.username
                    }
                });
            } catch (error) {
                console.error('Error crítico en login:', error);
                res.status(500).json({ error: 'Error interno al procesar login' });
            }
        }
    );
});

module.exports = router;
