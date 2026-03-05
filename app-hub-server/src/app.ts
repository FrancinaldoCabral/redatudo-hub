import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import corsOptions from './config/corsOptions'
import apiRoutes from './routes/apiRoutes'
import * as connections from './services/connections'
import { errorMiddleware } from './middlewares/errorMiddleware'
import { registerSocketRoutes } from './sockets/socketRoutes'
import { errorToText } from './services/axios-errors.service'
import { addLog } from './services/audit.service'

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: function (origin: any, callback: any) {
        // Permitir requests sem origin (como apps mobile ou curl)
        if (!origin) return callback(null, true);

        // Durante desenvolvimento, permitir qualquer origem localhost
        if (origin && origin.includes('localhost')) {
            return callback(null, true);
        }

        const allowedOrigins = [
            'http://localhost:4201',
            'http://localhost:4200',
            'http://localhost:55061',
            'http://localhost:55061/',
            'https://localhost:4200',
            'https://localhost:55061',
            'https://localhost:55061/',
            process.env.CLIENT_URL,
            process.env.FRONTEND_URL,
            'https://chat.redatudo.online',
            'https://hub.redatudo.online'
        ].filter(Boolean); // Remove valores undefined

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

    //    console.log('Socket.IO CORS bloqueado para origem:', origin);
    //    console.log('Origens permitidas:', allowedOrigins);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
})

// Middlewares
app.use(cors(corsOptions))

// Middleware adicional para garantir que OPTIONS requests funcionem
app.options('*', cors(corsOptions))

// Middleware para debug de CORS
app.use((req, res, next) => {
  //console.log(`📡 ${req.method} ${req.path} - Origin: ${req.headers.origin} - User-Agent: ${req.headers['user-agent']}`);
  next();
})

app.use(express.json({ limit: '1000000000' }))

app.use(express.urlencoded({
  extended: true
}))

// API routes
app.use('/api', apiRoutes)

// Endpoint de teste para CORS
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS funcionando!',
    origin: req.headers.origin,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
})

//RECEBE E ENVIA RESULTADOS PARA O USUÁRIO
app.post('/job/results', (req, res) => {
  const result = req.body
  const connectionId = req.body.connectionId
  console.log('🔄 RECEBIDO /job/results:', { connectionId, status: result.status, hasContent: !!result.result })
  //console.log('jobs result userid: ', result.userId)
  const userId = result.userId
  //const newConnectionId = connections.getConnectionsByUserId(userId)
  //console.log('newConnectionId: ', newConnectionId)

  try {
    io.to(connectionId).emit('results', result)
//    console.log('✅ ENVIADO via WebSocket para:', connectionId)
    res.status(200).end()
  } catch (error) {
//    console.log('❌ ERRO ao enviar via WebSocket:', error)
    addLog(userId, errorToText(error), {})
    res.status(500).json({ error: error })
  }
})

// Middleware CORS adicional removido - usando apenas cors(corsOptions) acima

// Error handler
app.use(errorMiddleware as express.ErrorRequestHandler);

// Sockets
registerSocketRoutes(io)

export { app, server }
