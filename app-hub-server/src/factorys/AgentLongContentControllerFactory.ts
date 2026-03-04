import { AgentLongContentController } from "../controllers/agents/agent-long-content.controller"
import { AgentService } from "../domain/services/AgentService"
import { OpenrouterChatService } from "../infra/chat/OpenrouterChatService.imp"
import { CountCreditServiceImp } from "../infra/credits/CountCreditService.imp"
import { CreditsServiceImp } from "../infra/credits/CreditsService.imp"
import { SimpleLogger } from "../infra/logger/LoggerService.imp"
import { WordPressUserServiceImp } from "../infra/wordpress/WordPressUserService.imp"

export const makeAgenLongContentFactory = () =>{
    const chatService = new OpenrouterChatService()
    const logger = new SimpleLogger()
    const agentService = new AgentService(chatService, logger)

    const countCreditService = new CountCreditServiceImp()
    const creditsService = new CreditsServiceImp()
    const wpUserService = new WordPressUserServiceImp()

    const agentLongContentController = new AgentLongContentController(
        agentService,
        countCreditService,
        creditsService,
        wpUserService
    )
    return agentLongContentController
}
