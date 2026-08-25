const db = require('../config/db');

// Crear un nuevo pedido
const crearPedido = async (req, res) => {
    const usuario_id = req.usuario.id;
    const { productos, direccion_envio } = req.body;

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
                throw  new Error(`Producto con ID ${item.producto_id} no existe`);
            }
            const producto = prodRes.rows[0];
            if (producto.stock < item.cantidad) {
                throw new Error(`Stock insuficiente para el producto ID ${item.producto_id}`);
            }

            total += Number(producto.precio) * item.cantidad;
        }

        // Insertar la cabecera del pedido
        const pedidoRes = await client.query(
            'INSERT INTO pedidos (usuario_id, total, estado, direccion_envio) VALUES ($1, $2, $3, $4) RETURNING *',
            [usuario_id, total, 'pendiente', direccion_envio]
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

module.exports = {
    crearPedido,
};