import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import env from './env'
import { LanguageService } from './language.service'
import { ModelService } from './llm.service'

@Injectable({
  providedIn: 'root'
})
export class CalcPriceService {
  private iof = 0.0438; // 4,38%
  private taxaCambio = 7; // BRL por USD
  private taxaGatewayPercentual = 0.0399; // 3,99%
  private taxaGatewayFixa = 0.39; // BRL por transação
  private iss = 0.073; // 7,30%
  private comissaoVendedor = 0.25; // 25%
  private margemLucro = 0.60; // 60%

  constructor(){}

  calcularPrecoVenda(credits: any): number {
      // Calcula o custo total inicial em USD
    switch (parseInt(credits)) {
      case 5:
        return 8.76
      case 10:
        return 16.17
      case 50:
        return 74.95
      case 100:
        return 146.49
      default:
        return 8.76
    }
  }
}
  