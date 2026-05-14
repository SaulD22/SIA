const express = require('express');
const app = express();
const morgan = require('morgan');
require('dotenv').config();

const http = require('http');
const WebSocket = require('ws');

const cors = require('cors');

const allowedOrigins = [
	process.env.FRONTEND_URL,
	'http://localhost:5173'
];

const corsOptions = {
	origin: function (origin, callback) {
		// allow requests with no origin (like mobile apps or curl requests)
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	}
};

// settings
app.set('port', process.env.PORT || 3010);

// middlewares
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(cors(corsOptions));

const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
    console.log('Cliente Python conectado al WebSocket');

    ws.on('close', () => {
        console.log('Cliente Python desconectado del WebSocket');
    });
});

// routes
require('./routes/userRoutes')(app, wss);

server.listen(app.get('port'), () => {
    console.log(`Server on port ${app.get('port')}, con WebSockets)`);
});