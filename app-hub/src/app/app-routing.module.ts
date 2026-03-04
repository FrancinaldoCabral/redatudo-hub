import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { ChatComponent } from './chat/chat.component'
import { EbookStudioComponent } from './ebook-studio/ebook-studio.component'
import { HomeComponent } from './home/home.component'
import { InstagramCaptionsComponent } from './tools/instagram-captions/instagram-captions.component'
import { TextRewriterComponent } from './tools/text-rewriter/text-rewriter.component'
import { AcademicAssistantComponent } from './tools/academic-assistant/academic-assistant.component'
import { UsernameGeneratorComponent } from './tools/username-generator/username-generator.component'
import { CopyAidaComponent } from './tools/copy-aida/copy-aida.component'
import { TitleGeneratorComponent } from './tools/title-generator/title-generator.component'
import { AiHumanizerComponent } from './tools/ai-humanizer/ai-humanizer.component'
import { ProductDescriptionsComponent } from './tools/product-descriptions/product-descriptions.component'
import { TccThemesComponent } from './tools/tcc-themes/tcc-themes.component'
import { HashtagGeneratorComponent } from './tools/hashtag-generator/hashtag-generator.component'
import { AbntCorrectorComponent } from './tools/abnt-corrector/abnt-corrector.component'
import { AcademicConclusionComponent } from './tools/academic-conclusion/academic-conclusion.component'
import { BookNamesComponent } from './tools/book-names/book-names.component'
import { ImageEditorComponent } from './tools/image-editor/image-editor.component'
import { MotivationalQuotesComponent } from './tools/motivational-quotes/motivational-quotes.component'

const routes: Routes = [
  { path: '', component: HomeComponent },  // Nova home do Hub
  { path: 'chat', component: ChatComponent },  // Chat existente movido para /chat
  { path: 'ebook', component: EbookStudioComponent },

  // Novas ferramentas do Hub
  { path: 'gerador-titulos', component: TitleGeneratorComponent },
  { path: 'humanizador-texto', component: AiHumanizerComponent },
  { path: 'gerador-descricoes-produtos', component: ProductDescriptionsComponent },
  { path: 'gerador-temas-tcc', component: TccThemesComponent },
  { path: 'gerador-hashtags-instagram', component: HashtagGeneratorComponent },
  { path: 'corretor-texto-abnt', component: AbntCorrectorComponent },
  { path: 'gerador-conclusao', component: AcademicConclusionComponent },
  { path: 'reformular-texto', component: TextRewriterComponent },
  { path: 'legendas-instagram', component: InstagramCaptionsComponent },
  { path: 'reescrever-texto', component: TextRewriterComponent },
  { path: 'assistente-academico', component: AcademicAssistantComponent },
  { path: 'username-instagram', component: UsernameGeneratorComponent },
  { path: 'copy-aida', component: CopyAidaComponent },
  { path: 'frases-motivacionais', component: MotivationalQuotesComponent },
  { path: 'nomes-livros', component: BookNamesComponent },
  { path: 'editor-imagens', component: ImageEditorComponent },

  // Redirects para manter compatibilidade
  { path: 'old-chat', redirectTo: 'chat', pathMatch: 'full' }
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
