import { NgModule } from '@angular/core'
import { EvaluatesIcon } from './evaluates-icon.component'
import { CommonModule } from '@angular/common'
import { GptVersusComponent } from './gpt-versus.component'
import { SpinnerCountComponent, SpinnerLongComponent, SpinnerMiniComponent } from './spinner/spinner.component'

@NgModule({
    declarations: [
      EvaluatesIcon,
      GptVersusComponent, 
      SpinnerLongComponent,
      SpinnerMiniComponent,
      SpinnerCountComponent
    ],
    imports: [
      CommonModule
    ],
    exports: [
      EvaluatesIcon,
      GptVersusComponent,
      SpinnerLongComponent,
      SpinnerMiniComponent,
      SpinnerCountComponent
    ],
    providers: []
  })
  export class UtilModule { }