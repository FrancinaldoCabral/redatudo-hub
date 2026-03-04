
import 'dotenv/config'
import { MongoHelper } from './services/db/mongo-helper.db'

const PORT: string = process.env.PORT || '5000'
import { server } from './app'

const URI = process.env.MONGO_URL

//server.listen(PORT, () => console.log(`Server started on PORT: ${PORT}`))
MongoHelper.connect(URI).then(success => {
  console.log('Mongodb connected.')
  server.listen(PORT, () => console.log(`Server started on PORT: ${PORT}`))
}, error => { console.log(`Não foi possível conectar MongoDb com URI: ${URI} e porta: ${PORT} => Servidor: web`, error) })
