import { Injectable } from '@angular/core';
import env from './env';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    _rdtd_uid?: number;
    _rdtd_email?: string;
  }
}

/** Tracking endpoint — usa apiHost do env (nginx proxy em produção) */
const TRACK_ENDPOINT = `${env.apiHost}/track`;

/**
 * visitor_id: lido de ?_rdtd_vid (passado pelo WordPress via CTA)
 * ou do localStorage (persistido entre sessões).
 * Conecta: post lido no WordPress → app aberto → compra = mesma pessoa.
 */
function resolveVisitorId(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('_rdtd_vid');
  const stored  = localStorage.getItem('_rdtd_vid');
  const vid     = fromUrl || stored ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now());
  localStorage.setItem('_rdtd_vid', vid);
  // Remove da URL sem reload para não sujar o history
  if (fromUrl) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('_rdtd_vid');
      window.history.replaceState({}, '', url.toString());
    } catch (_) {}
  }
  return vid;
}

const VISITOR_ID = resolveVisitorId();

export interface AnalyticsEvent {
  event: string;
  tool: string;
  metadata?: any;
  timestamp: Date;
  sessionId: string;
  userAgent: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private sessionId: string;
  private storageKey = 'redatudo_analytics';
  private maxStoredEvents = 1000;
  private ga4MeasurementId = '';

  constructor() {
    this.sessionId = this.generateSessionId();
    this.ga4MeasurementId = this.resolveGa4MeasurementId();
    this.initializeGa4();
  }

  /**
   * Identifica o usuário para GA4 e n8n (chamar após login JWT)
   */
  identifyUser(wpUserId: number, email: string): void {
    window._rdtd_uid = wpUserId;
    window._rdtd_email = email;
    if (window.gtag && this.hasValidMeasurementId()) {
      window.gtag('config', this.ga4MeasurementId, { user_id: String(wpUserId) });
      window.gtag('set', 'user_properties', { wp_user_id: String(wpUserId) });
    }
    this.sendToN8n({
      event: 'user_identified',
      wp_user_id: wpUserId,
      email,
      source: 'hub',
      timestamp: new Date().toISOString(),
      properties: {},
    });
  }

  /**
   * Track de page_view para navegações SPA
   */
  trackPageView(path?: string): void {
    const pagePath = path || window.location.pathname + window.location.search;
    const payload = {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title
    };

    this.pushToDataLayer({ event: 'page_view', ...payload });
    this.sendGa4Event('page_view', payload);
  }

  /**
   * Track quando uma ferramenta é usada
   */
  trackToolUsed(toolName: string, metadata?: any): void {
    this.trackEvent('tool_used', toolName, metadata);
  }

  /**
   * Track quando um resultado é copiado
   */
  trackResultCopied(toolName: string, position: number, metadata?: any): void {
    this.trackEvent('result_copied', toolName, {
      position,
      ...metadata
    });
  }

  /**
   * Track quando um item é adicionado aos favoritos
   */
  trackFavoriteAdded(toolName: string, metadata?: any): void {
    this.trackEvent('favorite_added', toolName, metadata);
  }

  /**
   * Track quando um item é removido dos favoritos
   */
  trackFavoriteRemoved(toolName: string, metadata?: any): void {
    this.trackEvent('favorite_removed', toolName, metadata);
  }

  /**
   * Track quando limite gratuito é atingido
   */
  trackLimitReached(toolName: string, metadata?: any): void {
    this.trackEvent('limit_reached', toolName, metadata);
  }

  /**
   * Track quando prompt de upgrade é mostrado
   */
  trackUpgradePromptShown(source: string, toolName?: string): void {
    this.trackEvent('upgrade_prompt_shown', toolName || 'general', {
      source
    });
  }

  /**
   * Track quando usuário clica em upgrade
   */
  trackUpgradeClicked(source: string, toolName?: string): void {
    this.trackEvent('upgrade_clicked', toolName || 'general', {
      source
    });
  }

  /**
   * Track quando usuário gera novos resultados
   */
  trackRegeneration(toolName: string, metadata?: any): void {
    this.trackEvent('regeneration', toolName, metadata);
  }

  /**
   * Track quando usuário compartilha resultado
   */
  trackShare(toolName: string, platform: string, metadata?: any): void {
    this.trackEvent('share', toolName, {
      platform,
      ...metadata
    });
  }

  /**
   * Track tempo gasto em uma ferramenta
   */
  trackTimeSpent(toolName: string, seconds: number, metadata?: any): void {
    this.trackEvent('time_spent', toolName, {
      seconds,
      ...metadata
    });
  }

  /**
   * Track erros ocorridos
   */
  trackError(toolName: string, error: string, metadata?: any): void {
    this.trackEvent('error', toolName, {
      error,
      ...metadata
    });
  }

