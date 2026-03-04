import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core'
import { SocketService } from '../services/socket.service'
import { ChatService } from '../services/chat.service'
import { AuthService } from '../services/auth.service'
import { HighlightService } from '../services/highlight.service'
import { LanguageService } from '../services/language.service'
import { ToastrService } from 'ngx-toastr'
import { FileUploadService } from '../services/file-upload.service'
import { ModelService } from '../services/llm.service'
//import { MarkdownService } from '../services/markdown.service'
import { MarkdownService } from 'ngx-markdown'
import { Tool, ToolsService } from '../services/tools.service'
import { CalcPriceService } from '../services/calc-price.service'
import * as moment from 'moment'
import { HistoricService } from '../services/historic.service'
import { GoogleTagManagerService } from 'angular-google-tag-manager'
import { EmailService } from '../services/email.service'
import { UserApiService } from '../services/user-api.service'
import { ActivatedRoute } from '@angular/router'
import { PaymentService } from '../payment.service'

declare var Prism: any

@Component({ 
    selector: 'app-chat', 
    templateUrl:'./chat.component.html', 
    styleUrls: ['./chat.component.css']
}) 
export class ChatComponent implements OnInit, AfterViewInit { 
    messages: any[] = [] 
    myFiles: any[] = []
    creditProductId = 21347
    domainUrl: string = `https://redatudo.online`
    currentMessage: string = ''
    
    sendSpinner: boolean = false
    uploadSpinner: boolean = false
    deleteFileSpinner: boolean[] = []
    indexedFileSpinner: boolean[] = []
    copyCheck: boolean = false
    
    status: string = ''
    media: any = null

    selectLanguage: string
    selectedModel: string = ''
    modelsLoading: boolean = false

    isEditable: boolean[] = []
    welcomeJob: any = ''
    job: { id: any } = { id:'' }
    selectedFile: any = null
    usedFile: any = null

    filesIdexedUrls: string[] = []

    contentTypeFilter: string = 'all'
    mediaMessages: any[] = []
    linksFileToRemoveTemp: string[] = []
    
    fileFilterInput: string = ''
    filterFilesType:any[]= []
    offsetFiles: number = 0

    providers: any[] = []
    providersSpinner: boolean = false
    removeProvidersSpinner: boolean[] = [false, false]

    formFeedback: any

    tool: Tool = {
        title:'', 
        description:'', 
        schema: {},
        icon: '',
        toolsNames:[]
    }
    tools: Tool[] = []
    activatedTools: any = []
    waitSpinner: boolean = false
    locFiles: string = 'uploads/'
    balance: number = 0
    formProvider: any = { provider:'openrouter', key:'' }

    inputCredits:number = 5

    openrouterModels: any[] = []

    @ViewChild('textareaMessage') textareaMessage: ElementRef | undefined
    @ViewChild('audioPlayer') audioPlayer: ElementRef | undefined

    itemsPerPage: number = 10
    public currentPage = 1
    public totalItems = 0

    sessionId: string | null = null
    paymentDetails: any

