const db = require('../config/db');

// Crear un nuevo pedido
const crearPedido = async (req, res) => {
    const usuario_id = req.usuario.id;
    const { productos, direccion_envio, telefono } = req.body;

    if (!direccion_envio) {
        return res.status(400).json({ Error: 'La dirección de envío es obligatoria' });
    }

    if (!productos || productos.length === 0) {
        return res.status(400).json({ Error: 'El pedido debe contener al menos un producto' });
    }

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Calcular el total del pedido
        let total = 0;
        for (const item of productos) {
            const prodRes = await client.query('SELECT precio, stock FROM productos WHERE id = $1', [item.producto_id]);
            if (prodRes.rows.length === 0) {
                throw new Error(`Producto con ID ${item.producto_id} no existe`);
            }
            const producto = prodRes.rows[0];
            if (producto.stock < item.cantidad) {
                throw new Error(`Stock insuficiente para el producto ID ${item.producto_id}`);
            }

            total += Number(producto.precio) * item.cantidad;
        }

        // Insertar la cabecera del pedido
        const pedidoRes = await client.query(
            'INSERT INTO pedidos (usuario_id, total, estado, direccion_envio, telefono) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [usuario_id, total, 'pendiente', direccion_envio, telefono]
        );
        const pedidoId = pedidoRes.rows[0].id;

        // Insertar los detalles y actualizar el stock
        for (const item of productos) {
            const prodRes = await client.query('SELECT precio FROM productos WHERE id = $1', [item.producto_id]);
            const precioUnitario = prodRes.rows[0].precio;
            
            await client.query(
                'INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
                [pedidoId, item.producto_id, item.cantidad, precioUnitario]
            );

            await client.query(
                'UPDATE productos SET stock = stock - $1 WHERE id = $2',
                [item.cantidad, item.producto_id]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            mensaje: 'Pedido creado exitosamente',
            pedido: pedidoRes.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear pedido:', error);
        res.status(400).json({ Error: error.message || 'Error al procesar el pedido'});
    } finally {
        client.release();
    }
};

// Obtener los pedidos del usuario autenticado
const obtenerPedidos = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const consulta = `
            SELECT 
                p.id,
                p.total,
                p.estado,
                p.direccion_envio,
                p.telefono,
                p.creado_en,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'producto_id', dp.producto_id,
                        'cantidad', dp.cantidad,
                        'precio', dp.precio_unitario,
                        'nombre', pr.nombre
                    )
                ) AS productos
            FROM pedidos p
            JOIN detalle_pedidos dp ON p.id = dp.pedido_id
            JOIN productos pr ON dp.producto_id = pr.id
            WHERE p.usuario_id = $1
            GROUP BY p.id
            ORDER BY p.creado_en DESC
        `;

        const resultado = await db.query(consulta, [usuarioId]);

        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ mensaje: 'Error al obtener los pedidos' });
    }
};

module.exports = {
    crearPedido,
    obtenerPedidos,
};