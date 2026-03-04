import { Injectable } from '@angular/core';

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

  constructor() {
    this.sessionId = this.generateSessionId();
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

    // Log para debug (remover em produção)
    console.log('Analytics:', analyticsEvent);
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