  /**
   * Obtém estatísticas locais de uso
   */
  getLocalStats(): {
    totalEvents: number;
    eventsByTool: { [tool: string]: number };
    eventsByType: { [event: string]: number };
    recentActivity: AnalyticsEvent[];
  } {
    const events = this.getStoredEvents();
    const eventsByTool = events.reduce((acc, event) => {
      acc[event.tool] = (acc[event.tool] || 0) + 1;
      return acc;
    }, {} as { [tool: string]: number });

    const eventsByType = events.reduce((acc, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1;
      return acc;
    }, {} as { [event: string]: number });

    // Eventos recentes (últimas 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = events
      .filter(event => event.timestamp >= oneDayAgo)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);

    return {
      totalEvents: events.length,
      eventsByTool,
      eventsByType,
      recentActivity
    };
  }

  /**
   * Obtém ferramentas mais usadas
   */
  getMostUsedTools(limit: number = 10): { tool: string; count: number }[] {
    const stats = this.getLocalStats();
    return Object.entries(stats.eventsByTool)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Obtém tipos de evento mais comuns
   */
  getEventTypesStats(): { event: string; count: number }[] {
    const stats = this.getLocalStats();
    return Object.entries(stats.eventsByType)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Limpa dados locais de analytics
   */
  clearLocalData(): void {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Exporta dados de analytics como JSON
   */
  exportAnalyticsData(): string {
    const events = this.getStoredEvents();
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      totalEvents: events.length,
      events: events
    }, null, 2);
  }

  /**
   * Método privado para trackear eventos
   */
  private trackEvent(event: string, tool: string, metadata?: any): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      tool,
      metadata,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.storeEvent(analyticsEvent);

    const normalizedMetadata = this.normalizeMetadata(metadata);
    const ga4Payload = {
      tool,
      session_id: this.sessionId,
      ...normalizedMetadata
    };

    this.pushToDataLayer({ event, ...ga4Payload });
    this.sendGa4Event(event, ga4Payload);

    // Fan-out to n8n for Mautic/WhatsApp automation
    this.sendToN8n({
      event,
      wp_user_id: window._rdtd_uid,
      email: window._rdtd_email,
      source: 'hub',
      timestamp: analyticsEvent.timestamp.toISOString(),
      properties: { tool, ...normalizedMetadata },
    });

    // Log para debug (remover em produção)
    console.log('Analytics:', analyticsEvent);
  }

  /** Fire-and-forget POST para o tracking endpoint */
  private sendToN8n(payload: object): void {
    // Injeta visitor_id em todos os eventos para conectar com sessões do WordPress
    const enriched = Object.assign({ visitor_id: VISITOR_ID }, payload);
    fetch(TRACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enriched),
    }).catch(() => { /* intentionally silent */ });
  }

  /**
   * Inicializa GA4 via gtag quando um measurement ID válido estiver definido.
   */
  private initializeGa4(): void {
    if (!this.hasValidMeasurementId()) {
      return;
    }

    window.dataLayer = window.dataLayer || [];

    if (window.gtag) {
      window.gtag('config', this.ga4MeasurementId, { send_page_view: false });
      return;
    }

    const scriptId = 'ga4-gtag-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.ga4MeasurementId}`;
      document.head.appendChild(script);
    }

    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };

    window.gtag('js', new Date());
    window.gtag('config', this.ga4MeasurementId, { send_page_view: false });
  }

  private sendGa4Event(eventName: string, params: Record<string, unknown>): void {
    if (!this.hasValidMeasurementId() || !window.gtag) {
      return;
    }

    window.gtag('event', eventName, params);
  }

  private pushToDataLayer(payload: Record<string, unknown>): void {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  }

  private resolveGa4MeasurementId(): string {
    const metaTag = document.querySelector('meta[name="ga4-measurement-id"]');
    const rawValue = metaTag?.getAttribute('content') || '';
    return rawValue.trim();
  }

  private hasValidMeasurementId(): boolean {
    return /^G-[A-Z0-9]+$/i.test(this.ga4MeasurementId) && this.ga4MeasurementId !== 'G-XXXXXXXXXX';
  }

  private normalizeMetadata(metadata?: any): Record<string, string | number | boolean> {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    return Object.entries(metadata).reduce((acc, [key, value]) => {
      if (['string', 'number', 'boolean'].includes(typeof value)) {
        acc[key] = value as string | number | boolean;
      } else if (value !== null && value !== undefined) {
        acc[key] = JSON.stringify(value);
      }
      return acc;
    }, {} as Record<string, string | number | boolean>);
  }

  /**
   * Armazena evento no localStorage
   */
  private storeEvent(event: AnalyticsEvent): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      let events: AnalyticsEvent[] = [];

      if (stored) {
        events = JSON.parse(stored).map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
      }

      events.push(event);

      // Mantém apenas os eventos mais recentes
      if (events.length > this.maxStoredEvents) {
        events = events.slice(-this.maxStoredEvents);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(events));
    } catch (error) {
      console.error('Erro ao armazenar evento de analytics:', error);
    }
  }

  /**
   * Obtém eventos armazenados
   */
  private getStoredEvents(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored).map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar eventos de analytics:', error);
    }
    return [];
  }

  /**
   * Gera ID único de sessão
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
