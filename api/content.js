const db = require('./database');

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        try {
            const [rows] = await db.query('SELECT section, text FROM content');
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching content:', error);
            res.status(500).json({ error: 'Error al obtener el contenido' });
        }
    } else if (req.method === 'PUT') {
        // Lógica de autenticación (simplificada para este ejemplo)
        const { section, text } = req.body;
        if (!section || !text) {
            return res.status(400).json({ error: 'Faltan datos' });
        }

        try {
            await db.query('UPDATE content SET text = ? WHERE section = ?', [text, section]);
            res.status(200).json({ message: 'Contenido actualizado' });
        } catch (error) {
            console.error('Error updating content:', error);
            res.status(500).json({ error: 'Error al actualizar el contenido' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};