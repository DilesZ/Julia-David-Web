const db = require('./database');
const jwt = require('jsonwebtoken');

// Clave secreta para firmar el token. En una aplicación real, esto debería estar en una variable de entorno.
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_aqui';

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        try {
            // Lógica para verificar las credenciales del usuario
            // Esto es solo un ejemplo, deberías hashear las contraseñas en una aplicación real
            if (username === 'Julia' && password === '123') {
                const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
                res.status(200).json({ token, username });
            } else if (username === 'David' && password === '123') {
                const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
                res.status(200).json({ token, username });
            }
            else {
                res.status(401).json({ error: 'Credenciales incorrectas' });
            }
        } catch (error) {
            console.error('Error en el login:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};