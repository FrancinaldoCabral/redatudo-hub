import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-select-model',
  templateUrl: './select-model.component.html',
  styleUrls: ['./select-model.component.css']
})
export class SelectModelComponent implements OnInit, OnChanges {
  @Input() selected: string = '';
  @Input() models: any[] = [];

  @Output() modelSelected = new EventEmitter<string>();

  search: string = '';
  filteredModels: any[] = [];

  isOpen: boolean = false

  ngOnInit() {
    this.filteredModels = [...this.models];
  }

  ngOnChanges() {
    console.log('SELECTED: ', this.selected)
    this.filteredModels = [...this.models];
  }

  getModel(modelId:string): any{
    const model = this.models.filter(m=>{return m.id===modelId})[0]
    return model
  }

  setModelInSelect(event: any) {
    this.selected = event
    this.modelSelected.emit(this.selected);     // <-- Continua avisando o pai se quiser algo extra
  }

  resetSelection() {
    this.modelSelected.emit(this.selected);
  }

  focusSelect(): void {
    this.isOpen = true
    console.log(this.isOpen)
  }

  blurSelect(): void {
    this.isOpen = false
    console.log(this.isOpen)
  }

  filterModels() {
    const query = this.search.toLowerCase();
    this.filteredModels = this.models.filter(model =>
      model.name.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query)
    );
  }

  getOpenrouterModelById(id: string) {
    return this.models.find(model => model.id === id);
  }

  calculatePricePerMillionTokens(model: any): string {
    if (!model?.price) return 'N/A';
    return (model.price * 1000000).toFixed(2);
  }

  calculatePricePerThousandWords(model: any): string {
    if (!model?.price) return 'N/A';
    return (model.price * 750).toFixed(2);
  }
}
