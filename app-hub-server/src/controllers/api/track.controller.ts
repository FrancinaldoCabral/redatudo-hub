import { Request, Response } from 'express'
import { MongoDbService } from '../../services/mongodb.service'

const db = new MongoDbService()

/**
 * POST /track
 * Recebe eventos de comportamento dos apps (ebook-flow, Hub, WordPress)
 * e insere na collection rdtd_events do MongoDB.
 *
 * Sem auth obrigatória — endpoint write-only de analytics.
 * CORS do servidor já restringe origens não reconhecidas.
 */
export async function trackEventController(req: Request, res: Response): Promise<void> {
    const body = req.body
    if (!body || !body.event) {
        res.status(400).json({ ok: false, error: 'missing_event' })
        return
    }

    const doc = {
        wp_user_id:  body.wp_user_id  ?? null,
        email:       typeof body.email === 'string' ? body.email.toLowerCase().trim() : null,
        name:        body.name        ?? null,
        event:       String(body.event),
        source:      body.source      ?? 'unknown',
        session_id:  body.session_id  ?? null,
        properties:  typeof body.properties === 'object' && body.properties !== null ? body.properties : {},
        ts:          new Date(),
    }

    try {
        await db.add('rdtd_events', doc)
        res.json({ ok: true })
    } catch (err) {
        console.error('[track] MongoDB insert error:', err)
        res.status(500).json({ ok: false, error: 'db_error' })
    }
}
