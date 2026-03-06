import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
// Import library module
import { NgxSpinnerModule } from 'ngx-spinner'
import { BrowserModule } from '@angular/platform-browser'
import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { UtilModule } from './util-component/util.module'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { AuthService } from './services/auth.service'
import { TokenInterceptor } from './services/token.interceptor'
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http'
import { SocketService } from './services/socket.service'
import { ChatComponent } from './chat/chat.component'
import { ChatService } from './services/chat.service'
import { LoginComponent } from './login/login.component'
import { HighlightService } from './services/highlight.service'
import { LanguageService } from './services/language.service'
import { ToastrModule, ToastrService } from 'ngx-toastr'
import { FileUploadService } from './services/file-upload.service'
import { BackgroundAnimatedComponent } from './util-component/background-animated/background-animated.component'
import { AutosizeModule } from 'ngx-autosize'
import { ModelService } from './services/llm.service'
import { FileRenderComponent } from './file-render/file-render.component'
import { NgxDocViewerModule } from 'ngx-doc-viewer'
import { MarkdownService } from './services/markdown.service'
import { ToolsService } from './services/tools.service'
import { ToolComponent } from './tool/tool.component'
import { MarkdownModule, MarkedOptions } from 'ngx-markdown'
import { markedOptionsFactory } from './markdown-options'
import { FileRenderService } from './services/file-render.service'
import { CalcPriceService } from './services/calc-price.service'
import { HistoricComponent } from './historic/historic.component'
import { PaginationService } from './services/pagination.service'

import { GoogleTagManagerModule } from 'angular-google-tag-manager'
import { EmailVerifyComponent } from './email-verify/email-verify.component'
import { EmailService } from './services/email.service'
import { UserAdminComponent } from './user-admin/user-admin.component'

import * as MarkdownIt from 'markdown-it'
import markdownItAttrs from 'markdown-it-attrs'

import { AdsenseModule } from 'ng2-adsense'
import { UserApiService } from './services/user-api.service'
import { TruncateApiKeyPipe } from './truncate-api-key.pipe'
import { PdfService } from './services/pdf.service'
import { FavoritesService } from './services/favorites.service'
import { AnalyticsService } from './services/analytics.service'
import { EmailVerificationModalComponent } from './components/email-verification-modal/email-verification-modal.component'
import { EmailVerificationInterceptor } from './interceptors/email-verification.interceptor'
import { I18nModule } from './i18n/i18n.module'
import { TranslateService } from '@ngx-translate/core'
// import ngx-translate and the http loader
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { LoaderComponent } from './loader/loader.component'
import { SelectModelComponent } from './select-model/select-model.component'
import { NgSelectModule } from '@ng-select/ng-select';
import { CheckoutModalComponent } from './checkout-modal/checkout-modal.component';
import { EbookStudioComponent } from './ebook-studio/ebook-studio.component'
import { LongContentService } from './long-content.service'
import { InfiniteBackgroundComponent } from './infinite-background/infinite-background'
import { EbookStateService } from './services/ebook-estate.service';
import { DragDropModule } from '@angular/cdk/drag-drop'

// Novos componentes do Hub de Ferramentas
import { ToolLayoutComponent } from './tools/shared/tool-layout/tool-layout.component'
import { ResultCardComponent } from './tools/shared/result-card/result-card.component'
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
import { MotivationalQuotesComponent } from './tools/motivational-quotes/motivational-quotes.component'
import { BookNamesComponent } from './tools/book-names/book-names.component'
import { ImageEditorComponent } from './tools/image-editor/image-editor.component'

// Componentes compartilhados reutilizáveis
import { TextareaAiComponent } from './tools/shared/textarea-ai/textarea-ai.component'
import { ResultGridComponent } from './tools/shared/result-grid/result-grid.component'
import { ComparisonViewComponent } from './tools/shared/comparison-view/comparison-view.component'
import { CopyButtonComponent } from './tools/shared/copy-button/copy-button.component'
import { FavoriteButtonComponent } from './tools/shared/favorite-button/favorite-button.component'
import { UpgradePromptComponent } from './tools/shared/upgrade-prompt/upgrade-prompt.component'
import { LoadingStateComponent } from './tools/shared/loading-state/loading-state.component'
import { TapToCopyCardComponent } from './tools/shared/tap-to-copy-card/tap-to-copy-card.component'

// Novos componentes de créditos e header
import { ToolHeaderComponent } from './components/tool-header/tool-header.component'
import { CreditsModalComponent } from './components/credits-modal/credits-modal.component'

// Serviços centralizados
import { BalanceService } from './services/balance.service'

export function markdownItFactory(): MarkdownIt {
  const markdownIt = new MarkdownIt()
  markdownIt.use(markdownItAttrs)
  return markdownIt
}

@NgModule({
  declarations: [
    AppComponent,
    ChatComponent,
    LoginComponent,
    EmailVerifyComponent,
    BackgroundAnimatedComponent,
    FileRenderComponent,
    ToolComponent,
    HistoricComponent,
    UserAdminComponent,
    TruncateApiKeyPipe,
    LoaderComponent,
    SelectModelComponent,
    CheckoutModalComponent,
    EbookStudioComponent,
    InfiniteBackgroundComponent,
    // Novos componentes do Hub
    ToolLayoutComponent,
    ResultCardComponent,
    HomeComponent,
    InstagramCaptionsComponent,
    TextRewriterComponent,
    AcademicAssistantComponent,
    ProductDescriptionsComponent,
    UsernameGeneratorComponent,
    CopyAidaComponent,
    TitleGeneratorComponent,
    AiHumanizerComponent,
    ProductDescriptionsComponent,
    TccThemesComponent,
    HashtagGeneratorComponent,
    AbntCorrectorComponent,
    AcademicConclusionComponent,
    MotivationalQuotesComponent,
    BookNamesComponent,
    ImageEditorComponent,
    // Componentes compartilhados reutilizáveis
    TextareaAiComponent,
    ResultGridComponent,
    ComparisonViewComponent,
    CopyButtonComponent,
    FavoriteButtonComponent,
    UpgradePromptComponent,
    LoadingStateComponent,
    TapToCopyCardComponent,
    // Novos componentes de header e modal
    ToolHeaderComponent,
    CreditsModalComponent,
    // Email verification
    EmailVerificationModalComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    NgxSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    UtilModule,
    AutosizeModule,
    NgxDocViewerModule,
    DragDropModule,
    TranslateModule.forRoot({
      loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
      }
    }),
    MarkdownModule.forRoot({
      markedOptions: {
        provide: MarkedOptions,
        useFactory: markedOptionsFactory,
      },
    }),
    ToastrModule.forRoot(),
    GoogleTagManagerModule.forRoot({
      id: 'GTM-WTCTSRT',
    }),
    AdsenseModule.forRoot(),
    I18nModule
  ],
  providers: [
    HighlightService,
    AuthService, 
    EmailService,
    {
      provide: HTTP_INTERCEPTORS, 
      useClass: TokenInterceptor, 
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: EmailVerificationInterceptor,
      multi: true
    },
    SocketService,
    ChatService,
    LanguageService,
    ToastrService,
    FileUploadService,
    ModelService,
    MarkdownService,
    ToolsService,
    FileRenderService,
    CalcPriceService,
    PaginationService,
    UserApiService,
    PdfService,
    LongContentService,
    EbookStateService,
    // Novos serviços
    FavoritesService,
    AnalyticsService,
    BalanceService,
    provideHttpClient(withInterceptorsFromDi())
  ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  bootstrap: [AppComponent]
})
export class AppModule { }

// required for AOT compilation
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './i18n/', '.json')
}