    constructor(
        private socketService: SocketService,
        private chatService: ChatService,
        private auth: AuthService,
        private languageService: LanguageService,
        private toastr: ToastrService,
        private fileUploadService: FileUploadService,
        private modelService: ModelService,
        private markdownService: MarkdownService,
        private toolsService: ToolsService,
        private calcPriceService: CalcPriceService,
        private historicService: HistoricService,
        private gtmService: GoogleTagManagerService,
        private emailService: EmailService,
        private userApiService: UserApiService,
        private route: ActivatedRoute,
        private paymentService: PaymentService
    ){
        this.selectLanguage = this.getCurrentLanguage()
        this.socketService.getResultSource$.subscribe(
            response => {
                this.status = response.status
                if(response.status.toLowerCase()=='completed' && response.result.role){ 
                    const { result } = response        
                    const { role, content, formFeedback } = result
                    this.sendSpinner = false
                    this.messages.push({ role, content, formFeedback })

                    this.gtmService.pushTag({
                        event: 'spend_virtual_currency',
                        modelName: this.modelService.getActualModel()
                    })
                    this.messageReceiverAudioPlay()                    
                    this.fetchBalance()
                    this.scrollToBottom()
                }else if(response.status.toLowerCase()=='error' || response.status.toLowerCase()=='failed'){
                    const { result } = response 
                    console.log('RESULT ERROR: ', result)       
                    const { msg } = result
                    this.sendSpinner = false
                    let content: string = ''
                    if(msg==='Error message: \n      Message: \"no credit\"\n      '){
                        content = `
                        <p class="card-text">😅 Ops! <strong>Creditos insuficientes...</strong>
                        Navegue até o menu USAGE e adquira mais créditos.</p>
                        <p class="card-text">Você também pode usar REDATUDO <strong>ilimitado</strong> com suas chaves de api OPENAI e REPLICATE. Neste caso REDATUDO é grátis.</p>
                        <p>Se você já têm uma chave de api Openai e Replicate, navegue até o menu SETTINGS e registre suas apis para utilizar redatudo gratuitamente. Caso ainda não possua chaves de api, descubra como adquirir <a target="_blank" href="https://redatudo.online/como-criar-uma-api-key-na-openai-e-na-replicate/">neste post</a>
                        </p>
                        `
                        const messageError = { role:'assistant', content }
                        this.messages.push(messageError) 
                    }else if((msg as string).includes('Incorrect API key provided') && (msg as string).includes('https://platform.openai.com/account')){
                        content =  `
                        <p class="card-text">😅 Ops! Parece que você forneceu uma chave de api inválida...
                        Navegue até o site <a href="https://platform.openai.com/account" target="_blank">https://platform.openai.com/account</a> e verifique se há algum problema com sua chave de api ou crie uma chave nova.</p>
                        <p class="card-text">Após criar sua nova chave de api, remova a anterior e adicione a nova chave no menu settings.</p>
                        <p class="card-text">Se não conseguir usar uma chave de api, apenas remova a chave defeituosa e continue utilizando redatudo com créditos. Adicione créditos se necessário.</p>
                        <p class="card-text"><strong>📞 Fale com o suporte humano a qualquer momento:</strong></p>
                        <p class="card-text">
                            Email: <a href="mailto:suporte@redatudo.online">suporte@redatudo.online</a> <br>
                            Whatsapp: <a href="https://wa.me/556584011436">Inicie uma conversa.</a> <i class="bi bi-whatsapp"></i>
                        </p>
                        <p class="card-text">Obrigado pela paciência! 😊</p>
                        `
                        const messageError = { role:'assistant', content }
                        this.messages.push(messageError)                        
                    
                    }else if(msg.includes('Job cancelled')){
                        this.sendSpinner = false
                        this.status = 'Canceled.'
                        toastr.info('Canceled.')
                    }else {
                        content =  `
                        <p class="card-text">😅 Ops! Parece que algo não saiu como esperado...
                        Nosso servidor tirou uma sonequinha e deu um erro 500.
                        Não se preocupe, já estamos acordando ele! 🚀</p>
    
                        <p class="card-text"><strong>🔄 O que você pode fazer:</strong></p>
                        <ul>
                            <li>Aguarde alguns minutos ⏳</li>
                            <li>Recarregue a página <i class="bi bi-arrow-clockwise"></i></li>
                        </ul>
                        <p class="card-text">Se isso não funcionar, clique em Sair e recarregue novamente <i class="bi bi-box-arrow-right"></i></p>
                        <p class="card-text"><strong>📞 Fale com o suporte humano a qualquer momento:</strong></p>
                        <p class="card-text">
                            Email: <a href="mailto:suporte@redatudo.online">suporte@redatudo.online</a> <br>
                            Whatsapp: <a href="https://wa.me/556584011436">Inicie uma conversa.</a> <i class="bi bi-whatsapp"></i>
                        </p>
                        <p class="card-text">Obrigado pela paciência! 😊</p>
                        `
                        const messageError = { role:'assistant', content }
                        this.messages.push(messageError)
                    }
                    
                    this.messageReceiverAudioPlay()
                    this.fetchBalance()
                    this.scrollToBottom()
                    this.scrollToBottom()
                }else if (
                    response.status.toLowerCase()=='active' || 
                    response.status.toLowerCase()=='wait' ||
                    response.status.toLowerCase()=='delayed' ||
                    response.status.toLowerCase()=='processing...' 
                ) {
                    this.job.id = response.result.id
                }else if(response.status.toLowerCase()=='cancel'){
                    this.status = 'Canceling...'
                }
            },
            error => {
                this.handleError(error)
            }
        )
        
        this.auth.getAuthenticateAsObservable().subscribe(
            success => { 
                if(success) {
                  this.fetchAll()
                }
            }
        )

        this.emailService.getConfirmedAsObservable().subscribe(
            success => { 
                if(success) {
                  this.fetchAll()
                }
            }
        )
    }

