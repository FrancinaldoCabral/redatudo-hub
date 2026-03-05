const corsOptions = {
    origin: function (origin: any, callback: any) {
        // Permitir requests sem origin (como apps mobile ou curl)
        if (!origin) return callback(null, true);

        // Durante desenvolvimento, permitir qualquer origem localhost
        if (origin && origin.includes('localhost')) {
            return callback(null, true);
        }

        const allowedOrigins = [
            'http://localhost:4200',
            'http://localhost:4201',
            'http://localhost:55061',
            'http://localhost:55061/',
            'https://localhost:4200',
            'https://localhost:4201',
            'https://localhost:55061',
            'https://localhost:55061/',
            'http://localhost:3001/',
            'https://localhost:3001/',
            process.env.CLIENT_URL,
            process.env.FRONTEND_URL,
            'https://chat.redatudo.online',
            'https://hub.redatudo.online'
        ].filter(Boolean); // Remove valores undefined

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

    //    console.log('CORS bloqueado para origem:', origin);
    //    console.log('Origens permitidas:', allowedOrigins);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-wordpress-user-id']
  };
  
export default corsOptions;
