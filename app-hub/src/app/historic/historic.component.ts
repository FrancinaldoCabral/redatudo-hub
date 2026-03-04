import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core'
import { HistoricService } from '../services/historic.service'
import { PaginationService } from '../services/pagination.service'
import { AuthService } from '../services/auth.service'
import * as moment from 'moment'
import { EmailService } from '../services/email.service'

@Component({
  selector: 'app-historic',
  templateUrl: './historic.component.html',
  styleUrls: ['./historic.component.css']
})
export class HistoricComponent implements OnInit, OnChanges {
  @Input() itemsPerPage: number = 10
  public currentPage = 1
  public totalItems = 0
  public historicData: any[] = []
  balance: number = 0

  waitSpinner: boolean = false
  waitBalanceSpinner: boolean = false

  constructor(
    private historicService: HistoricService,
    private auth: AuthService,
    private emailService: EmailService
  ) { }

  ngOnInit(): void {
    
    this.auth.getAuthenticateAsObservable().subscribe(
      success => { 
          if(success) {
            this.fetchHistoric()
          }
      }
    )

    this.emailService.getConfirmedAsObservable().subscribe(
      success => { 
          if(success) {
            this.fetchHistoric()
          }
      }
    )
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['totalItems'] && changes['itemsPerPage'] && changes['currentPage']) {
      this.totalItems = changes['totalItems'].currentValue
      this.itemsPerPage = changes['itemsPerPage'].currentValue
      this.currentPage = changes['currentPage'].currentValue
    }
  }

  dateFormat(date: Date | string): string {
    return moment(date.toString()).startOf('minute').fromNow()
  }

  fetchHistoric(): void {
    this.waitSpinner = true
    const offset = (this.currentPage - 1) * this.itemsPerPage
    this.historicService.getHistoric(offset, this.itemsPerPage).subscribe(
      success => {
        this.historicData = success.result
        this.totalItems = success.count
        this.waitSpinner = false
        this.fetchBalance()
      }, 
      error => {
        console.log(error)
        this.waitSpinner = false
      }
    )
  }

  fetchBalance(): void {
    this.waitBalanceSpinner = true
    this.historicService.getBalance().subscribe(
      success => {
        this.balance = parseFloat(success.balance)
        this.waitBalanceSpinner = false
      }, 
      error => {
        console.log(error)
        this.waitBalanceSpinner = false
      }
    )
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.getTotalPages()) return
    this.currentPage = page
    this.fetchHistoric()
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage)
  }


}
