
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const db = require('../database'); // Usa el pool de pg
const authMiddleware = require('../middleware/auth');

// --- Configuración de Cloudinary (sin cambios) ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'JuliaDavidWeb',
    format: async (req, file) => 'webp',
    public_id: (req, file) => 'img-' + Date.now(),
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
  },
});

const upload = multer({ 
    storage: storage, 
    limits: { fileSize: 15 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        if (/jpeg|jpg|png|gif|webp/.test(file.mimetype)) cb(null, true); 
        else cb(new Error('Tipo de archivo no permitido'), false);
    }
});

// --- RUTAS (Adaptadas a Postgres) ---

// GET all images
router.get('/', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM images ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener imágenes:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST a new image (sube a Cloudinary y guarda en DB)
router.post('/', authMiddleware, (req, res) => {
    const uploadMiddleware = upload.single('image');
    uploadMiddleware(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: `Error en la subida: ${err.message}` });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
        }

        const { description } = req.body;
        const imageUrl = req.file.path;
        const publicId = req.file.filename;

        try {
            const result = await db.query(
                "INSERT INTO images (path, public_id, description, uploaded_by) VALUES ($1, $2, $3, $4) RETURNING *",
                [imageUrl, publicId, description || 'Sin descripción', req.user.username]
            );
            res.status(201).json({ message: 'Imagen subida correctamente', image: result.rows[0] });
        } catch (dbErr) {
            console.error("Error al guardar imagen en BD:", dbErr);
            // Si la BD falla, revertir la subida a Cloudinary
            await cloudinary.uploader.destroy(publicId);
            res.status(500).json({ error: 'Error al guardar en la base de datos. La subida ha sido revertida.' });
        }
    });
});

// DELETE an image
router.delete('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        // Primero, obtener el public_id de la BD
        const selectResult = await db.query("SELECT public_id FROM images WHERE id = $1", [id]);
        if (selectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }
        const publicId = selectResult.rows[0].public_id;

        // Segundo, eliminar de Cloudinary
        await cloudinary.uploader.destroy(publicId);

        // Tercero, eliminar de la BD
        await db.query("DELETE FROM images WHERE id = $1", [id]);

        res.status(200).json({ message: 'Imagen eliminada correctamente' });

    } catch (err) {
        console.error("Error al eliminar la imagen:", err);
        res.status(500).json({ error: 'Error interno del servidor durante la eliminación' });
    }
});

module.exports = router;
