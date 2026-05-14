const User = require('../models/user')

module.exports = function (app, wss) {

    app.get('/users', (req, res) => {
        res.json('hola');
    });

    app.get('/access', (req, res)=>{
        User.getAccess((err, data) => {
            res.json(data)
        });
    });

    app.get('/registros', (req, res)=>{
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

    app.get('/informacion', (req, res)=>{
        User.getInformacion((err, data) => {
            res.json(data)
        });
    });

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

    
    app.post('/registro', (req, res) => {
        const userData = {
            id: req.body.id,
            nombre: req.body.nombre
        };

        User.insertRegistro(userData, (err, data) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    msg: 'Error al registrar usuario',
                    error: err.sqlMessage || err
                });
            }
            if (data && data.affectedRows) {
                res.status(200).json({
                    success: true,
                    msg: 'Usuario registrado correctamente',
                    data: data
                });
            } else {
                res.status(500).json({
                    success: false,
                    msg: 'No se pudo insertar el registro'
                });
            }
        });
    });

    app.post('/reporte', (req, res) => {
        const userData = {
            tipo_grafica: req.body.tipo_grafica,
            nombre_archivo: req.body.nombre_archivo,
            formato_imagen: req.body.formato_imagen,
            datos_binarios: req.body.datos_binarios
        };

        User.insertTabla(userData, (err, data) => {
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
                msg: 'Error: Ha ocurrido un error en el proceso' 
            });
        }
    });

}