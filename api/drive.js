const { google } = require('googleapis');
const multer = require('multer');
const { Readable } = require('stream');
const jwt = require('jsonwebtoken');

// Configuración de Google Drive API
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/drive.file']
});

const drive = google.drive({ version: 'v3', auth });
const uploadMemory = multer({ storage: multer.memoryStorage() });

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Middleware para verificar JWT
const authenticate = (handler) => async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No autenticado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.username !== 'Julia' && decoded.username !== 'David') {
            return res.status(403).json({ error: 'Acceso no autorizado' });
        }
        req.user = decoded;
        return handler(req, res);
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// Subir archivo a Google Drive
async function uploadToDrive(fileBuffer, fileName, mimeType) {
    const fileMetadata = {
        name: `${Date.now()}_${fileName}`,
        parents: [FOLDER_ID]
    };

    const media = {
        mimeType: mimeType,
        body: Readable.from(fileBuffer)
    };

    // Subir archivo
    const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink'
    });

    // Hacer el archivo público
    await drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
            role: 'reader',
            type: 'anyone'
        }
    });

    // Obtener el enlace directo para streaming
    const directUrl = `https://drive.google.com/uc?export=download&id=${file.data.id}`;

    return {
        fileId: file.data.id,
        fileName: file.data.name,
        url: directUrl,
        webViewLink: file.data.webViewLink
    };
}

// Eliminar archivo de Google Drive
async function deleteFromDrive(fileId) {
    try {
        await drive.files.delete({ fileId });
        return true;
    } catch (error) {
        console.error('Error eliminando de Drive:', error);
        return false;
    }
}

// POST: Subir archivo
async function handlePost(req, res) {
    return new Promise((resolve) => {
        uploadMemory.single('file')(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: 'Error recibiendo archivo: ' + err.message }), resolve();
            }
            if (!req.file) {
                return res.status(400).json({ error: 'No se ha subido ningún archivo' }), resolve();
            }

            try {
                const result = await uploadToDrive(
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype
                );

                res.status(201).json({
                    success: true,
                    fileId: result.fileId,
                    fileName: result.fileName,
                    url: result.url,
                    webViewLink: result.webViewLink
                });
                resolve();
            } catch (error) {
                console.error('Error subiendo a Drive:', error);
                res.status(500).json({ error: 'Error al subir a Google Drive: ' + error.message });
                resolve();
            }
        });
    });
}

// DELETE: Eliminar archivo
async function handleDelete(req, res) {
    const { fileId } = req.query;

    if (!fileId) {
        return res.status(400).json({ error: 'Se requiere fileId' });
    }

    const deleted = await deleteFromDrive(fileId);
    if (deleted) {
        res.status(200).json({ message: 'Archivo eliminado de Drive' });
    } else {
        res.status(500).json({ error: 'Error eliminando archivo de Drive' });
    }
}

// Router Principal
module.exports = async (req, res) => {
    // Solo rutas autenticadas
    const authenticatedHandler = authenticate((req, res) => {
        switch (req.method) {
            case 'POST':
                return handlePost(req, res);
            case 'DELETE':
                return handleDelete(req, res);
            default:
                res.setHeader('Allow', ['POST', 'DELETE']);
                res.status(405).end(`Método ${req.method} no permitido`);
        }
    });

    return await authenticatedHandler(req, res);
};

// Exportar funciones para uso en otros módulos
module.exports.uploadToDrive = uploadToDrive;
module.exports.deleteFromDrive = deleteFromDrive;
