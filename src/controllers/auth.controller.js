const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registrar un nuevo usuario
const registrarUsuario = async (req, res) => {
  const { nombre, email, password } = req.body;

  try {
    
    // Verificar si el usuario ya existe
    const existeUsuario = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existeUsuario.rows.length > 0) {
      return res.status(400).json({ Error: 'El correo electrónico ya está registrado' });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordEncriptada = await bcrypt.hash(password, salt);

    // Insertar el nuevo usuario en la base de datos
    const nuevoUsuario = await db.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING *',
      [nombre, email, passwordEncriptada]
    );

    res.status(201).json({
        message: 'Usuario registrado exitosamente',
        usuario: nuevoUsuario.rows[0]
    });
}catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ Error: 'Error interno del servidor' });
  }
};

// Iniciar sesión de usuario
const loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    try {

        // Comprobar si el usuario existe
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ Error: 'Credenciales inválidas' });
        }

        const usuario = result.rows[0];

        // Verificar la contraseña
        const esValida = await bcrypt.compare(password, usuario.password);
        if (!esValida) {
            return res.status(400).json({ Error: 'Credenciales inválidas' });
        }

        // Generar un token JWT
        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol },
             process.env.JWT_SECRET || 'clave_secreta_provicional',
             { expiresIn: '24h' 

             });

             res.json({
                message: 'Inicio de sesión exitoso',
                token,
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol
                }
             });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ Error: 'Error interno del servidor' });
    }
};

const actualizarPerfil = async (req,res) => {
    try {
        const usuarioId = req.usuarioId;
        const { nombre, direccion } = req.body;

        const resultado = await db.query(
            'UPDATE usuarios SET nombre = $1, direccion = $2 WHERE id = $3 RETURNING id, nombre, email, direccion',
            [nombre, direccion, usuarioId]
        );

        res.json({
            mensaje: 'Perfil actualizado correctamente',
            usuario: resultado.rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({mensaje: 'Error al actualizar el perfil' });
    }
};

module.exports = {
    registrarUsuario,
    loginUsuario,
    actualizarPerfil
};    