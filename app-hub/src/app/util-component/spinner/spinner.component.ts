import { Component, Input } from "@angular/core";


@Component({
    selector: 'app-spinner-long',
    templateUrl: './spinner.component.html',
    styleUrls: ['./spinner-long.component.css']
})
export class SpinnerLongComponent{
    @Input('spinner') spinner:boolean =false
    @Input('label') label:string =''
    constructor(){}
}

@Component({
    selector: 'app-spinner-mini',
    templateUrl: './spinner.component.html',
    styleUrls: ['./spinner-mini.component.css']
})
export class SpinnerMiniComponent{
    @Input('spinner') spinner:boolean =false
    @Input('label') label:string =''
    constructor(){}
}

@Component({
    selector: 'app-spinner-count',
    templateUrl: './spinner.component.html',
    styleUrls: ['./spinner-count.component.css']
})
export class SpinnerCountComponent{
    @Input('spinner') spinner:boolean =false
    @Input('label') label:string =''
    constructor(){}
}