import { Component, Input } from '@angular/core';
import { Tool, ToolsService } from '../services/tools.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-tool',
  templateUrl: './tool.component.html',
  styleUrls: ['./tool.component.css']
})
export class ToolComponent {
  tool: Tool = {
    title:'', 
    description:'', 
    schema: {},
    icon: '',
    toolsNames:[]
  }
  id: string = ''
  tools: Tool[] = []
  waitSpinner: boolean = false

  constructor(
    private toolsService: ToolsService,
    private toastr: ToastrService){}

  fetchToolsAndAgents(): void {
    this.waitSpinner = true
    this.toolsService.getTools().subscribe(
        success => { this.tools = success },
        error => {
          console.log(error)
          this.toastr.error('Houve um erro')
        },
        () => {
          this.waitSpinner = false
        }
    )
  }

}
