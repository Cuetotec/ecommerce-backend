const db = require('../config/db');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

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

        const userRes = await client.query('SELECT email, nombre FROM usuarios WHERE id = $1', [usuario_id]);
        const usuario = userRes.rows[0];

        const productosProcesados = [];
        let total = 0;

        for (const item of productos) {
            const prodRes = await client.query('SELECT nombre, precio, stock FROM productos WHERE id = $1', [item.producto_id]);
            if (prodRes.rows.length === 0) {
                throw new Error(`Producto con ID ${item.producto_id} no existe`);
            }

            const producto = prodRes.rows[0];

            if (producto.stock < item.cantidad) {
                throw new Error(`Stock insuficiente para el producto ID ${item.producto_id}`);
            }

            const precioUnitario = Number(producto.precio) || 0;
            total += precioUnitario * item.cantidad;
        
            productosProcesados.push({
                producto_id: item.producto_id,
                nombre: producto.nombre,
                cantidad: item.cantidad,
                precio: precioUnitario
        });
    }

        // Insertar la cabecera del pedido
        const pedidoRes = await client.query(
            'INSERT INTO pedidos (usuario_id, total, estado, direccion_envio, telefono) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [usuario_id, total, 'pendiente', direccion_envio, telefono]
        );
        const pedidoId = pedidoRes.rows[0].id;

        // Insertar los detalles y actualizar el stock
        for (const prod of productosProcesados) {
                        
            await client.query(
                'INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
                [pedidoId, prod.producto_id, prod.cantidad, prod.precio]
            );

            await client.query(
                'UPDATE productos SET stock = stock - $1 WHERE id = $2',
                [prod.cantidad, prod.producto_id]
            );
        }

        await client.query('COMMIT');

        if (usuario && usuario.email) {
            try {
                const listaProductosHtml = productosProcesados
                    .map((prod) => {
                        const precioNum = Number(prod.precio) || 0;
                        return `<li><strong>${prod.nombre}</strong> — Cantidad: ${prod.cantidad} ($${precioNum.toFixed(2)} )</li>`;
                    })
                    .join('');

                const { data, error: resendError } = await resend.emails.send({
                    from: 'Acme <onboarding@resend.dev>',
                    to: usuario.email,
                    subject: `Confirmación de Pedido #${pedidoId}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                            <h1 style="color: #2563eb;">¡Gracias por tu compra, ${usuario.nombre || 'Cliente'}!</h1>
                            <p>Hemos recibido tu pedido <strong>#${pedidoId}</strong> con éxito.</p>
                            
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                            
                            <h3 style="color: #333;">Resumen de la compra:</h3>
                            <ul>
                                ${listaProductosHtml}
                            </ul>
                            
                            <p style="font-size: 16px;"><strong>Total pagado:</strong> $${Number(total).toFixed(2)}</p>
                            
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                            
                            <h3 style="color: #333;">Datos de envío:</h3>
                            <p><strong>Dirección:</strong> ${direccion_envio}</p>
                            <p><strong>Teléfono:</strong> ${telefono}</p>
                        </div>
                    `
                });

                if (resendError) {
                    console.error('Resend rechazó el envío:', resendError);
                } else {
                    console.log('Correo enviado con éxito. ID de Resend:', data.id);
                }
            } catch (emailError) {
                console.error('Error inesperado al enviar el correo:', emailError);
            }
        }

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