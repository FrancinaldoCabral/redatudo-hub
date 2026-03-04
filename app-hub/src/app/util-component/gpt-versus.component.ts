import { Component, DoCheck, OnInit } from "@angular/core";

@Component({
    selector:'app-table-gpt-versus',
    template: `
    <table class="table text-center">
    <thead>
        <tr>
            <th><i class="bi bi-gear-wide-connected"></i><br>Model</th>
            <th><i class="bi bi-cpu-fill"></i><br>Reasoning</th>
            <th><i class="bi bi-lightning-charge-fill"></i><br>Speed</th>
            <th><i class="bi bi-chat-square-text-fill"></i><br>Conciseness</th>
            <th><i class="bi bi-hand-index-thumb-fill"></i><br>Use</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>gpt-3.5-turbo</td>
            <td><app-evaluate
                [max]="5"
                [iconLeft]="'bi bi-cpu-fill'"
                [iconRight]="'bi bi-cpu'"
                [evaluated]="3"
                ></app-evaluate></td>
            <td><app-evaluate
                [max]="5"
                [iconLeft]="'bi bi-lightning-charge-fill'"
                [iconRight]="'bi bi-lightning-charge'"
                [evaluated]="5"
                ></app-evaluate></td>
            <td><app-evaluate
                [max]="5"
                [iconLeft]="'bi bi-chat-square-text-fill'"
                [iconRight]="'bi bi-chat-square-text'"
                [evaluated]="2"
                ></app-evaluate></td>
            <td>
            GPT-3.5-Turbo, exclusive for chatgpt Plus users, is a revolution in AI that offers extraordinary performance. Optimized for SPEED. Use it now.
            </td>                                      
        </tr>
        <tr>
            <td>gpt-4</td>
            <td><app-evaluate
                [max]="5"
                [iconLeft]="'bi bi-cpu-fill'"
                [iconRight]="'bi bi-cpu'"
                [evaluated]="5"
                ></app-evaluate></td>
            <td><app-evaluate
                [max]="5"
                [iconLeft]="'bi bi-lightning-charge-fill'"
                [iconRight]="'bi bi-lightning-charge'"
                [evaluated]="2"
                ></app-evaluate></td>
            <td><app-evaluate
                [max]="5"
                [iconLeft]="'bi bi-chat-square-text-fill'"
                [iconRight]="'bi bi-chat-square-text'"
                [evaluated]="4"
                ></app-evaluate></td>
            <td>
            Amazing evolution in artificial intelligence, providing a cutting-edge experience with unparalleled performance and revolutionary results for the most demanding users. Also available for chatgpt PLUS users.
            </td>                                      
        </tr>
    </tbody>
    </table>
    `
})
export class GptVersusComponent implements OnInit, DoCheck{
    
    constructor(){}
    
    ngDoCheck(): void {
        
    }
    ngOnInit(): void {
        
    }
    
}