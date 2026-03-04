import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { FileUploadService } from '../../services/file-upload.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';

interface ImageResult {
  url: string;
  prompt: string;
  quality: string;
  timestamp: Date;
}

@Component({
  selector: 'app-image-editor',
  templateUrl: './image-editor.component.html',
  styleUrls: ['./image-editor.component.css']
})
export class ImageEditorComponent implements OnInit, OnDestroy {
  // Form data
  form = {
    mode: 'create', // 'create' or 'edit'
    prompt: '',
    quality: 'balanced', // 'basic', 'balanced', 'advanced'
    aspectRatio: '1:1',
    resolution: 'None',
    magicPrompt: 'Auto',
    style: 'None' // Combined style field
  };

  // Image editing
  uploadedImage: File | null = null;
  imagePreview: string = '';
  @ViewChild('maskCanvas', { static: false }) maskCanvas!: ElementRef<HTMLCanvasElement>;
  canvasContext: CanvasRenderingContext2D | null = null;
  isDrawing: boolean = false;
  brushSize: number = 20;
  brushOpacity: number = 0.8;
  canvasScale: { x: number; y: number } = { x: 1, y: 1 };

  // State
  result: ImageResult | null = null;
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;

  // Temporary files for cleanup
  tempFilePaths: string[] = [];

  // Options
  qualities = [
    { value: 'basic', label: 'Básico', credits: 30, description: 'Rápido - Ideogram Turbo' },
    { value: 'balanced', label: 'Balanceado', credits: 60, description: 'Equilibrado - Ideogram Balanced' },
    { value: 'advanced', label: 'Avançado', credits: 90, description: 'Máxima Qualidade - Ideogram Quality' }
  ];

  aspectRatios = [
    { value: '1:3', label: '1:3' },
    { value: '3:1', label: '3:1' },
    { value: '1:2', label: '1:2' },
    { value: '2:1', label: '2:1' },
    { value: '9:16', label: '9:16' },
    { value: '16:9', label: '16:9' },
    { value: '10:16', label: '10:16' },
    { value: '16:10', label: '16:10' },
    { value: '2:3', label: '2:3' },
    { value: '3:2', label: '3:2' },
    { value: '3:4', label: '3:4' },
    { value: '4:3', label: '4:3' },
    { value: '4:5', label: '4:5' },
    { value: '5:4', label: '5:4' },
    { value: '1:1', label: '1:1' }
  ];

