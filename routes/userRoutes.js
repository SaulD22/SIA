const User = require('../models/user')

module.exports = function (app, wss) {

    app.get('/users', (req, res) => {
        res.json('hola');
    });

    app.get('/access', (req, res) => {
        User.getAccess((err, data) => {
            res.json(data)
        });
    });

    app.get('/registros', (req, res) => {
        User.getRegistro((err, data) => {
            res.json(data)
        });
    });

    app.get('/graficas', (req, res) => {
        User.getGrafica((err, data) => {
            if (err) {
                return res.status(500).json({ error: 'Error al obtener las gráficas' });
            }

            const graficasListas = data.map(grafica => {

                let base64String = grafica.datos_binarios.toString('base64');

                return {
                    id: grafica.id,
                    tipo_grafica: grafica.tipo_grafica,
                    nombre_archivo: grafica.nombre_archivo,
                    fecha_registro: grafica.fecha_registro,
                    imagen_url: `data:${grafica.formato_imagen};base64,${base64String}`
                };
            });

            res.json(graficasListas);
        });
    });

    app.get('/informacion', (req, res) => {
        User.getInformacion((err, data) => {
            res.json(data)
        });
    });

    // POST /accesos — ESP32 envía solo { id_usuario }. El servidor resuelve el nombre internamente.
    app.post('/accesos', (req, res) => {
        const userData = {
            id_usuario: req.body.id_usuario,
        };

        User.insertAccess(userData, (err, data) => {
            if (err) {
                if (err.errno === 1452) {
                    return res.status(400).json({
                        success: false,
                        msg: `El usuario con ID ${userData.id_usuario} no está registrado.`
                    });
                }

                return res.status(500).json({
                    success: false,
                    msg: 'Error interno del servidor',
                    error: err.sqlMessage
                });
            }

            if (data && data.affectedRows) {
                res.status(200).json({
                    success: true,
                    msg: 'Acceso registrado correctamente',
                    data: data
                });
            }
        });
    });

    // POST /registro — Android envía { nombre }. El servidor calcula el id (MAX+1) y lo devuelve.
    app.post('/registro', (req, res) => {
        const nombre = req.body.nombre;
        if (!nombre) {
            return res.status(400).json({ success: false, msg: 'El campo nombre es requerido' });
        }

        User.insertRegistroAuto(nombre, (err, data) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    msg: 'Error al registrar usuario',
                    error: err.sqlMessage || err
                });
            }
            res.status(200).json({
                success: true,
                msg: 'Usuario registrado correctamente',
                id_camara: data.id_asignado
            });
        });
    });
    
    // DELETE /registro/:id — ESP32 llama esto cuando la KPU confirma borrado de un rostro
    app.delete('/registro/:id', (req, res) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, msg: 'ID inválido' });
        }

        User.deleteRegistro(id, (err, data) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.sqlMessage });
            }
            res.status(200).json({
                success: true,
                msg: `Registro con ID ${id} eliminado`,
                data: data
            });
        });
    });

    app.delete('/registros', (req, res) => {
        User.deleteAllRegistros((err, data) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.sqlMessage });
            }
            res.status(200).json({
                success: true,
                msg: 'Todos los registros eliminados',
                data: data
            });
        });
    });

    app.post('/reporte', (req, res) => {
        const userData = {
            tipo_grafica: req.body.tipo_grafica,
            nombre_archivo: req.body.nombre_archivo,
            formato_imagen: req.body.formato_imagen,
            datos_binarios: req.body.datos_binarios
        };

        User.insertGrafica(userData, (err, data) => {
            if (data && data.affectedRows) {
                res.status(200).json({
                    success: true,
                    msg: 'dato insertado',
                    data: data
                });
            } else {
                res.status(500).json({
                    success: false,
                    msg: 'Error'
                });
            }
        });
    });


    app.post('/solicitar-grafica', (req, res) => {
        
        User.verificarAccesosHoy((err, totalAccesos) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    msg: 'Error interno al verificar los accesos de hoy' 
                });
            }

            if (totalAccesos === 0) {
                return res.status(404).json({ 
                    success: false, 
                    msg: 'No hay accesos en el dia para realizar la grafica' 
                });
            }

            let señalEnviada = false;
            const mensajePython = JSON.stringify({ accion: "generar_grafica" });

            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(mensajePython);
                    señalEnviada = true;
                }
            });

            if (señalEnviada) {
                res.status(200).json({ 
                    success: true, 
                    msg: 'Solicitud enviada' 
                });
            } else {
                res.status(503).json({ 
                    success: false, 
                    msg: 'Error: No se pudo contactar al motor de gráficas (Python desconectado)' 
                });
            }
        });
    });

    app.post('/consulta-graficas', (req, res) =>{
        const mensaje = req.body.mensaje;

        if(!mensaje){
            return res.status(400).json({success: false, msg: 'Mensaje vacío'})
        }

        const split_mensaje = mensaje.trim().split(' ');

        if(split_mensaje.length !== 2){
            return res.status(400).json({success: false, msg: 'Usa un formato correcto: Todas AAAA-MM-DD o Ultima AAAA-MM-DD'});
        }

        const comando = split_mensaje[0].toLowerCase().replace('ú', 'u');
        const fecha = split_mensaje[1];

        if(comando !== 'todas' && comando !== 'ultima') {
            return res.status(400).json({success: false, msg: 'Comando no válido, usa: Todas AAAA-MM-DD o Ultima AAAA-MM-DD'});
        }

        User.getGraficaComando(comando, fecha, (err, data) => {

            if(err) {
            return res.status(400).json({success: false, msg: "Error en el servidor", error: err.message});
            }

            if(!data || data.length == 0){
            return res.status(400).json({success: false, msg: `No hay graficas registradas para la fecha ${fecha}`});
            }

            const graficasListas = data.map(grafica => {
                let base64String = grafica.datos_binarios.toString('base64');
                return{
                    id: grafica.id,
                    tipo_grafica: grafica.tipo_grafica,
                    nombre_archivo: grafica.nombre_archivo,
                    fecha_registro: grafica.fecha_registro,
                    imagen_url: `data:${grafica.formato_imagen};base64,${base64String}`
                };
            });

            const mensajeReact = JSON.stringify({
                accion: "graficas_telegram",
                grafica: graficasListas
            });

            wss.clients.forEach((client) =>{
                if(client.readyState === WebSocket.OPEN){
                    client.send(mensajeReact)
                }
            });

            res.status(200).json({
                success: true,
                msg: `Exito. Mostrando ${graficasListas.length} graficas`
            })
        });
    });
    
}