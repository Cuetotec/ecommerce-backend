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
        req.usuario = decoded; // Guardar la información del usuario en la solicitud
        next(); // Continuar con la siguiente función middleware o ruta
    } catch (error) {
        return res.status(403).json({ Error: 'Token inválido.' });
    }
};

module.exports = {
    verificarToken,
};