    checkPayment(): void {
        this.sessionId = this.route.snapshot.queryParamMap.get('session_id');

        if (this.sessionId) {
          // opcional: buscar detalhes da sessão no seu backend para exibir confirmação
          this.paymentService.checkSessionId(this.sessionId).subscribe(
            success => {
                this.paymentDetails = success
                console.log(this.paymentDetails)
            },
            error => {
                console.log(error)
            }
          )
        }
    }

    compareFn(item:any, selected:any) {
        return item.id === selected.id;
    }

    dateFormat(date: Date | string): string {
        return moment(date, "YYYYMMDD").fromNow()
    }

    calcPrice(inputCredits:number): number {
        return this.calcPriceService.calcularPrecoVenda(inputCredits)
    }

    sendFeedback(feedback:string): void {
        const form = { firstMessage:this.formFeedback.firstMessage, assistantMessage:this.formFeedback.assistantMessage, 
            toolCallsText:this.formFeedback.toolCallsText, feedback }
        this.socketService.sendFeedback(form)
        this.toastr.success('Feedback sent')
    }

    setFeedback(firstMessage:string, assistantMessage:string, toolCallsText:string): void {
        const formFeedback = { firstMessage, assistantMessage, toolCallsText }
        this.formFeedback = formFeedback
    }

    parseMarkdown(content: string): any {
        return this.markdownService.parse(content)
    }

    setTool(tool: Tool): void {
        this.tool = tool
    }
    
    /* ngAfterViewChecked(): void {
        this.highlightService.highlightAll()
    } */

    fetchAll(): void {
        this.fetchFiles()
        this.fetchToolActivate()
        this.fetchBalance()
        this.fetchProviders()
        this.getOpenrouterModels()
    }

    ngOnInit(): void {   
        this.checkPayment()    
        this.selectLanguage = this.getCurrentLanguage()
        //this.selectedModel = this.getCurrentModel()

        this.gtmService.pushTag({
            event: 'page_view',
            page_location: 'chat.redatudo.online'
        })

        this.auth.getAuthenticateAsObservable().subscribe(
            success => { 
                if(success) {
                    this.fetchAll()
                }
            }
        )
        const elements = document.querySelectorAll('[data-toggle="tooltip"]')
        elements.forEach(el => {
            //el.tooltip() as any
        })
        this.textareaMessage?.nativeElement.focus()
    }

    getStringify(obj:any): string {
        return JSON.stringify(obj)
    }

    getJson(obj:string): string {
        return JSON.parse(obj)
    }

    getProperties(obj:any): any {
        return obj.function?.parameters
    }

    keysFromProperties(obj:any): any[]{
        return Object.keys(obj)
    }

    fetchToolsAndAgents(): void {
        this.waitSpinner = true
        this.toolsService.getTools().subscribe(
            success => { 
                this.tools = success; 
            }, error => {
                this.waitSpinner = false
                this.handleError(error)
            },
            () => {
              this.waitSpinner = false
            }
        )
    }

