const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configuración de Vercel Postgres y Cloudinary
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const JWT_SECRET = process.env.JWT_SECRET;

// Configuración de Multer para subir a Cloudinary
const storage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'juliaydavid', format: 'jpg' },
});
const upload = multer({ storage });

// Middleware de autenticación JWT
const authenticate = (handler) => async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso no autorizado' });
    }
    try {
        req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        return handler(req, res);
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// --- Manejadores de Métodos HTTP ---

const handleGet = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, cloudinary_public_id, description, created_at FROM images ORDER BY created_at DESC');
        const images = result.rows.map(img => ({
            id: img.id,
            url: cloudinary.url(img.cloudinary_public_id, { secure: true }),
            description: img.description,
            created_at: img.created_at
        }));
        res.status(200).json(images);
    } catch (error) {
        console.error('Error al obtener imágenes:', error);
        res.status(500).json({ error: 'Error interno al obtener imágenes' });
    }
};

const handlePost = authenticate(async (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            console.error('Error en Multer/Cloudinary:', err);
            return res.status(400).json({ error: `Error al subir la imagen: ${err.message}` });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
        }

        const { path: cloudinary_url, filename: cloudinary_public_id } = req.file;
        const description = req.body.description || '';

        try {
            const result = await pool.query(
                'INSERT INTO images (cloudinary_url, cloudinary_public_id, description, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
                [cloudinary_url, cloudinary_public_id, description, req.user.userId]
            );
            res.status(201).json({ message: 'Imagen subida correctamente', imageId: result.rows[0].id });
        } catch (error) {
            console.error('Error al guardar en DB:', error);
            res.status(500).json({ error: 'Error interno al guardar la imagen' });
        }
    });
});

const handleDelete = authenticate(async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Se requiere el ID de la imagen' });

    try {
        // Obtener el public_id antes de borrar
        const imgResult = await pool.query('SELECT cloudinary_public_id FROM images WHERE id = $1 AND user_id = $2', [id, req.user.userId]);
        if (imgResult.rowCount === 0) {
            return res.status(404).json({ error: 'Imagen no encontrada o no tienes permiso para eliminarla' });
        }
        const { cloudinary_public_id } = imgResult.rows[0];

        // Eliminar de la base de datos
        await pool.query('DELETE FROM images WHERE id = $1', [id]);

        // Eliminar de Cloudinary
        await cloudinary.uploader.destroy(cloudinary_public_id);

        res.status(200).json({ message: 'Imagen eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar:', error);
        res.status(500).json({ error: 'Error interno al eliminar la imagen' });
    }
});

// --- Router Principal ---

module.exports = (req, res) => {
    if (!JWT_SECRET || !process.env.POSTGRES_URL || !process.env.CLOUDINARY_URL) {
        console.error('Una o más variables de entorno críticas no están configuradas.');
        return res.status(500).json({ error: 'Error de configuración del servidor.' });
    }

    switch (req.method) {
        case 'GET': return handleGet(req, res);
        case 'POST': return handlePost(req, res);
        case 'DELETE': return handleDelete(req, res);
        default:
            res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
