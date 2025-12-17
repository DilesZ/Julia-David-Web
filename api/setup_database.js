const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end('Method Not Allowed');
    }

    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Start transaction

        // --- Tablas ---
        await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password_hash VARCHAR(100) NOT NULL);`);
        await client.query(`CREATE TABLE IF NOT EXISTS content (id SERIAL PRIMARY KEY, section VARCHAR(50) UNIQUE NOT NULL, text TEXT NOT NULL);`);
        await client.query(`CREATE TABLE IF NOT EXISTS images (id SERIAL PRIMARY KEY, cloudinary_url TEXT, cloudinary_public_id TEXT NOT NULL, description TEXT, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`);
        // Nueva tabla de mensajes
        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                text TEXT NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Nueva tabla de calendario
        await client.query(`
            CREATE TABLE IF NOT EXISTS calendar_events (
                id SERIAL PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                event_date DATE NOT NULL,
                event_time TIME,
                type VARCHAR(20) NOT NULL, -- 'evento' o 'cita'
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // --- Usuarios ---
        const usersToSetup = [
            { oldUsername: 'dilez', newUsername: 'David', password: 'd' },
            { oldUsername: 'julia', newUsername: 'Julia', password: 'j' }
        ];

        for (const user of usersToSetup) {
            // Check if new username already exists
            const newCheck = await client.query('SELECT * FROM users WHERE username = $1', [user.newUsername]);

            if (newCheck.rowCount > 0) {
                console.log(`Usuario '${user.newUsername}' ya existe.`);
            } else {
                // Check if old username exists to rename
                const oldCheck = await client.query('SELECT * FROM users WHERE username = $1', [user.oldUsername]);

                if (oldCheck.rowCount > 0) {
                    await client.query('UPDATE users SET username = $1 WHERE username = $2', [user.newUsername, user.oldUsername]);
                    console.log(`Usuario renombrado de '${user.oldUsername}' a '${user.newUsername}'.`);
                } else {
                    // Create new user if neither exists
                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync(user.password, salt);
                    await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [user.newUsername, hash]);
                    console.log(`Usuario '${user.newUsername}' creado.`);
                }
            }
        }

        await client.query('COMMIT');

        res.status(200).json({ message: 'Base de datos configurada. Tablas y usuarios listos. ¡Tabla de mensajes incluida!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error durante la configuración de la base de datos:', error);
        res.status(500).json({ error: 'Error del servidor al configurar la base de datos.', details: error.message });
    } finally {
        if (client) client.release();
    }
};