  resolutions = [
    { value: 'None', label: 'None' },
    { value: '512x1536', label: '512x1536' },
    { value: '576x1408', label: '576x1408' },
    { value: '576x1472', label: '576x1472' },
    { value: '576x1536', label: '576x1536' },
    { value: '640x1344', label: '640x1344' },
    { value: '640x1408', label: '640x1408' },
    { value: '640x1472', label: '640x1472' },
    { value: '640x1536', label: '640x1536' },
    { value: '704x1152', label: '704x1152' },
    { value: '704x1216', label: '704x1216' },
    { value: '704x1280', label: '704x1280' },
    { value: '704x1344', label: '704x1344' },
    { value: '704x1408', label: '704x1408' },
    { value: '704x1472', label: '704x1472' },
    { value: '736x1312', label: '736x1312' },
    { value: '768x1088', label: '768x1088' },
    { value: '768x1216', label: '768x1216' },
    { value: '768x1280', label: '768x1280' },
    { value: '768x1344', label: '768x1344' },
    { value: '800x1280', label: '800x1280' },
    { value: '832x960', label: '832x960' },
    { value: '832x1024', label: '832x1024' },
    { value: '832x1088', label: '832x1088' },
    { value: '832x1152', label: '832x1152' },
    { value: '832x1216', label: '832x1216' },
    { value: '832x1248', label: '832x1248' },
    { value: '864x1152', label: '864x1152' },
    { value: '896x960', label: '896x960' },
    { value: '896x1024', label: '896x1024' },
    { value: '896x1088', label: '896x1088' },
    { value: '896x1120', label: '896x1120' },
    { value: '896x1152', label: '896x1152' },
    { value: '960x832', label: '960x832' },
    { value: '960x896', label: '960x896' },
    { value: '960x1024', label: '960x1024' },
    { value: '960x1088', label: '960x1088' },
    { value: '1024x832', label: '1024x832' },
    { value: '1024x896', label: '1024x896' },
    { value: '1024x960', label: '1024x960' },
    { value: '1024x1024', label: '1024x1024' },
    { value: '1088x768', label: '1088x768' },
    { value: '1088x832', label: '1088x832' },
    { value: '1088x896', label: '1088x896' },
    { value: '1088x960', label: '1088x960' },
    { value: '1120x896', label: '1120x896' },
    { value: '1152x704', label: '1152x704' },
    { value: '1152x832', label: '1152x832' },
    { value: '1152x864', label: '1152x864' },
    { value: '1152x896', label: '1152x896' },
    { value: '1216x704', label: '1216x704' },
    { value: '1216x768', label: '1216x768' },
    { value: '1216x832', label: '1216x832' },
    { value: '1248x832', label: '1248x832' },
    { value: '1280x704', label: '1280x704' },
    { value: '1280x768', label: '1280x768' },
    { value: '1280x800', label: '1280x800' },
    { value: '1312x736', label: '1312x736' },
    { value: '1344x640', label: '1344x640' },
    { value: '1344x704', label: '1344x704' },
    { value: '1344x768', label: '1344x768' },
    { value: '1408x576', label: '1408x576' },
    { value: '1408x640', label: '1408x640' },
    { value: '1408x704', label: '1408x704' },
    { value: '1472x576', label: '1472x576' },
    { value: '1472x640', label: '1472x640' },
    { value: '1472x704', label: '1472x704' },
    { value: '1536x512', label: '1536x512' },
    { value: '1536x576', label: '1536x576' },
    { value: '1536x640', label: '1536x640' }
  ];

  magicPromptOptions = [
    { value: 'Off', label: 'Desligado' },
    { value: 'Auto', label: 'Automático' },
    { value: 'On', label: 'Ligado' }
  ];

