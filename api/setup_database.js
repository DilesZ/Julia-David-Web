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

        // --- 1. Crear tabla de usuarios ---
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(100) NOT NULL
            );
        `);

        // --- 2. Crear tabla de contenido ---
        await client.query(`
            CREATE TABLE IF NOT EXISTS content (
                id SERIAL PRIMARY KEY,
                section VARCHAR(50) UNIQUE NOT NULL,
                text TEXT NOT NULL
            );
        `);
        
        // --- 3. Crear tabla de imágenes (Corregida) ---
        await client.query(`
            CREATE TABLE IF NOT EXISTS images (
                id SERIAL PRIMARY KEY,
                cloudinary_url TEXT,
                cloudinary_public_id TEXT NOT NULL,
                description TEXT,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // --- 4. Insertar usuario administrador (si no existe) ---
        const adminUser = 'dilez';
        const adminPassword = 'd';

        const userCheck = await client.query('SELECT * FROM users WHERE username = $1', [adminUser]);

        if (userCheck.rowCount === 0) {
            const salt = bcrypt.genSaltSync(10);
            const passwordHash = bcrypt.hashSync(adminPassword, salt);
            await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [adminUser, passwordHash]);
            console.log("Usuario 'dilez' creado con éxito.");
        } else {
            console.log("El usuario 'dilez' ya existe.");
        }
        
        await client.query('COMMIT'); // Commit transaction
        
        res.status(200).json({ message: 'Base de datos configurada exitosamente! Tablas users, content, e images creadas/verificadas y usuario admin creado/verificado.' });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback transaction on error
        console.error('Error durante la configuración de la base de datos:', error);
        res.status(500).json({ error: 'Error del servidor al configurar la base de datos.', details: error.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};
