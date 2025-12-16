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

        // --- Usuario 1: dilez ---
        const user1 = 'dilez';
        const pass1 = 'd';
        const userCheck1 = await client.query('SELECT * FROM users WHERE username = $1', [user1]);
        if (userCheck1.rowCount === 0) {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(pass1, salt);
            await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [user1, hash]);
            console.log(`Usuario '${user1}' creado.`);
        } else {
            console.log(`Usuario '${user1}' ya existe.`);
        }

        // --- Usuario 2: julia ---
        const user2 = 'julia';
        const pass2 = 'j';
        const userCheck2 = await client.query('SELECT * FROM users WHERE username = $1', [user2]);
        if (userCheck2.rowCount === 0) {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(pass2, salt);
            await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [user2, hash]);
            console.log(`Usuario '${user2}' creado.`);
        } else {
            console.log(`Usuario '${user2}' ya existe.`);
        }
        
        await client.query('COMMIT');
        
        res.status(200).json({ message: 'Base de datos configurada. Usuarios [dilez, julia] listos.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error durante la configuración de la base de datos:', error);
        res.status(500).json({ error: 'Error del servidor al configurar la base de datos.', details: error.message });
    } finally {
        if (client) client.release();
    }
};
