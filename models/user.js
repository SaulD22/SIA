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

userModel.getMetrics = (callback) => {
	rows = connection.getData('SELECT * FROM result', callback);
}

userModel.getUsers = (callback) => {
	rows = connection.getData('SELECT * FROM sensor', callback);
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
userModel.insertUser = (userData, callback) => {
	rows = connection.insertData(userData.dato, userData.segundo, 'INSERT INTO sensor (id, dato, segundo) VALUES (?, ?, ?)', callback);
}

userModel.insertResult = (userData, callback) => {
	rows = connection.insertData(userData.id, userData.result, 'INSERT INTO result (id, info) VALUES (?, ?)', callback);
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