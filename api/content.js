const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

const JWT_SECRET = process.env.JWT_SECRET;

const authenticate = (handler) => async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso no autorizado' });
    }

    const token = authHeader.split(' ')[1];

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        return handler(req, res);
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

const handleGet = async (req, res) => {
    try {
        const result = await pool.query('SELECT section, text FROM content');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching content:', error);
        res.status(500).json({ error: 'Error al obtener el contenido' });
    }
};

const handlePut = authenticate(async (req, res) => {
    const { section, text } = req.body;
    if (!section || typeof text !== 'string') {
        return res.status(400).json({ error: 'La sección y el texto son requeridos' });
    }

    try {
        const result = await pool.query(
            'UPDATE content SET text = $1 WHERE section = $2 RETURNING *',
            [text, section]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'La sección no fue encontrada' });
        }

        res.status(200).json({ message: 'Contenido actualizado', content: result.rows[0] });
    } catch (error) {
        console.error('Error updating content:', error);
        res.status(500).json({ error: 'Error al actualizar el contenido' });
    }
});

module.exports = async (req, res) => {
    if (!JWT_SECRET) {
        console.error('JWT_SECRET no está configurada.');
        return res.status(500).json({ error: 'Error de configuración del servidor.' });
    }

    switch (req.method) {
        case 'GET':
            return handleGet(req, res);
        case 'PUT':
            return handlePut(req, res);
        default:
            res.setHeader('Allow', ['GET', 'PUT']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
