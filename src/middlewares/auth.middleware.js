const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {

    // Obtener el token del encabezado de authorización (Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ Error: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta_provicional');

        console.log("Contenido real del token:", decoded);

        req.usuario = {
            ...decoded,
            id: decoded.id || decoded.usuarioId || decoded.sub
        };

        next();
    } catch (error) {
        return res.status(403).json({ Error: 'Token inválido.' });
    }
};

module.exports = {
    verificarToken,
};