  // Combined styles (presets + types)
  styles = [
    { value: 'None', label: 'None', type: 'None' },
    { value: 'Auto', label: 'Auto', type: 'Auto' },
    { value: 'General', label: 'General', type: 'General' },
    { value: 'Realistic', label: 'Realistic', type: 'Realistic' },
    { value: 'Design', label: 'Design', type: 'Design' },
    { value: '80s Illustration', label: '80s Illustration', type: 'Auto' },
    { value: '90s Nostalgia', label: '90s Nostalgia', type: 'Auto' },
    { value: 'Abstract Organic', label: 'Abstract Organic', type: 'Auto' },
    { value: 'Analog Nostalgia', label: 'Analog Nostalgia', type: 'Auto' },
    { value: 'Art Brut', label: 'Art Brut', type: 'Auto' },
    { value: 'Art Deco', label: 'Art Deco', type: 'Auto' },
    { value: 'Art Poster', label: 'Art Poster', type: 'Auto' },
    { value: 'Aura', label: 'Aura', type: 'Auto' },
    { value: 'Avant Garde', label: 'Avant Garde', type: 'Auto' },
    { value: 'Bauhaus', label: 'Bauhaus', type: 'Auto' },
    { value: 'Blueprint', label: 'Blueprint', type: 'Auto' },
    { value: 'Blurry Motion', label: 'Blurry Motion', type: 'Auto' },
    { value: 'Bright Art', label: 'Bright Art', type: 'Auto' },
    { value: 'C4D Cartoon', label: 'C4D Cartoon', type: 'Auto' },
    { value: "Children's Book", label: "Children's Book", type: 'Auto' },
    { value: 'Collage', label: 'Collage', type: 'Auto' },
    { value: 'Coloring Book I', label: 'Coloring Book I', type: 'Auto' },
    { value: 'Coloring Book II', label: 'Coloring Book II', type: 'Auto' },
    { value: 'Cubism', label: 'Cubism', type: 'Auto' },
    { value: 'Dark Aura', label: 'Dark Aura', type: 'Auto' },
    { value: 'Doodle', label: 'Doodle', type: 'Auto' },
    { value: 'Double Exposure', label: 'Double Exposure', type: 'Auto' },
    { value: 'Dramatic Cinema', label: 'Dramatic Cinema', type: 'Auto' },
    { value: 'Editorial', label: 'Editorial', type: 'Auto' },
    { value: 'Emotional Minimal', label: 'Emotional Minimal', type: 'Auto' },
    { value: 'Ethereal Party', label: 'Ethereal Party', type: 'Auto' },
    { value: 'Expired Film', label: 'Expired Film', type: 'Auto' },
    { value: 'Flat Art', label: 'Flat Art', type: 'Auto' },
    { value: 'Flat Vector', label: 'Flat Vector', type: 'Auto' },
    { value: 'Forest Reverie', label: 'Forest Reverie', type: 'Auto' },
    { value: 'Geo Minimalist', label: 'Geo Minimalist', type: 'Auto' },
    { value: 'Glass Prism', label: 'Glass Prism', type: 'Auto' },
    { value: 'Golden Hour', label: 'Golden Hour', type: 'Auto' },
    { value: 'Graffiti I', label: 'Graffiti I', type: 'Auto' },
    { value: 'Graffiti II', label: 'Graffiti II', type: 'Auto' },
    { value: 'Halftone Print', label: 'Halftone Print', type: 'Auto' },
    { value: 'High Contrast', label: 'High Contrast', type: 'Auto' },
    { value: 'Hippie Era', label: 'Hippie Era', type: 'Auto' },
    { value: 'Iconic', label: 'Iconic', type: 'Auto' },
    { value: 'Japandi Fusion', label: 'Japandi Fusion', type: 'Auto' },
    { value: 'Jazzy', label: 'Jazzy', type: 'Auto' },
    { value: 'Long Exposure', label: 'Long Exposure', type: 'Auto' },
    { value: 'Magazine Editorial', label: 'Magazine Editorial', type: 'Auto' },
    { value: 'Minimal Illustration', label: 'Minimal Illustration', type: 'Auto' },
    { value: 'Mixed Media', label: 'Mixed Media', type: 'Auto' },
    { value: 'Monochrome', label: 'Monochrome', type: 'Auto' },
    { value: 'Nightlife', label: 'Nightlife', type: 'Auto' },
    { value: 'Oil Painting', label: 'Oil Painting', type: 'Auto' },
    { value: 'Old Cartoons', label: 'Old Cartoons', type: 'Auto' },
    { value: 'Paint Gesture', label: 'Paint Gesture', type: 'Auto' },
    { value: 'Pop Art', label: 'Pop Art', type: 'Auto' },
    { value: 'Retro Etching', label: 'Retro Etching', type: 'Auto' },
    { value: 'Riviera Pop', label: 'Riviera Pop', type: 'Auto' },
    { value: 'Spotlight 80s', label: 'Spotlight 80s', type: 'Auto' },
    { value: 'Stylized Red', label: 'Stylized Red', type: 'Auto' },
    { value: 'Surreal Collage', label: 'Surreal Collage', type: 'Auto' },
    { value: 'Travel Poster', label: 'Travel Poster', type: 'Auto' },
    { value: 'Vintage Geo', label: 'Vintage Geo', type: 'Auto' },
    { value: 'Vintage Poster', label: 'Vintage Poster', type: 'Auto' },
    { value: 'Watercolor', label: 'Watercolor', type: 'Auto' },
    { value: 'Weird', label: 'Weird', type: 'Auto' },
    { value: 'Woodblock Print', label: 'Woodblock Print', type: 'Auto' }
  ];

  private authSubscription?: Subscription;

  constructor(
    private router: Router,
    private socketService: SocketService,
    private historicService: HistoricService,
    private toastr: ToastrService,
    private authService: AuthService,
    private fileUploadService: FileUploadService,
    private favoritesService: FavoritesService,
    private analyticsService: AnalyticsService
  ) {
    // Configurar headers de autenticação para uploads
    this.fileUploadService = fileUploadService;
  }

