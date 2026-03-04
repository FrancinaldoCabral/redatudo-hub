import { Component, OnInit } from '@angular/core'
import { AuthService } from './services/auth.service'
import { SocketService } from './services/socket.service'
import { NgxSpinnerService } from 'ngx-spinner'
//declare var hljs: any

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(
    private auth: AuthService, 
    private socketService: SocketService,
    private spinner: NgxSpinnerService
  ){}
  ngOnInit(): void {
    this.fetchUser()
    /* 
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9848635946946970"
     crossorigin="anonymous"></script>

     <ng-adsense [adClient]="'ca-pub-9848635946946970'" [pageLevelAds]="true"></ng-adsense>
    
    */

  }
  
  fetchUser(): void {
    this.spinner.show()
    this.auth.fetchUser()
      .then(success => {
        //this.pubService.insertPub()
        if(success) {
          this.socketService.setupSocketConnection()
          this.spinner.hide()
        }else{
          this.spinner.hide()
        }
      })
      .catch(error=>{
        this.spinner.hide()
        // Não chama auth.login() para evitar o modal legado
        // O modal de upgrade será mostrado no home component
      })
      .finally(()=>{
        this.spinner.hide()
        //this.ngxSpinner.hide('autenticate')
      })
  }
}
