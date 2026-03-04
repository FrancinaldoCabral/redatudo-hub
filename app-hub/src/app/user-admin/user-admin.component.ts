import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core'
import { HistoricService } from '../services/historic.service'
import { AuthService } from '../services/auth.service'
import * as moment from 'moment'
import { ToastrService } from 'ngx-toastr'

@Component({
  selector: 'app-user-admin',
  templateUrl: './user-admin.component.html',
  styleUrls: ['./user-admin.component.css']
})
export class UserAdminComponent implements OnInit, OnChanges {
  @Input() itemsPerPage: number = 10
  public currentPage = 1
  public totalItems = 0
  public historicData: any[] = []
  balance: number = 0
  userId: string = ''
  userEmail: string = ''
  creditDescription: string = ''
  spinner: boolean = false

  constructor(
    private historicService: HistoricService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {

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
    this.spinner = true
    const offset = (this.currentPage - 1) * this.itemsPerPage
    this.historicService.getHistoric(offset, this.itemsPerPage).subscribe(
      success => {
        this.historicData = success.result
        this.totalItems = success.count
        this.spinner = false
        this.fetchBalance()
      }, 
      error => {
        console.log(error)
        this.spinner = false
      }
    )
  }

  fetchBalance(): void {
    this.spinner = true
    this.historicService.getBalance().subscribe(
      success => {
        this.balance = parseFloat(success.balance)
        this.spinner = false
      }, 
      error => {
        console.log(error)
        this.spinner = false
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

  fetchUserByEmail(email:string): void {
    this.spinner = true
    this.historicService.getUserByEmail(email).subscribe(
      successUser => {
        this.spinner = false
        this.userId = successUser.id
        this.userEmail = successUser.email
        this.historicService.getUserBalance(successUser.id).subscribe(
          successBalance => {
            this.balance = parseFloat(successBalance.balance)
            const offset = (this.currentPage - 1) * this.itemsPerPage
            this.historicService.getUserHistoric(successUser.id, offset, this.itemsPerPage).subscribe(
              successHistoric => {
                this.historicData = successHistoric.result
                this.totalItems = successHistoric.count
              },
              error => { 
                this.spinner = false
                this.toastr.error('Historic error.') 
              }
            )
          },
          error => { 
            this.spinner = false
            this.toastr.error('Balance error.') 
          }
        )
      }, error => {
        this.spinner = false
        this.toastr.error('Balance error.') 
        console.log(error)
      }
    )
  }

  setBalance(id: string, balance:any, description:string): void {
    this.spinner = true
    this.historicService.setUserBalance(id, balance, description).subscribe(
      success => {
        this.spinner = false
        this.toastr.success('Balance updated. Ok!')
        this.fetchUserByEmail(this.userEmail)
      },
      error => {
        this.spinner = false
        this.toastr.error('Balance not updated. Error.')
        this.fetchUserByEmail(this.userEmail)
      },
      ()=>{
        this.spinner = false
      }
    )
  }

}
