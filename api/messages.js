const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Función para obtener mensajes
async function handleGet(req, res) {
    const client = await pool.connect();
    try {
        // Unimos messages con users para obtener el nombre de usuario
        const result = await client.query('
            SELECT m.id, m.text, m.created_at, u.username 
            FROM messages m 
            JOIN users u ON m.user_id = u.id 
            ORDER BY m.created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        res.status(500).json({ error: 'Error al obtener mensajes' });
    } finally {
        client.release();
    }
}

// Función para crear un nuevo mensaje
async function handlePost(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { userId } = decoded;
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'El texto del mensaje no puede estar vacío' });
        }

        const client = await pool.connect();
        try {
            const result = await client.query('
                INSERT INTO messages (user_id, text) 
                VALUES ($1, $2) 
                RETURNING id, created_at', 
                [userId, text]);

            res.status(201).json({
                message: 'Mensaje creado con éxito',
                newMessage: {
                    id: result.rows[0].id,
                    text,
                    created_at: result.rows[0].created_at,
                    username: decoded.username // Añadimos el username desde el token
                }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        console.error('Error al crear mensaje:', error);
        res.status(500).json({ error: 'Error al crear el mensaje' });
    }
}

// Controlador principal
module.exports = async (req, res) => {
    if (req.method === 'GET') {
        await handleGet(req, res);
    } else if (req.method === 'POST') {
        await handlePost(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end('Método no permitido');
    }
};