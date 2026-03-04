import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-textarea-ai',
  templateUrl: './textarea-ai.component.html',
  styleUrls: ['./textarea-ai.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaAiComponent),
      multi: true
    }
  ]
})
export class TextareaAiComponent implements ControlValueAccessor {
  @Input() placeholder: string = 'Digite seu texto aqui...';
  @Input() maxLength: number = 5000;
  @Input() minLength: number = 0;
  @Input() showCounter: boolean = true;
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() error: string = '';

  @Output() onGenerate = new EventEmitter<void>();
  @Output() onInput = new EventEmitter<string>();

  value: string = '';
  isFocused: boolean = false;

  private onChange = (value: any) => {};
  private onTouched = () => {};

  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onValueChange(value: string): void {
    this.value = value;
    this.onChange(value);
    this.onInput.emit(value);
  }

  onFocus(): void {
    this.isFocused = true;
    this.onTouched();
  }

  onBlur(): void {
    this.isFocused = false;
  }

  handleGenerate(): void {
    if (this.value.trim().length >= this.minLength && !this.loading) {
      this.onGenerate.emit();
    }
  }

  get characterCount(): number {
    return this.value.length;
  }

  get isValid(): boolean {
    return this.value.length >= this.minLength && this.value.length <= this.maxLength;
  }

  get counterText(): string {
    if (!this.showCounter) return '';
    return `${this.characterCount}/${this.maxLength}`;
  }

  get counterClass(): string {
    if (this.characterCount > this.maxLength * 0.9) return 'warning';
    if (this.characterCount > this.maxLength) return 'error';
    return 'normal';
  }
}
