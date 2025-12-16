const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end('Method Not Allowed');
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    if (!JWT_SECRET) {
        console.error('JWT_SECRET no está configurada.');
        return res.status(500).json({ error: 'Error de configuración del servidor.' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user && bcrypt.compareSync(password, user.password_hash)) {
            const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
            res.status(200).json({ message: 'Inicio de sesión correcto', token, username: user.username });
        } else {
            res.status(401).json({ error: 'Credenciales inválidas' });
        }
    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
