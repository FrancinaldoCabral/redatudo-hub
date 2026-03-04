import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
/* import { HighlightJsDirective } from 'ngx-highlight-js'; */
import Quill from 'quill'

@Component({
  selector: 'app-prompt-result',
  templateUrl: './prompt-result.component.html',
  styleUrls: ['./prompt-result.component.css']
})
export class PromptResultComponent implements OnInit, OnChanges {
  @Input() inputText: string = ''
  @Input() language: string = 'text'
  copied: boolean = false

  constructor(private toastr: ToastrService){
  }
  ngOnChanges(changes: SimpleChanges): void {
  }

  ngOnInit(): void {
/*     this.editor  = new Quill('#editor-container', {
      modules: {
        syntax: true,
        toolbar: '#toolbar-container'
      },
      placeholder: 'Compose an epic...',
      theme: 'snow'
    }) */
  }

  parseText(text: string): { format: string, content: string }[] {
    const result: { format: string, content: string }[] = [];
    const regex = /```(\w+)((?:[\s\S]*?)(?=```|$))|([\s\S]+?(?=```|$))|```((?:[\s\S]*?)(?=```|$))/g;
  
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1] && match[2]) {
        result.push({ format: match[1], content: match[2].replace('```','') });
      } else if (match[3]) {
        result.push({ format: 'simple', content: match[3].replace('```','') });
      } else {
        result.push({ format: 'code', content: match[4].replace('```','') });
      }
    }
  
    return result;
  }

  detectProgrammingLanguage(code: string): string { 
    const languages = [ { name: 'JavaScript', regex: /console\.log\(/ }, { name: 'Python', regex: /print\(/ }, { name: 'Java', regex: /System\.out\.println\(/ }, { name: 'C#', regex: /Console\.WriteLine\(/ }, { name: 'Ruby', regex: /puts\(/ }, { name: 'PHP', regex: /echo / }, { name: 'Swift', regex: /print\(/ }, { name: 'Kotlin', regex: /println\(/ }, { name: 'C++', regex: /cout << / }, { name: 'Go', regex: /fmt\.Println\(/ }, { name: 'Rust', regex: /println!\(/ }, { name: 'TypeScript', regex: /console\.log\(/ }, { name: 'HTML', regex: /<\w+>/ }, { name: 'CSS', regex: /{\s*\w+:\s*\w+\s*}/ }, { name: 'SQL', regex: /SELECT\s+\*\s+FROM\s+\w+/ }, { name: 'Perl', regex: /print\s+\'/ }, { name: 'Lua', regex: /print\(/ }, { name: 'Scala', regex: /println\(/ }, { name: 'R', regex: /print\(/ }, { name: 'Haskell', regex: /putStrLn\(/ }, { name: 'Objective-C', regex: /NSLog\(/ }, { name: 'Assembly', regex: /mov\s+\w+,\s+\w+/ }, { name: 'Bash', regex: /echo\s+\$[\w_]+/ }, { name: 'PowerShell', regex: /Write-Host\s+\$[\w_]+/ }, { name: 'Dart', regex: /print\(/ }, { name: 'Elixir', regex: /IO\.puts\(/ }, { name: 'F#', regex: /printfn\s+\'/ }, { name: 'Groovy', regex: /println\(/ }, { name: 'Julia', regex: /println\(/ }, { name: 'Objective-C++', regex: /NSLog\(/ }, { name: 'Perl 6', regex: /say\s+\'/ }, { name: 'Prolog', regex: /write\(/ }, { name: 'Racket', regex: /displayln\(/ }, { name: 'Scheme', regex: /display\(/ }, { name: 'Shell', regex: /echo\s+\$[\w_]+/ }, { name: 'Smalltalk', regex: /Transcript\s+show:\s+/ }, { name: 'Tcl', regex: /puts\s+\'/ }, { name: 'Visual Basic', regex: /Debug\.Print\(/ } ]
    for (const language of languages) { 
      if (code.match(language.regex)) { 
        return language.name; 
      } 
    } 
    return 'Unknown'; 
  }

  copiar(): void {
    this.copied = true
    setTimeout(() => {
      const tempTextArea = document.createElement('textarea')
      if(this.inputText) tempTextArea.value = this.inputText
      document.body.appendChild(tempTextArea)

      // Seleciona e copia o texto na área de transferência
      tempTextArea.select()
      document.execCommand('copy')

      // Remove o elemento de área de transferência temporária
      document.body.removeChild(tempTextArea)
      //this.toastr.info('Copied.',undefined,{timeOut:1000})
      this.copied = false
    }, 500);
  }
}
