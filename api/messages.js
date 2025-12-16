const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function handleGet(req, res) {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT m.id, m.text, m.created_at, u.username 
            FROM messages m 
            JOIN users u ON m.user_id = u.id 
            ORDER BY m.created_at DESC`);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        res.status(500).json({ error: 'Error al obtener mensajes' });
    } finally {
        client.release();
    }
}

async function handlePost(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    let client;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { userId } = decoded;
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'El texto del mensaje no puede estar vacío' });
        }

        client = await pool.connect();
        await client.query('BEGIN');

        const insertResult = await client.query(`
            INSERT INTO messages (user_id, text) 
            VALUES ($1, $2) 
            RETURNING id`, 
            [userId, text.trim()]);
        
        const newMessageId = insertResult.rows[0].id;

        const newMsgQuery = await client.query(`
            SELECT m.id, m.text, m.created_at, u.username
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.id = $1
        `, [newMessageId]);

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Mensaje creado con éxito',
            newMessage: newMsgQuery.rows[0]
        });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        console.error('Error al crear mensaje:', error);
        res.status(500).json({ error: 'Error del servidor al crear el mensaje' });
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function handleDelete(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET);
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Falta el ID del mensaje' });
        }

        const client = await pool.connect();
        try {
            const result = await client.query('DELETE FROM messages WHERE id = $1 RETURNING id', [id]);
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Mensaje no encontrado' });
            }
            res.status(200).json({ message: 'Mensaje eliminado con éxito' });
        } finally {
            client.release();
        }
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        console.error('Error al eliminar mensaje:', error);
        res.status(500).json({ error: 'Error al eliminar el mensaje' });
    }
}

module.exports = async (req, res) => {
    // Para las peticiones de borrado, el id vendrá en la query string
    // por ejemplo: /api/messages?id=123
    if (req.method === 'DELETE') {
        req.query.id = req.url.split('=')[1];
        await handleDelete(req, res);
    } else if (req.method === 'GET') {
        await handleGet(req, res);
    } else if (req.method === 'POST') {
        await handlePost(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).end('Método no permitido');
    }
};