    defaultCurrentMessage(): void {
        setTimeout(() => {
            this.currentMessage = ''
            this.textareaMessage?.nativeElement.focus()
            this.scrollToBottom()
        }, 100)
    }

    scrollToBottom(): void {
        setTimeout(() => {
            const fimContainer = document.getElementById('fim_container') as HTMLDivElement;
            if (fimContainer) {
                const height = fimContainer.scrollHeight;
                try {
                    fimContainer.scrollIntoView({ behavior: 'instant', block: 'end', inline: 'end' });
    
                    // Força a atualização do AdSense
                    // this.openAd()
                    if ((window as any).adsbygoogle) {
                        (window as any).adsbygoogle.push({});
                    }
                } catch (err) {
                    console.error('Erro ao tentar rolar para o fim ou carregar o AdSense:', err);
                }
            }
        }, 1000);
    }

    closeAd(): void {
        const toast = document.getElementById('toastAdsense')
        if(toast) {
            if(toast.classList.contains('show')){
                toast.classList.remove('show')
            }
        }
    }

    openAd(): void {
        const toast = document.getElementById('toastAdsense')
        if(toast) {
            if(!toast.classList.contains('show')){
                toast.classList.add('show')
            }
        }
    }

    editZIndexAdsense(): void {
        const toast = document.getElementById('toastAdsense')
        if(toast) toast.style.zIndex = toast.style.zIndex == "10000" ? "0" : "10000";
    }
    

    ngAfterViewInit(): void {
        try {
            (window as any).adsbygoogle = (window as any).adsbygoogle || [];
            (window as any).adsbygoogle.push({});
          } catch (e) {
            console.error('Erro ao carregar o AdSense', e);
        }
    }

    getSocketIsConnect(): boolean {
        return this.socketService.getSocketIsConnect()
    }

    inputAndSendMessage(): void {
        this.isEditable = []
        let message
        if(this.sendSpinner) return
        if (this.currentMessage && this.sendSpinner == false && !this.usedFile) {
            message = { role:'user', content: this.currentMessage }
        }else if(this.currentMessage && this.sendSpinner == false && this.usedFile){
            const content = this.currentMessage
            this.mediaMessages[this.messages.length]=this.usedFile
            message = { role:'user', content }
        }
        this.messages.push(message)
        this.sendMessage()
    }

    editMessage(index: number): void {
        this.isEditable[index] = !this.isEditable[index]
    }

    extrairMensagem(htmlString: string): string {
        // Expressão regular para remover tags HTML
        const regex = /<[^>]*>/g
        // Substitui todas as tags HTML por uma string vazia
        const mensagemSemTags = htmlString.replace(regex, '')
        // Retorna apenas a mensagem
        return mensagemSemTags.trim()
    }

    msgsContentToHtml(messages: any[]): any[] {
        return messages.map((msg, index)=>{
            if(msg.role=='user' && this.mediaMessages[index]){
                const role = msg.role
                //const content = `<a href="${this.mediaMessages[index].downloadLink}" target="_blank" class="badge bg-secondary p-1 mb-1 card-link"><strong><i class="${this.getIconByTypeFile(this.mediaMessages[index].contentType)}"></i>${this.mediaMessages[index].fileName}</strong></a><p class="card-text p-1">${msg.content}</p>`
                const content = `[doc](${this.mediaMessages[index].downloadLink}) ${msg.content}`
                return { role, content}
            }else if(msg.role=='user' && !this.mediaMessages[index]){
                const role = msg.role
                const content = `${msg.content}`
                return { role, content}
            }else {
                return msg
            }
        })
    }
    
    sendMessage() { 
        this.status = 'Sending...'
        this.sendSpinner = true
        //call
        this.defaultCurrentMessage()
        const messages = this.msgsContentToHtml(this.messages)
        this.socketService.sendMessage(messages, this.modelService.getActualModel(), 'chat')
        this.cancelUsedFile()
    }

