const db = require('./database');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración de Multer para usar Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'juliaydavid',
        format: async (req, file) => 'jpg',
        public_id: (req, file) => new Date().toISOString() + '-' + file.originalname,
    },
});

const upload = multer({ storage: storage });

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        try {
            const [rows] = await db.query('SELECT * FROM images ORDER BY uploaded_at DESC');
            const images = rows.map(row => ({
                ...row,
                path: cloudinary.url(row.public_id, { secure: true })
            }));
            res.status(200).json(images);
        } catch (error) {
            console.error('Error fetching images:', error);
            res.status(500).json({ error: 'Error al obtener las imágenes' });
        }
    } else if (req.method === 'POST') {
        upload.single('image')(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            try {
                const { path, filename } = req.file;
                await db.query('INSERT INTO images (path, public_id, description) VALUES (?, ?, ?)', [path, filename, '']);
                res.status(201).json({ message: 'Imagen subida correctamente' });
            } catch (error) {
                console.error('Error saving image to DB:', error);
                res.status(500).json({ error: 'Error al guardar la imagen' });
            }
        });
    } else if (req.method === 'DELETE') {
        const imageId = req.query.id; 
        try {
            const [rows] = await db.query('SELECT public_id FROM images WHERE id = ?', [imageId]);
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Imagen no encontrada' });
            }
            const publicId = rows[0].public_id;
            
            await cloudinary.uploader.destroy(publicId);

            await db.query('DELETE FROM images WHERE id = ?', [imageId]);

            res.status(200).json({ message: 'Imagen eliminada correctamente' });
        } catch (error) {
            console.error('Error deleting image:', error);
            res.status(500).json({ error: 'Error al eliminar la imagen' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};