  ngOnInit(): void {
    if (this.authService.getAuthenticate()) {
      this.fetchBalance();
    }

    this.authSubscription = this.authService.getAuthenticateAsObservable().subscribe(
      authenticated => {
        if (authenticated) {
          this.fetchBalance();
        }
      }
    );

    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.url) {
          this.handleSuccess(response.result.result);
        } else if (response.status.toLowerCase() === 'error' || response.status.toLowerCase() === 'failed') {
          this.handleError(response.result);
        }
      },
      error => {
        this.handleError(error);
      }
    );

    this.analyticsService.trackToolUsed('image-editor');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  fetchBalance(): void {
    this.historicService.getBalance().subscribe(
      success => {
        this.balance = parseFloat(success.balance);
        this.showCreditWarning = this.balance < this.getCreditCost();
      },
      error => {
        console.log(error);
      }
    );
  }

  getCreditCost(): number {
    const quality = this.qualities.find(q => q.value === this.form.quality);
    return quality ? quality.credits : 60;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.uploadedImage = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
        this.initializeCanvas();
      };
      reader.readAsDataURL(file);
    } else {
      this.toastr.error('Por favor, selecione um arquivo de imagem válido');
    }
  }

  initializeCanvas(): void {
    setTimeout(() => {
      if (this.maskCanvas) {
        const canvas = this.maskCanvas.nativeElement;
        this.canvasContext = canvas.getContext('2d');

        if (this.canvasContext) {
          // Set canvas size to match image
          const img = new Image();
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            // Calculate scale factors based on displayed size vs actual size
            const displayedWidth = canvas.offsetWidth;
            const displayedHeight = canvas.offsetHeight;
            this.canvasScale.x = img.width / displayedWidth;
            this.canvasScale.y = img.height / displayedHeight;

            // Fill with white (preserve)
            this.canvasContext!.fillStyle = 'white';
            this.canvasContext!.fillRect(0, 0, canvas.width, canvas.height);
          };
          img.src = this.imagePreview;
        }
      }
    });
  }

  startDrawing(event: MouseEvent): void {
    this.isDrawing = true;
    this.draw(event);
  }

  draw(event: MouseEvent): void {
    if (!this.isDrawing || !this.canvasContext) return;

    const canvas = this.maskCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * this.canvasScale.x;
    const y = (event.clientY - rect.top) * this.canvasScale.y;

    this.canvasContext.globalCompositeOperation = 'source-over';
    this.canvasContext.globalAlpha = this.brushOpacity;
    this.canvasContext.fillStyle = 'black'; // Modify area
    this.canvasContext.beginPath();
    this.canvasContext.arc(x, y, (this.brushSize / 2) * this.canvasScale.x, 0, Math.PI * 2);
    this.canvasContext.fill();
  }

  stopDrawing(): void {
    this.isDrawing = false;
  }

  clearMask(): void {
    if (this.canvasContext) {
      const canvas = this.maskCanvas.nativeElement;
      this.canvasContext.fillStyle = 'white';
      this.canvasContext.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  getMaskDataURL(): string {
    if (this.maskCanvas) {
      return this.maskCanvas.nativeElement.toDataURL('image/png');
    }
    return '';
  }

  generateImage(): void {
    if (!this.form.prompt.trim()) {
      this.toastr.error('Por favor, insira um prompt para a geração');
      return;
    }

    if (this.form.mode === 'edit' && !this.uploadedImage) {
      this.toastr.error('Por favor, faça upload de uma imagem para editar');
      return;
    }

    const creditCost = this.getCreditCost();
    if (this.balance < creditCost) {
      this.toastr.error(`Créditos insuficientes. Esta operação custa ${creditCost} crédito(s)`);
      return;
    }

    this.isLoading = true;
    this.result = null;

    // Para modo de edição, fazer upload da imagem primeiro
    if (this.form.mode === 'edit' && this.uploadedImage) {
      this.uploadImageAndGenerate();
    } else {
      // Modo criação - enviar diretamente
      this.sendGenerationRequest(this.buildRequestData());
    }
  }

  private uploadImageAndGenerate(): void {
    if (!this.uploadedImage) return;

    // Limpar arquivos temporários anteriores
    this.clearTempFiles();

    // Validar tamanho da imagem antes do upload
    const maxSizeInMB = 10; // 10MB máximo
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (this.uploadedImage.size > maxSizeInBytes) {
      this.isLoading = false;
      this.toastr.error(`Imagem muito grande. Máximo permitido: ${maxSizeInMB}MB`);
      return;
    }

    this.fileUploadService.uploadFile(this.uploadedImage).subscribe(
      (uploadResponse) => {
        // Armazenar path do arquivo temporário para limpeza posterior
        if (uploadResponse.pathName) {
          this.tempFilePaths.push(uploadResponse.pathName);
        }

        // Fazer upload da máscara também
        this.uploadMaskAndGenerate(uploadResponse);
      },
      (error) => {
        this.isLoading = false;
        console.error('Erro no upload da imagem:', error);
        this.toastr.error('Erro ao fazer upload da imagem. Tente novamente.');
        this.clearTempFiles(); // Limpar arquivos temporários em caso de erro
      }
    );
  }

  private uploadMaskAndGenerate(imageUploadResponse: any): void {
    // Converter máscara canvas para blob e fazer upload
    const maskDataURL = this.getMaskDataURL();
    if (!maskDataURL) {
      // Se não há máscara, prosseguir sem ela
      const requestData = this.buildRequestDataWithUrls(imageUploadResponse, null);
      this.validateAndSendRequest(requestData);
      return;
    }

    // Converter dataURL para blob
    fetch(maskDataURL)
      .then(res => res.blob())
      .then(maskBlob => {
        const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });

        this.fileUploadService.uploadFile(maskFile).subscribe(
          (maskUploadResponse) => {
            // Armazenar path da máscara temporária para limpeza posterior
            if (maskUploadResponse.pathName) {
              this.tempFilePaths.push(maskUploadResponse.pathName);
            }

            // Usar URLs de ambos os uploads
            const requestData = this.buildRequestDataWithUrls(imageUploadResponse, maskUploadResponse);

            // Validar tamanho total do payload antes de enviar
            this.validateAndSendRequest(requestData);
          },
          (error) => {
            this.isLoading = false;
            console.error('Erro no upload da máscara:', error);
            this.toastr.error('Erro ao fazer upload da máscara. Tente novamente.');
            this.clearTempFiles(); // Limpar arquivos temporários em caso de erro
          }
        );
      })
      .catch(error => {
        this.isLoading = false;
        console.error('Erro ao converter máscara:', error);
        this.toastr.error('Erro ao processar máscara. Tente novamente.');
      });
  }

  private validateAndSendRequest(requestData: any): void {
    // Estimar tamanho do payload em caracteres
    const payloadSize = JSON.stringify(requestData).length;
    const maxPayloadSize = 100000; // ~100KB limite aproximado para socket

    if (payloadSize > maxPayloadSize) {
      this.isLoading = false;
      this.toastr.error('Dados muito grandes para processamento. Tente uma imagem menor ou máscara mais simples.');
      return;
    }

    this.sendGenerationRequest(requestData);
  }

  private sendGenerationRequest(requestData: any): void {
    this.socketService.sendMessage([{
      role: 'user',
      content: JSON.stringify(requestData)
    }], 'auto', 'image-editor');
  }

  private buildRequestData(): any {
    // Determine style_type and style_preset based on selected style
    const selectedStyle = this.styles.find(s => s.value === this.form.style);
    const styleType = selectedStyle?.type || 'None';
    const stylePreset = (styleType === 'Auto' || styleType === 'General') && this.form.style !== 'Auto' && this.form.style !== 'General'
      ? this.form.style
      : 'None';

    const baseData = {
      prompt: this.form.prompt,
      quality: this.form.quality,
      aspect_ratio: this.form.aspectRatio,
      resolution: this.form.resolution,
      magic_prompt_option: this.form.magicPrompt,
      style_type: styleType,
      style_preset: stylePreset
    };

    if (this.form.mode === 'edit' && this.uploadedImage) {
      return {
        ...baseData,
        mode: 'edit',
        image: this.imagePreview, // In real implementation, upload the file first
        mask: this.getMaskDataURL()
      };
    }

    return {
      ...baseData,
      mode: 'create'
    };
  }

  private buildRequestDataWithUrls(imageUploadResponse: any, maskUploadResponse: any): any {
    // Determine style_type and style_preset based on selected style
    const selectedStyle = this.styles.find(s => s.value === this.form.style);
    const styleType = selectedStyle?.type || 'None';
    const stylePreset = (styleType === 'Auto' || styleType === 'General') && this.form.style !== 'Auto' && this.form.style !== 'General'
      ? this.form.style
      : 'None';

    const baseData = {
      prompt: this.form.prompt,
      quality: this.form.quality,
      aspect_ratio: this.form.aspectRatio,
      resolution: this.form.resolution,
      magic_prompt_option: this.form.magicPrompt,
      style_type: styleType,
      style_preset: stylePreset
    };

    // Para edição, usar URLs dos uploads em vez de base64
    const editData: any = {
      ...baseData,
      mode: 'edit',
      image_url: imageUploadResponse.publicLink || imageUploadResponse.url // URL da imagem carregada
    };

    // Adicionar URL da máscara se foi feito upload
    if (maskUploadResponse) {
      editData.mask_url = maskUploadResponse.publicLink || maskUploadResponse.url;
    }

    return editData;
  }

  private handleSuccess(result: any): void {
    // Limpar arquivos temporários após processamento bem-sucedido
    this.clearTempFiles();

    this.isLoading = false;
    if (result.content.url) {
      this.result = {
        url: result.content.url,
        prompt: this.form.prompt,
        quality: this.form.quality,
        timestamp: new Date()
      };

      this.toastr.success('Imagem gerada com sucesso!');
    } else {
      this.toastr.error('Formato de resposta inesperado');
    }
  }

  private handleError(error: any): void {
    // Limpar arquivos temporários após erro
    this.clearTempFiles();

    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao gerar imagem. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
    }

    this.toastr.error(errorMessage);
  }

  private clearTempFiles(): void {
    if (this.tempFilePaths.length === 0) return;

    console.log('Limpando arquivos temporários:', this.tempFilePaths);

    // Remover cada arquivo temporário
    this.tempFilePaths.forEach(pathName => {
      this.fileUploadService.deleteFiles(pathName).subscribe(
        () => {
          console.log('Arquivo temporário removido:', pathName);
        },
        (error) => {
          console.error('Erro ao remover arquivo temporário:', pathName, error);
        }
      );
    });

    // Limpar array após tentar remover
    this.tempFilePaths = [];
  }

  downloadImage(): void {
    if (this.result) {
      const link = document.createElement('a');
      link.href = this.result.url;
      link.target = '_blank'
      link.download = `ideogram-${Date.now()}.png`;
      link.click();
    }
  }

  copyImageUrl(): void {
    if (this.result) {
      navigator.clipboard.writeText(this.result.url).then(() => {
        this.toastr.success('URL da imagem copiada!');
      });
    }
  }

  canGenerate(): boolean {
    if (this.form.mode === 'create') {
      return this.form.prompt.trim().length > 0 && this.balance >= this.getCreditCost();
    } else {
      return this.form.prompt.trim().length > 0 &&
             this.uploadedImage !== null &&
             this.balance >= this.getCreditCost();
    }
  }

  onPromptChange(): void {
    this.showCreditWarning = this.balance < this.getCreditCost();
  }

  getCurrentQuality(): any {
    return this.qualities.find(q => q.value === this.form.quality);
  }

  getQualityIcon(value: string): string {
    const icons: { [key: string]: string } = {
      'basic': '⚡',
      'balanced': '⭐',
      'advanced': '💎'
    };
    return icons[value] || '⭐';
  }

  goBackToHub(): void {
    this.router.navigate(['/']);
  }

  rechargeCredits(): void {
    this.toastr.info('Redirecionando para recarga de créditos...');
    setTimeout(() => {
      this.router.navigate(['/credits']);
    }, 1000);
  }

  upgradePlan(): void {
    this.toastr.info('Redirecionando para planos...');
    setTimeout(() => {
      this.router.navigate(['/upgrade']);
    }, 1000);
  }
}
