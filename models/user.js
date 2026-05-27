const mysql = require('mysql');
const Connection = require('./mySQLConnection')

//Configuracion de la base de datos (host, usuario, contraseña, nombre de la DB y puerto)
const connection = new Connection(
	process.env.DB_HOST,
	process.env.DB_USER,
	process.env.DB_PASSWORD,
	process.env.DB_NAME,
	process.env.DB_PORT
);

let userModel = {};

userModel.getAccess = (callback) => {
	rows = connection.getData('SELECT * FROM accesos', callback);
}

userModel.getRegistro = (callback) => {
    rows = connection.getData('SELECT id_camara AS id, nombre, fecha FROM registro WHERE activo = 1', callback);
}

userModel.getInformacion = (callback) => {
	rows = connection.getData('SELECT a.id AS acceso_id, r.nombre AS nombre_usuario, a.fecha AS fecha_acceso FROM accesos a INNER JOIN registro r ON a.id_usuario = r.id;', callback);
}

userModel.getGrafica = (callback) => {
	rows = connection.getData('SELECT * FROM reportes_graficas', callback);
}

// Registra un acceso en la base de datos buscando el usuario activo por ID de cámara
userModel.insertAccess = (userData, callback) => {
    connection.insertData(
        [userData.id_usuario],
        'SELECT id FROM registro WHERE id_camara = ? AND activo = 1',
        (err, rows) => {
            if (err) return callback(err, null);
            if (!rows || rows.length === 0) {
                // Simular un error de clave foránea (errno 1452) para que userRoutes.js retorne 400
                const error = new Error('Usuario no registrado o inactivo');
                error.errno = 1452;
                return callback(error, null);
            }
            const dbId = rows[0].id;
            connection.insertData(
                [dbId],
                'INSERT INTO accesos (id_usuario) VALUES (?)',
                callback
            ).catch(() => {});
        }
    ).catch(() => {});
};

// Registra un usuario calculando el siguiente ID de DB y buscando el ID de cámara libre más bajo
userModel.insertRegistroAuto = (nombre, callback) => {
    connection.getData('SELECT IFNULL(MAX(id), 0) + 1 AS next_db_id FROM registro', (err, rows) => {
        if (err) return callback(err, null);
        const nextDbId = rows[0].next_db_id;

        connection.insertData(
            [],
            'SELECT id FROM registro WHERE id_camara = 1 AND activo = 1',
            (err2, rows2) => {
                if (err2) return callback(err2, null);

                if (!rows2 || rows2.length === 0) {
                    const nextCamaraId = 1;
                    connection.insertData(
                        [nextDbId, nextCamaraId, nombre],
                        'INSERT INTO registro (id, id_camara, nombre, activo) VALUES (?, ?, ?, 1)',
                        (err3, data) => {
                            if (err3) return callback(err3, null);
                            callback(null, { ...data, id_asignado: nextCamaraId });
                        }
                    ).catch(() => {});
                } else {
                    connection.getData(
                        'SELECT COALESCE(MIN(r1.id_camara + 1), 1) AS next_camara_id FROM registro r1 LEFT JOIN registro r2 ON r1.id_camara + 1 = r2.id_camara AND r2.activo = 1 WHERE r1.activo = 1 AND r2.id_camara IS NULL',
                        (err3, rows3) => {
                            if (err3) return callback(err3, null);
                            const nextCamaraId = rows3[0].next_camara_id;

                            connection.insertData(
                                [nextDbId, nextCamaraId, nombre],
                                'INSERT INTO registro (id, id_camara, nombre, activo) VALUES (?, ?, ?, 1)',
                                (err4, data) => {
                                    if (err4) return callback(err4, null);
                                    callback(null, { ...data, id_asignado: nextCamaraId });
                                }
                            ).catch(() => {});
                        }
                    ).catch(() => {});
                }
            }
        ).catch(() => {});
    });
};

// Realiza un borrado lógico desactivando al usuario con ese id_camara y anulando su ID de cámara
userModel.deleteRegistro = (id, callback) => {
    connection.insertData(
        [id],
        'UPDATE registro SET activo = 0, id_camara = NULL WHERE id_camara = ? AND activo = 1',
        callback
    ).catch(() => {});
};

// Realiza un borrado lógico global desactivando a todos los usuarios activos
userModel.deleteAllRegistros = (callback) => {
    connection.insertData(
        [],
        'UPDATE registro SET activo = 0, id_camara = NULL WHERE activo = 1',
        callback
    ).catch(() => {});
};

userModel.insertGrafica = (userData, callback) => {
    const bufferImagen = Buffer.from(userData.datos_binarios, 'base64');

    connection.insertData(
        [
            userData.tipo_grafica,
            userData.nombre_archivo,
            userData.formato_imagen,
            bufferImagen
        ],
        'INSERT INTO reportes_graficas (tipo_grafica, nombre_archivo, formato_imagen, datos_binarios) VALUES (?, ?, ?, ?)',
        callback
    );
}

userModel.getGraficaComando = (comando, fecha, callback) => {
    let query = 'SELECT * FROM reportes_graficas WHERE DATE(fecha_registro) = ?';

    if(comando == 'ultima'){
        query += ' ORDER BY id DESC LIMIT 1';
    } else if(comando == 'todas'){
        query += ' ORDER BY id DESC';
    } else{
        return callback(new Error('Comando no reconocido'), null);
    }

    connection.insertData([fecha], query, callback).catch(() => {});
}

module.exports = userModel;