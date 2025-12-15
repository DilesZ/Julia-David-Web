
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

    // Fallback for default users in case of DB issues during initial deployment
    const fallbackUser = (u, p) => {
        const pairs = [
            { u: 'Julia', p: 'julia2025' },
            { u: 'David', p: 'david2025' }
        ];
        const match = pairs.find(x => x.u === u && x.p === p);
        if (!match) return null;
        return { id: -1, username: match.u, password: '' }; // password cleared
    };

    db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        async (err, user) => {
            let effectiveUser = user;

            if (err) {
                console.error('Error en login (DB access):', err);
                effectiveUser = fallbackUser(username, password);
                if (!effectiveUser) {
                    return res.status(500).json({ error: 'Error en el servidor' });
                }
            } else if (!user) {
                effectiveUser = fallbackUser(username, password);
                if (!effectiveUser) {
                    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
                }
            }

            try {
                // For real users, verify password hash
                if (effectiveUser.id !== -1) {
                    if (!password || typeof password !== 'string' || !effectiveUser.password) {
                        return res.status(400).json({ error: 'Contraseña inválida' });
                    }
                    const isValidPassword = await bcrypt.compare(password, effectiveUser.password);
                    if (!isValidPassword) {
                        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
                    }
                }

                // Generate JWT
                const secret = process.env.JWT_SECRET || 'secreto_super_seguro_por_defecto';
                const token = jwt.sign(
                    { id: effectiveUser.id, username: effectiveUser.username },
                    secret,
                    { expiresIn: '7d' }
                );

                // Send response - un-nesting user object
                res.json({
                    message: 'Login exitoso',
                    token,
                    username: effectiveUser.username
                });

            } catch (error) {
                console.error('Error crítico en login:', error);
                res.status(500).json({ error: 'Error interno al procesar login' });
            }
        }
    );
});

module.exports = router;
