import { badRequest, successRequest } from '../../controllers/protocols'
import Markdown from '../../services/markdown.service'

const markDownController = async (req, res) => {
    
    const { text, messages } = req.body
    if (!text && !messages) {
      return res.status(400).send('Text or messages are requireds.');
    }

    try {
        const markdown = new Markdown()
        if(text) {
            const content = markdown.parse(text)
            successRequest(res, 201, { content })
        }else{
            messages.forEach(message => {
                message.content = markdown.parse(message.content)
            })
            successRequest(res, 201, { messages })
        }
        
        if(messages){

        }

        
    } catch (error) {
        badRequest(res, 500, error)
    }
}

export { markDownController }