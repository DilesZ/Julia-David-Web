
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Wrapper principal que Vercel ejecutará
module.exports = async (req, res) => {
    // Solo permitir el método GET para esta ruta
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
        console.log("Iniciando la configuración de la base de datos...");

        // --- 1. Crear tabla de usuarios ---
        await client.query(\`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(100) NOT NULL
            );
        \`);
        console.log("Tabla 'users' creada o ya existente.");

        // --- 2. Crear tabla de contenido ---
        await client.query(\`
            CREATE TABLE IF NOT EXISTS content (
                id SERIAL PRIMARY KEY,
                section VARCHAR(50) UNIQUE NOT NULL,
                text TEXT NOT NULL
            );
        \`);
        console.log("Tabla 'content' creada o ya existente.");

        // --- 3. Crear tabla de imágenes ---
        await client.query(\`
            CREATE TABLE IF NOT EXISTS images (
                id SERIAL PRIMARY KEY,
                cloudinary_id VARCHAR(255) NOT NULL,
                secure_url TEXT NOT NULL,
                order_index INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        \`);
        console.log("Tabla 'images' creada o ya existente.");

        // --- 4. Insertar usuario administrador (si no existe) ---
        const adminUser = 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            throw new Error("La variable de entorno ADMIN_PASSWORD no está configurada.");
        }

        const userCheck = await client.query('SELECT * FROM users WHERE username = $1', [adminUser]);

        if (userCheck.rowCount === 0) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(adminPassword, salt);
            await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [adminUser, passwordHash]);
            console.log("Usuario 'admin' creado con éxito.");
        } else {
            console.log("El usuario 'admin' ya existe.");
        }
        
        console.log("¡Configuración de la base de datos completada con éxito!");
        res.status(200).json({ message: '¡Base de datos configurada exitosamente!' });

    } catch (error) {
        console.error('Error durante la configuración de la base de datos:', error);
        res.status(500).json({ error: 'Error del servidor al configurar la base de datos.', details: error.message });
    } finally {
        // Liberar el cliente de la pool
        if (client) {
            client.release();
        }
        console.log("Conexión con la base de datos cerrada.");
    }
};
