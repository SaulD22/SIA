const mysql = require('mysql');
const Connection = require('./mySQLConnection')

//IP http://192.168.72.181:3010/users

//connection = mysql.createConnection({
//	host: 'localhost',
//	user: 'root',	
//	password: '1234',
//	database: 'TSCU'
//});

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
	rows = connection.getData('SELECT * FROM registro', callback);
}

userModel.getInformacion = (callback) => {
	rows = connection.getData('SELECT a.id AS acceso_id, r.nombre AS nombre_usuario, a.fecha AS fecha_acceso FROM accesos a INNER JOIN registro r ON a.id_usuario = r.id;', callback);
}

userModel.getGrafica = (callback) => {
	rows = connection.getData('SELECT * FROM reportes_graficas', callback);
}

/*
userModel.getUsers = (callback) => {
	if( connection ){
		connection.query(
			'SELECT * FROM Sensor',
			(err, rows) => {
				if(err){
					throw err;
				}else{
					callback(null, rows);
				}
			}
		);
	}
};
*/

userModel.insertAccess = (userData, callback) => {
    connection.insertData(
        [userData.id_usuario],
        'INSERT INTO accesos (id_usuario) VALUES (?)',
        callback
    ).catch(() => {});
}

userModel.insertRegistro = (userData, callback) => {
	connection.insertData(
		[userData.id, userData.nombre],
		'INSERT INTO registro (id, nombre) VALUES (?, ?)',
		callback
	);
}

userModel.insertTabla = (userData, callback) => {
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


/*
userModel.insertUser = (userData, callback) => {
	if( connection ){
		console.log(userData);
		connection.query(
			'INSERT INTO Sensor SET ?', userData,
				(err, result) => {

					if( err  ){
						throw err;
					}else{
						console.log(result);
						callback(null, {
							affectedRows: result.affectedRows
						});
					}
				}
		);
	}
};
*/

module.exports = userModel;