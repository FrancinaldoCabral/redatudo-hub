import { AgentController } from "../controllers/agents/agent.controller"
import { AgentService } from "../domain/services/AgentService"
import { OpenrouterChatService } from "../infra/chat/OpenrouterChatService.imp"
import { CountCreditServiceImp } from "../infra/credits/CountCreditService.imp"
import { CreditsServiceImp } from "../infra/credits/CreditsService.imp"
import { SimpleLogger } from "../infra/logger/LoggerService.imp"
import { QdrantVectorServiceImp } from "../infra/qdrant/QdrantVectorService.imp"
import { WordPressUserServiceImp } from "../infra/wordpress/WordPressUserService.imp"

export const makeAgentControllerFactory = () =>{
    const chatService = new OpenrouterChatService()
    const logger = new SimpleLogger()
    const agentService = new AgentService(chatService, logger)

    const qdrantService = new QdrantVectorServiceImp()
    const countCreditService = new CountCreditServiceImp()
    const creditsService = new CreditsServiceImp()
    const wpUserService = new WordPressUserServiceImp()

    const agentController = new AgentController(
        agentService,
        qdrantService,
        countCreditService,
        creditsService,
        wpUserService
    )
    return agentController
}
