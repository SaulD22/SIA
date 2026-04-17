const User = require('../models/user')

const API_KEY = process.env.API_KEY;

function verificarApiKey(req, res, next) {
    const apiKey = req.header('x-api-key') || req.query.api_key;

    if (!apiKey || apiKey !== API_KEY) {
        return res.status(403).json({
            success: false,
            msg: 'No autorizado'
        });
    }

    next();
}

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

    app.post('/metrics', verificarApiKey, (req, res) => {
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

    app.post('/users', verificarApiKey, (req, res) => {
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

    app.post('/accesos', verificarApiKey, (req, res) => {
        const userData = {
            id_usuario: req.body.id_usuario,
        };

        User.insertAccess(userData, (err, data) => {
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

    
    app.post('/registro', verificarApiKey, (req, res) => {
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
}