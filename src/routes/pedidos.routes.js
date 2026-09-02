const express = require('express');
const router = express.Router();
const pool = require('../config/db')
const { crearPedido, obtenerPedidos } = require('../controllers/pedidos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/admin/todos', async (req, res) => {
   try {
        const consulta = `
            SELECT p.*,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', pr.id,
                               'nombre', pr.nombre,
                               'precio', pr.precio,
                               'cantidad', dp.cantidad
                           )
                       ) FILTER (WHERE pr.id IS NOT NULL), '[]'
                   ) AS productos
            FROM pedidos p
            LEFT JOIN detalle_pedidos dp ON p.id = dp.pedido_id
            LEFT JOIN productos pr ON dp.producto_id = pr.id
            GROUP BY p.id
            ORDER BY p.id DESC
        `;

        const resultado = await pool.query(consulta);
        res.json({ exito: true, data: resultado.rows });
    } catch (error) {
        console.error('Error al obtener pedidos globales:', error);
        res.status(500).json({ 
            exito: false, 
            mensaje: 'Error interno del servidor', 
            error_detallado: error.message 
        });
    }
});

router.put('/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    try {
        const resultado = await pool.query(
            'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *',
            [estado, id]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Pedido no encontrado' });
        }

        res.json({ exito: true, pedido: resultado.rows[0] });
    } catch (error) {
        console.error('Error actualizando estado del pedido:', error);
        res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
});

router.post('/', verificarToken, crearPedido);
router.get('/', verificarToken, obtenerPedidos);

module.exports = router;