    messageReceiverAudioPlay(): void {
        const audioElement: HTMLAudioElement = this.audioPlayer?.nativeElement
        
        // Pausa o áudio se já estiver reproduzindo
        if (!audioElement.paused) {
          audioElement.pause()
          audioElement.currentTime = 0 // Reinicia para o início
        }
    
        // Inicia a reprodução
        audioElement.volume = 0.5
        audioElement.play()
    }

    logout(): void {
        this.auth.logout()
    }

    getToken():string {
        return this.auth.getToken()
    }

    getLanguages(): string[] {
        return this.languageService.getLanguages()
    }

    setModel(model: string): void {
        this.selectedModel = model
        this.modelService.setCurrentModel(this.selectedModel)
        console.log('Selecionado:', this.selectedModel)
        this.toastr.success(`Updated model.`)
    }

    getCurrentModel(): string {
        return this.modelService.getActualModel()
    }

    getModels(): string[] {
        return this.modelService.getLlmModels()
    }

    getOpenrouterModels(): void {
        this.modelService.getOpenrouterModels(['tools']).subscribe(
            success => {
                this.openrouterModels = success.models
                
                this.selectedModel = this.getCurrentModel() &&  this.openrouterModels.map(m=>m.id).includes(this.getCurrentModel()) ? this.getCurrentModel() : 'openai/gpt-4.1-mini'
                console.log(this.selectedModel)
            },
            error => {
                console.log(error)
            }
        )
    }

    getOpenrouterModelById(modelId:string): any {
        const model = this.openrouterModels.filter((m)=>{ 
            return m.id === modelId 
        })[0]
        return model
    }

    // Na sua classe do component
    calculatePricePerMillionTokens(model: any): string {
        if (!model.pricing) return 'N/A';
        
        const promptPrice = (model.pricing.prompt || 0) * 1000; // preço por 1K tokens -> por token
        const completionPrice = (model.pricing.completion || 0) * 1000;
        
        const avgPricePerToken = (promptPrice + completionPrice) / 2 / 1000; // preço médio por token
    
        const pricePerMillionTokens = avgPricePerToken * 1_000_000; // 1 milhão de tokens
    
        return pricePerMillionTokens.toString(); // USD com 2 casas
    }
  
    calculatePricePerThousandWords(model: any): string {
        if (!model.pricing) return 'N/A';
        
        const promptPrice = (model.pricing.prompt || 0) * 1000;
        const completionPrice = (model.pricing.completion || 0) * 1000;
        
        const avgPricePerToken = (promptPrice + completionPrice) / 2 / 1000;
    
        // 1 palavra = 1.33 tokens (média)
        const tokensPerWord = 4;
        const words = 1000;
        const tokensNeeded = words * tokensPerWord; // 1330 tokens
    
        const priceForThousandWords = avgPricePerToken * tokensNeeded;
    
        return priceForThousandWords.toString();
    }

    getCurrentLanguage(): string {
        return this.languageService.getCurrentLanguage()
    }

    setLanguage(language:string): void {
        this.languageService.setLanguage(language)
    }

    regenerate(index:number): void {
        if(this.sendSpinner==false || this.getSocketIsConnect()){
            this.isEditable = []
            this.messages.splice(index+1, this.messages.length - index+1)
            this.sendMessage()
        }
    }

    reloadPage(): void {
        this.messages = []
        this.mediaMessages = []
        this.socketService.newChat()
        this.toastr.success('New chat')
    }

    welcome(): void {
        if(this.messages.length == 0){
            this.status = 'Just wait a moment, please...'
            this.sendSpinner = true
            this.messages.push({ role:'user', content:''})
            this.chatService.welcomeMessage().subscribe(
                response => {
                    this.welcomeJob = response.id
                },
                error => {
                    this.messages = []
                    this.status = ''
                    this.welcomeJob = false
                    this.sendSpinner = false
                    const content =  `
                    <p class="card-text text-danger">
                        <i class="bi bi-info-circle"></i>
                        Sorry, there was an internal error.
                    </p>
                    `
                    this.handleError(error)
                    const messageError = { role:'assistant', content }
                    this.messages.push(messageError)
                }
            )
        }
    }

