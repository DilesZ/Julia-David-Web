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
            SELECT id, title, event_date, event_time, type, user_id, created_at 
            FROM calendar_events 
            ORDER BY event_date ASC, event_time ASC`);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener eventos:', error);
        res.status(500).json({ error: 'Error al obtener eventos del calendario' });
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
        const { userId, username } = decoded;

        if (username !== 'Julia' && username !== 'David') {
            return res.status(403).json({ error: 'No tienes permisos para crear eventos' });
        }

        const { title, event_date, event_time, type } = req.body;

        if (!title || !event_date || !type) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (título, fecha, tipo)' });
        }

        // Convert empty string to null for Postgres TIME column
        const timeVal = (event_time && event_time.trim() !== '') ? event_time : null;

        client = await pool.connect();
        const result = await client.query(`
            INSERT INTO calendar_events (title, event_date, event_time, type, user_id) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *`,
            [title, event_date, timeVal, type, userId]);

        res.status(201).json({
            message: 'Evento creado con éxito',
            event: result.rows[0]
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        console.error('Error al crear evento:', error);
        // Devolvemos el mensaje de error real para ayudar al usuario a ver qué pasa (ej: tabla inexistente)
        res.status(500).json({ error: `Error del servidor: ${error.message}` });
    } finally {
        if (client) client.release();
    }
}

async function handleDelete(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { username } = decoded;

        if (username !== 'Julia' && username !== 'David') {
            return res.status(403).json({ error: 'No tienes permisos para eliminar eventos' });
        }

        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ error: 'Falta el ID del evento' });
        }

        const client = await pool.connect();
        try {
            const result = await client.query('DELETE FROM calendar_events WHERE id = $1 RETURNING id', [id]);
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Evento no encontrado' });
            }
            res.status(200).json({ message: 'Evento eliminado con éxito' });
        } finally {
            client.release();
        }
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        console.error('Error al eliminar evento:', error);
        res.status(500).json({ error: 'Error al eliminar el evento' });
    }
}

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        await handleGet(req, res);
    } else if (req.method === 'POST') {
        await handlePost(req, res);
    } else if (req.method === 'DELETE') {
        // Extraer ID de la URL si es necesario o de req.query
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        req.query.id = urlParams.get('id');
        await handleDelete(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).end('Método no permitido');
    }
};
