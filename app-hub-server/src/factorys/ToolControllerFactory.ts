import { ToolController } from "../controllers/tools/tool.controller";
import { CreditsServiceImp } from "../infra/credits/CreditsService.imp";
import { WordPressUserServiceImp } from "../infra/wordpress/WordPressUserService.imp";

export const makeToolControllerFactory = () => {
  const creditsService = new CreditsServiceImp();
  const wpUserService = new WordPressUserServiceImp();

  return new ToolController(creditsService, wpUserService);
};
