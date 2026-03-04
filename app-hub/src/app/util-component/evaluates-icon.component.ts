import { Component, DoCheck, Input, OnInit } from '@angular/core'

@Component({
    selector: 'app-evaluate',
    template: `
    <span *ngFor="let bi of arrayOptions; let i=index">
        <span *ngIf="i+1<=evaluated"><i class="{{iconLeft}} m-1"></i></span>
        <span *ngIf="i+1>evaluated"><i class="{{iconRight}} m-1"></i></span>
    </span>
    `,
    styles: []
})
export class EvaluatesIcon implements OnInit, DoCheck {
    
    @Input() max:number = 5
    @Input() iconLeft: string = 'bi bi-star'
    @Input() iconRight: string = 'bi bi-star-fill'
    @Input() evaluated: number = 0
    
    arrayOptions: number[] = []

    constructor(){}

    ngDoCheck(): void {
        //this.arrayOptions = new Array<number>(this.max)
        
    }

    ngOnInit(): void {
        this.arrayOptions = new Array<number>(this.max)
    }

    
}