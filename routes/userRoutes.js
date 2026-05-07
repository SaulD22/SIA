const User = require('../models/user')

module.exports = function (app) {

    app.get('/users', (req, res) => {
        res.json('hola');
    });

    app.get('/metrics', (req, res) => {
        User.getMetrics((err, data) => {
            res.json(data)
        });
    });

    app.get('/users2', (req, res)=>{
        User.getUsers((err, data) => {
            res.json(data)
        });
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

        // 'data' es el arreglo de filas que viene de tu clase Connection
        const graficasListas = data.map(grafica => {
            // Convertimos el Buffer binario a texto Base64
            // NOTA: data.datos_binarios viene como Buffer desde el driver mysql2
            let base64String = grafica.datos_binarios.toString('base64');
            
            return {
                id: grafica.id,
                tipo_grafica: grafica.tipo_grafica,
                nombre_archivo: grafica.nombre_archivo,
                fecha_registro: grafica.fecha_registro,
                // Creamos la cadena lista para que React la use en el <img>
                imagen_url: `data:${grafica.formato_imagen};base64,${base64String}`
            };
        });

        // Enviamos el JSON ya transformado a tu compañero de React
        res.json(graficasListas);
    });
});

        app.get('/informacion', (req, res)=>{
        User.getInformacion((err, data) => {
            res.json(data)
        });
    });

    app.post('/metrics', (req, res) => {
        const userData = {
            id: req.body.id,
            result: req.body.result
        };

        User.insertResult(userData, (err, data) => {
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

    app.post('/users', (req, res) => {
        const userData = {
            id: req.body.id,
            dato: req.body.dato,
            segundo: req.body.segundo
        };

        User.insertUser(userData, (err, data) => {
            if(data && data.affectedRows){
                res.status(200).json({
                    success: true,
                    msg: 'dato insertado',
                    data: data
                });
            }else{
                res.status(500).json({
                    success: false,
                    msg: 'Error'
                });
            }
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
                    msg: `El usuario con ID ${userData.id_usuario} no está registrado en el sistema.`
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
}