    onModelSelected(event:any): void {
        //const selectedValue = (event.target as HTMLSelectElement).value
        try {
            this.setModel(event.id)
        } catch (error) {
            this.setModel('openai/gpt-4.1-mini')
        }
    }

    customSearchFn(term: string, item: any) {
		term = term.toLowerCase()
		return item.name.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) === term ||
        item.platform.toLowerCase().includes(term)
	}

    cancelJob(): void {
        console.log('cancel job: ', this.job.id)
        this.socketService.cancelJob(this.job.id)
    }

    copy(i:number): void {
        this.copyCheck = true
        setTimeout(() => {
            this.copyCheck = false
        }, 3000);
        const textarea = document.createElement('textarea')
        //const contentTag = document.getElementById(`${i}spanAssistantContent`)
        //const textContent = contentTag?.textContent?.trim()
        textarea.value = this.messages[i].content as string
        document.body.appendChild(textarea)
        textarea.select()
        textarea.setSelectionRange(0, 99999)
        document.execCommand('copy')
        document.body.removeChild(textarea)
        //this.toastr.success('Copied content.')
    }

    getIconByTypeFile(type: string): string {
        let imageExcessions = ['.webp', '.tiff']
        if(type){
            if(imageExcessions.includes(type)) return `bi bi-image-alt`
            return `bi bi-filetype${type.replace('.', '-')}`
        }else{
            return `bi bi-files-alt`
        }
    }

    selectFile(): void {
        document.getElementById('attach')?.click()
    }

    cancelUsedFile(): void {
        this.usedFile = null
    }

    onFileSelected(event: any): void {
        this.selectedFile = event.target.files[0]
        this.uploadFile()
    }
    
    uploadFile(): void {
        this.uploadSpinner = true
        if (this.selectedFile) {
          this.fileUploadService.uploadFile(this.selectedFile).subscribe(
            (response) => {
              this.toastr.success('Upload successful.')
              this.uploadSpinner = false
              this.selectedFile = null
              this.fetchAll()
            },
            (error) => {
              this.toastr.success('Upload error.')
              this.uploadSpinner = false
              this.selectedFile = null
              this.fetchAll()
            }
          )
        } else {
            this.toastr.info('Select a file.')
            this.uploadSpinner = false
            this.selectedFile = null
        }
    }

    fetchFiles(): void {
        const offset = (this.currentPage - 1) * this.itemsPerPage
        this.uploadSpinner = true
        this.fileUploadService.getFiles(
            offset, 
            this.itemsPerPage, 
            this.fileFilterInput, 
            this.contentTypeFilter, 
            this.locFiles).subscribe(
            success => {
                this.myFiles = success.files
                this.totalItems = success.count
                this.filterFilesType = success.filterFilesType
                this.uploadSpinner = false
                //this.toastr.info('LoadFiles uploaded successfully')
                this.getFilesUrls()
            },
            error => {
                this.uploadSpinner = false
                this.handleError(error)
            }
        )
    }

    onFileSelectedJson(event: any): void {
        const file: File = event.target.files[0];
        if (file && file.type === 'application/json') {
          const reader = new FileReader()
          reader.onload = (e: any) => {
            try {
              const json = JSON.parse(e.target.result);
              if (Array.isArray(json) && this.isValidMessagesArray(json)) {
                this.messages = json
                document.getElementById('btnCloseMessagesFile')?.click()
                this.toastr.success('Ok')
              } else {
                console.error('Invalid JSON format. Expected an array of messages.')
                this.toastr.error('Invalid JSON format. Expected an array of messages.')
              }
            } catch (error) {
              console.error('Error parsing JSON:', error)
            }
          }
          reader.readAsText(file)
        } else {
          console.error('Invalid file type. Please select a .json file.')
        }
    }

    private isValidMessagesArray(json: any[]): boolean {
        // Adicione sua lógica de validação aqui
        // Por exemplo, verifique se cada item no array possui as propriedades necessárias
        return json.every(item => item.hasOwnProperty('role') && item.hasOwnProperty('content'))
    }

    saveMessages() {
        const data = JSON.stringify(this.messages, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const date = new Date()
        a.download = `messages-${date.getTime()}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    }

    removePathFileName(caminhoCompleto: string): string {
        // Divide o caminho completo em partes usando a barra como delimitador
        const partesDoCaminho = caminhoCompleto.split('/')
    
        // O nome do arquivo é a última parte do caminho
        const nomeDoArquivo = partesDoCaminho.pop()
    
        // Retorna apenas o nome do arquivo
        return nomeDoArquivo || '' // Retorna uma string vazia se não houver nome de arquivo
    }

    setFileToRemove(urls:any[] | string): void {
        if(Array.isArray(urls)) this.linksFileToRemoveTemp = urls.map((item:any)=>{return item.pathName })
        else this.linksFileToRemoveTemp = [urls]
    }

    deleteFiles(pathsName: string[]): void {
        pathsName.forEach((pathName:string, i:number)=>{
            this.deleteFileSpinner[i] = true
            this.fileUploadService.deleteFiles(pathName).subscribe(
                success => {
                    this.deleteFileSpinner[i] = false
                    this.toastr.success(pathName)
                    this.fetchAll()
                },
                error => {
                    this.handleError(error)
                    this.deleteFileSpinner[i] = false
                },
                () => {
                    this.deleteFileSpinner[i] = false
                }
            )

        })
    }

    useFile(file:any): void {
        this.usedFile = file
        document.getElementById('uploadModalButton')?.click()
    }

    indexFile(docUrl: string, index:number): void {
        this.indexedFileSpinner[index] = true
        this.fileUploadService.indexFile(docUrl).subscribe(
            success => {
                this.indexedFileSpinner[index] = false
                this.fetchAll()
                this.toastr.success('File indexed successfully.')
            }, 
            error => {
                this.indexedFileSpinner[index] = false
                this.fetchAll()
                this.handleError(error)
            }
        )
    }

    deleteIndexFile(docUrl:string, index:number): void {
        this.indexedFileSpinner[index] = true
        this.fileUploadService.deleteIndexFile(docUrl).subscribe(
            success => {
                this.indexedFileSpinner[index] = false
                this.toastr.success('The file has been removed from the semantic database.')
                this.fetchAll()
            },
            error => {
                this.handleError(error)
                this.indexedFileSpinner[index] = false
                this.fetchAll()
            },
            () => {
                this.indexedFileSpinner[index] = false
            }
        )
    }

    getFilesUrls(): void {
        this.uploadSpinner = true
        this.fileUploadService.getFilesUrl().subscribe(
            success => {
                this.uploadSpinner = false
                this.filesIdexedUrls = success
            }, 
            error => {
                this.uploadSpinner = false
                this.handleError(error)
            }
        )
    }

    filterFiles(): any[]{
        let myFiles
        if(this.contentTypeFilter === 'all') myFiles =  this.filterLocFile()
        else myFiles = this.filterLocFile().filter(file=>{return file.contentType === this.contentTypeFilter})
        if(this.fileFilterInput.length>0) myFiles = this.filterLocFile().filter(file=>{return file.fileName.includes(this.fileFilterInput) || file.contentType.includes(this.fileFilterInput) || file.publicLink.includes(this.fileFilterInput)})
        
        return myFiles
    }

    filterLocFile():any[]{
        return this.myFiles.filter(f=>{return f.publicLink.includes(this.locFiles)})
    }

    filterFilesNow(contentType: string): void {
        this.contentTypeFilter = contentType
    }

    getFilterFilesType(): string[] {
        return this.filterFilesType
    }

    urlIsIndexed(docUrl: string): boolean{
        return this.filesIdexedUrls.includes(docUrl)
    }

    isIndexable(type:string): boolean {
        const types:string[] = [
            '.pdf', '.docx', '.epub', '.pptx', '.csv', '.json', '.txt'
        ]
        return types.includes(type)
    }

    formatSize(bytes: number) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(date: string| Date): string {
        if(date instanceof Date) return new Intl.DateTimeFormat(
            'pt-BR', 
            { dateStyle:'full', timeStyle:'full', timeZone: 'UTC' } ).format(date) 
        else {
            date = new Date(date)
            return new Intl.DateTimeFormat('pt-BR', {dateStyle:'medium'}).format(date) 
        }
    }

    activateTool(toolName: string): void {
        this.toolsService.activateTool(toolName).subscribe(
            success => {
                this.toastr.success('Updated tool.')
                this.fetchToolActivate()
            },
            error=>{
                this.handleError(error)
                this.fetchToolActivate()
            }
        )
    }

    isAdmin(): boolean {
        return this.auth.getUser()?.role === 'administrator'
    }

    handleError(error: any): void{
        console.log('ERROR =>>>> ', error)
/*         if(error?.code != 'auth' && error?.code != 'email'){
            this.toastr.warning('Please contact support.')
        } */
    }

    fetchToolActivate(): void {
        this.toolsService.getActivateTool().subscribe(
            success => {
                this.activatedTools = success
            }, 
            error => {
                this.handleError(error)
            })
    }

    getToolDeactivated(): string []{
        return this.activatedTools.map((t:any)=>{return t.toolName})
    }

    getUrlPayment(inputCredits:any): string {
        let paymentUrl
        switch (parseInt(inputCredits)) {
            case 5:
                paymentUrl = `${this.domainUrl}/?add-to-cart=${32932}`
                break;
            case 10:
                paymentUrl = `${this.domainUrl}/?add-to-cart=${32933}`
                break;    
            case 50:
                paymentUrl = `${this.domainUrl}/?add-to-cart=${32935}`
                break;
            case 100:
                paymentUrl = `${this.domainUrl}/?add-to-cart=${32936}`
                break;                        
            default:
                paymentUrl = `${this.domainUrl}/?add-to-cart=${this.creditProductId}`
                break;
        }
        return paymentUrl
    }

    fetchBalance(): void {
        this.historicService.getBalance().subscribe(
          success => {
            this.balance = parseFloat(success.balance)
          }, 
          error => {
            this.handleError(error)
          }
        )
    }

    fetchProviders(): void {
        this.userApiService.getProviders().subscribe(
          success => {
            this.providers = success
          }, 
          error => {
            this.handleError(error)
          }
        )
    }

    addProvider(): void {
        this.providersSpinner = true
        this.userApiService.saveAndUpdate(this.formProvider).subscribe(
          success => {
            this.providersSpinner = false
            this.fetchProviders()
          }, 
          error => {
            this.providersSpinner = false
            if(error.status === 401) this.toastr.error('Invalid key')
            //this.handleError(error)
          }
        )
    }

    removeProvider(providerId:any, i:number): void {
        this.removeProvidersSpinner[i] = true
        this.userApiService.removeProvider(providerId).subscribe(
          success => {
            this.removeProvidersSpinner[i] = false
            this.fetchProviders()
          }, 
          error => {
            this.removeProvidersSpinner[i] = false
            this.handleError(error)
          }
        )
    }
    
    goToPageFiles(page: number): void {
        if (page < 1 || page > this.getTotalPagesFiles()) return
        this.currentPage = page
        this.fetchFiles()
    }

    getTotalPagesFiles(): number {
        return Math.ceil(this.totalItems / this.itemsPerPage)
    }

    getAccount(): { id:any, email:string } {
        const account = { id: this.auth.getUser()?.id, email: this.auth.getUser()?.email }
        return account
    } 
}