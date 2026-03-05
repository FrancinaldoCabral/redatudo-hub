import { Injectable } from '@angular/core'
import { io, Socket } from 'socket.io-client'
import { Observable, Subject } from 'rxjs'
import env from './env'
import { AuthService } from './auth.service'
import { ToastrService } from 'ngx-toastr'
import { LanguageService } from './language.service'
import { ModelService } from './llm.service'
import { BalanceService } from './balance.service'
import * as moment from 'moment'


@Injectable({
  providedIn: 'root'
})
export class SocketService {

  socket!: Socket
  
  private resultSource = new Subject<any>()
  getResultSource$ = this.resultSource.asObservable()

  private connectSource = new Subject<any>()
  getConnecSource$ = this.connectSource.asObservable()

  socketIsConnect: boolean = false

  constructor(
    private auth: AuthService,
    private toastr: ToastrService, 
    private languageService: LanguageService,
    private modelService: ModelService,
    private balanceService: BalanceService
  ) { 

  }

  sendMessage(messages: any[], model:string, app:string): void{
    if(this.socketIsConnect) {
      const payload = {
        language: this.languageService.getCurrentLanguage(),
        time: moment().format(),
        model: model,
        messages,
        app
      };

      console.log('Enviando mensagem via socket:', payload);

      // Verificar tamanho do payload
      const payloadSize = JSON.stringify(payload).length;
      console.log(`Tamanho do payload: ${payloadSize} caracteres`);

      if (payloadSize > 50000) { // ~50KB limite conservador
        this.toastr.warning('Dados muito grandes. Operação pode falhar.', 'Aviso');
      }

      this.socket.emit('chat', payload);
    }else{
      this.toastr.warning('Conexão perdida. Tentando reconectar...', 'Connection');
      // Tentar reconectar
      this.newChat();
    }
  }

  sendFeedback(feedback:any): void{
    if(this.socketIsConnect) {
      this.socket.emit('feedback', feedback)  
    }else{
      this.toastr.warning('You is disconnect', 'Connection')
    }
  }

  cancelJob(jobId:any): void{
    if(this.socketIsConnect) {
      this.socket.emit('cancel', { jobId })  
    }else{
      this.toastr.warning('You is disconnect', 'Connection')
    }
  }

  setupSocketConnection(): void {
    // Em produção env.apiHost é '' — socket.io deve usar a origem atual (via proxy nginx)
    const socketUrl = env.apiHost || window.location.origin
    this.socket = io(socketUrl, {
      transports: ['websocket'], // forçar websocket; evita erros 400 de polling via proxy
      auth: {
        token: this.auth.getToken()
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 15000,
      timeout: 20000
    })

    this.socket.on('connect', ()=>{ 
      console.log('socket id: ', this.socket?.id) 
      this.socketIsConnect = true
      this.connectSource.next(true)
      //this.toastr.success('You is connected', 'Connection')
    })
    this.socket.on('disconnect', ()=>{ 
      console.log('socket id: ', this.socket?.id) 
      this.socketIsConnect = false
      //this.toastr.warning('You is disconnect', 'Connection')
    })


    this.socket.on('results', (result)=>{
      console.log(result)
      
      // Atualizar saldo automaticamente quando recebe resultado completed
      if (result?.status?.toLowerCase() === 'completed') {
        this.balanceService.refreshBalance();
      }
      this.resultSource.next(result)
    })

    this.socket.on("connect_error", (err:any) => {
      // the reason of the error, for example "xhr poll error"
      //console.log(err);
    
      // some additional description, for example the status code of the initial HTTP response
      //console.log(err);
    
      // some additional context, for example the XMLHttpRequest object
      //console.log(err);
    })
  }

  getSocketIsConnect(): boolean {
    return this.socketIsConnect
  }

  newChat(): void {
    this.disconnect()
    this.setupSocketConnection()
  }

  disconnect(): void {
    if (this.socket) {
        this.socket.disconnect()
    }
  }

  getSocket(): Socket | undefined {
    return this.socket
  }  
}
